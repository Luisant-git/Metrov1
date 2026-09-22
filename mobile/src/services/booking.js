import { get, post, put } from './api';

export const bookingApi = {
  getAll: () => get('/bookings'),
  getById: (id) => get(`/bookings/${id}`),
  create: (data) => post('/bookings', { body: data }),
  update: (id, data) => put(`/bookings/${id}`, { body: data }),
};
