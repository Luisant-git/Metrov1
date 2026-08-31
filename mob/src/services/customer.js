// Customer API mirroring the frontend's src/api/customer.js.
// Endpoints: POST /customers, POST /customers/request-otp, POST /customers/verify-otp.

import { get, post } from './api';

export const customer = {
  async registerCustomer(payload) {
    const data = await post('/customers', { body: payload });
    // Backend returns { success, data: customer }
    return data?.data || data;
  },

  async checkDuplicate(mobile, email) {
    return get('/customers/check-duplicate', { params: { mobile, email } });
  },

  async requestOtp(mobile) {
    return post('/customers/request-otp', { body: { mobile } });
  },

  async verifyOtp(mobile, otp) {
    return post('/customers/verify-otp', { body: { mobile, otp } });
  },
};
