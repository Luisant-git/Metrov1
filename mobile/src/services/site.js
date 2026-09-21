// Projects ("sites") API mirroring the frontend's src/api/site.js.
// Endpoint: GET /projects (returns projects with embedded plots/sites).

import { get } from './api';

export const site = {
  async getAll(params = {}) {
    const data = await get('/projects', { params });
    // Backend returns the array directly (or wrapped).
    const list = Array.isArray(data) ? data : data?.data || [];
    return list;
  },
};
