// Mobile app environment configuration (single source of truth for the API base URL).
//
// This file is intentionally isolated from the frontend/PWA and backend .env files —
// do NOT modify the existing frontend/backend environment config.
//
// IMPORTANT:
// - On a physical Android device, "localhost" refers to the phone itself. Use your
//   workstation LAN IP (for example http://192.168.1.10:3000).
// - On an Android emulator, use http://10.0.2.2:3000 to reach the host machine.
// - In Expo web mode, use http://localhost:3000.
//
// The backend is a NestJS app listening on PORT (default 3000). The auth / site-visit /
// customer / projects routes are served under the same origin (no /api prefix).

import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';

export const API_BASE_URL = isWeb
  ? 'http://localhost:3000'
  : isAndroid
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export default API_BASE_URL;
