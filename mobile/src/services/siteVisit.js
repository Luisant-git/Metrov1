// Site Visit API mirroring the frontend's src/api/siteVisit.js.
// Endpoint: POST /site-visits  → { success, data }

import { post, get, put } from './api';

export const siteVisit = {
  async getAll() {
    return get('/site-visits');
  },

  async create(payload) {
    const data = await post('/site-visits', { body: payload });
    return data?.data || data;
  },

  async update(id, payload) {
    const data = await put(`/site-visits/${id}`, { body: payload });
    return data?.data || data;
  },
};
