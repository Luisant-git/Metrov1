// React Native equivalent of the frontend's localStorage-based auth storage.
// Uses @react-native-async-storage/async-storage instead of browser localStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'authToken';
const USER_KEY = 're_user';

export const storage = {
  async setToken(token) {
    if (!token) return;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async getToken() {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },
  async removeToken() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async setUser(user) {
    if (!user) return;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async getUser() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },
  async removeUser() {
    await AsyncStorage.removeItem(USER_KEY);
  },
  async clear() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },
};
