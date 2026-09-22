import { get, put } from './api';

export const userApi = {
  getAll: () => get('/users'),
  getById: (id) => get(`/users/${id}`),
  update: (id, data) => put(`/users/${id}`, { body: data }),
  getHierarchy: () => get('/users/hierarchy'),
};
