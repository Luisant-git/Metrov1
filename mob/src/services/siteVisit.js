// Site Visit API mirroring the frontend's src/api/siteVisit.js.
// Endpoint: POST /site-visits  → { success, data }

import { post } from './api';

export const siteVisit = {
  async create(payload) {
    const data = await post('/site-visits', { body: payload });
    return data?.data || data;
  },
};
