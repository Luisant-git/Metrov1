// Auth API mirroring the frontend's src/api/auth.js & AuthContext login flow.
// Endpoints: request-otp, verify-otp, admin-login, me.

import { post, get } from './api';

export const auth = {
  // Request OTP (employee code) — returns { isAdmin } for admins or sends OTP
  requestOtp(employeeCode) {
    return post('/auth/request-otp', { body: { employeeCode } });
  },

  // Verify OTP (employee code + OTP) — returns { accessToken, user }
  verifyOtp(employeeCode, otp) {
    return post('/auth/verify-otp', { body: { employeeCode, otp } });
  },

  // Admin Login (identifier + pin) — returns { accessToken, user }
  adminLogin(identifier, pin) {
    return post('/auth/admin-login', { body: { identifier, pin } });
  },

  // Get current user profile (authenticated)
  getProfile() {
    return get('/auth/me');
  },
};
