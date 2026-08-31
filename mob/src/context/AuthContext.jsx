// Auth context for the mobile app. Mirrors the PWA's AuthContext behavior.
// Stores token + user in AsyncStorage (React Native equivalent of localStorage).

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { auth } from '../services/auth';
import { storage } from '../utils/storage';
import { UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const ROLES = {
  ADMIN: 'Admin',
  DIRECTOR: 'Director',
  REGIONAL_MANAGER: 'Regional Manager',
  BRANCH_MANAGER: 'Branch Manager',
  BDM: 'BDM',
  SALES_MANAGER: 'Sales Manager',
};

export const PWA_ROLES = [
  ROLES.REGIONAL_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.BDM,
  ROLES.SALES_MANAGER,
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(true);

  // Restore session on startup
  useEffect(() => {
    (async () => {
      try {
        const savedUser = await storage.getUser();
        const token = await storage.getToken();
        if (savedUser && token) {
          setUser(savedUser);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    })();
  }, []);

  // Handle expired/invalid token globally → force logout back to Login.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(UNAUTHORIZED_EVENT, () => {
      logout();
    });
    return () => sub.remove();
  }, []);

  const persistSession = async (token, userData) => {
    await storage.setToken(token);
    await storage.setUser(userData);
    setUser(userData);
  };

  // Login via OTP: request OTP → verify → { accessToken, user }
  const requestOtp = async (employeeCode) => {
    try {
      return await auth.requestOtp(employeeCode);
    } catch (e) {
      return { error: e.message };
    }
  };

  const verifyOtp = async (employeeCode, otp) => {
    try {
      const result = await auth.verifyOtp(employeeCode, otp);
      if (result?.accessToken && result?.user) {
        const safeUser = { ...result.user };
        delete safeUser.pin;
        await persistSession(result.accessToken, safeUser);
        return { success: true, user: safeUser };
      }
      return { success: false, error: result?.error || 'Invalid OTP' };
    } catch (e) {
      return { success: false, error: e.message || 'Invalid OTP' };
    }
  };

  const adminLogin = async (identifier, pin) => {
    try {
      const data = await auth.adminLogin(identifier, pin);
      if (data?.accessToken && data?.user) {
        const safeUser = { ...data.user };
        delete safeUser.pin;
        await persistSession(data.accessToken, safeUser);
        return { success: true, user: safeUser };
      }
      return { success: false, error: data?.error || 'Admin login failed' };
    } catch (e) {
      return { success: false, error: e.message || 'Invalid Admin credentials' };
    }
  };

  const logout = async () => {
    await storage.clear();
    setUser(null);
  };

  const isPWARole = user && PWA_ROLES.includes(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initializing,
        isAuthenticated: !!user,
        requestOtp,
        verifyOtp,
        adminLogin,
        logout,
        isPWARole,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
