// Customer API mirroring the frontend's src/api/customer.js.
// Endpoints: POST /customers, POST /customers/request-otp, POST /customers/verify-otp.

<<<<<<< HEAD
import { get, post, put, del } from './api';
=======
import { get, post } from './api';
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121

export const customer = {
  async registerCustomer(payload) {
    const data = await post('/customers', { body: payload });
    // Backend returns { success, data: customer }
    return data?.data || data;
  },

<<<<<<< HEAD
  async getAll() {
    return get('/customers');
  },

  async getOne(id) {
    return get(`/customers/${id}`);
  },

  async update(id, data) {
    return put(`/customers/${id}`, { body: data });
  },

  async remove(id) {
    return del(`/customers/${id}`);
  },

=======
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
  async checkDuplicate(mobile, email) {
    return get('/customers/check-duplicate', { params: { mobile, email } });
  },

<<<<<<< HEAD
  async findByMobile(mobile) {
    return get('/customers/find-by-mobile', { params: { mobile } });
  },

=======
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
  async requestOtp(mobile) {
    return post('/customers/request-otp', { body: { mobile } });
  },

  async verifyOtp(mobile, otp) {
    return post('/customers/verify-otp', { body: { mobile, otp } });
  },
};
