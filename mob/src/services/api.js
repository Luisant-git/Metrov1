// API client that mirrors the frontend's fetch helpers.
// - Attaches the JWT Authorization header from AsyncStorage.
// - Parses NestJS error shapes (object message, array of validation messages, etc.)
// - Dispatches an event when the backend returns 401 so the app can logout.

import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';

export const UNAUTHORIZED_EVENT = 'app:unauthorized';

export class ApiError extends Error {
  constructor(message, { status, statusText, validationErrors = [] } = {}) {
    super(message || 'Something went wrong');
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.validationErrors = validationErrors;
  }
}

async function getToken() {
  try {
    return await storage.getToken();
  } catch (e) {
    return null;
  }
}

export async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse(response);
}

async function handleResponse(response) {
  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) throw new ApiError('Request failed', { status: response.status });
    return null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Emit unauthorized so AuthContext can clear the session and send user to Login.
      if (typeof globalThis !== 'undefined') {
        try {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit(UNAUTHORIZED_EVENT, response.status);
        } catch (e) {
          // ignore
        }
      }
    }

    let message = '';
    let validationErrors = [];

    if (typeof data?.message === 'string') {
      message = data.message;
      validationErrors = [data.message];
    } else if (Array.isArray(data?.message)) {
      message = data.message[0] || 'Validation failed';
      validationErrors = data.message;
    } else if (data?.error) {
      message = typeof data.error === 'string' ? data.error : 'Request failed';
    } else if (data?.message) {
      message = data.message;
    } else {
      message = 'Something went wrong';
    }

    throw new ApiError(message, {
      status: response.status,
      statusText: response.statusText,
      validationErrors,
    });
  }

  return data;
}

export const get = (path, opts) => request(path, { ...opts, method: 'GET', ...opts?.body ? {} : {} });
export const post = (path, opts) => request(path, { ...opts, method: 'POST' });
export const put = (path, opts) => request(path, { ...opts, method: 'PUT' });
export const del = (path, opts) => request(path, { ...opts, method: 'DELETE' });
