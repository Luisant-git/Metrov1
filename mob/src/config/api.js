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
import Constants from 'expo-constants';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';

// Candidate hosts to try at runtime (keeps the existing default IP as first choice).
const CANDIDATE_BASES = [
  // Allow overriding via `expo.extra.API_BASE_URL` in app.json / EAS config.
  Constants?.manifest?.extra?.API_BASE_URL,
  // Common emulator/host shortcuts and fallbacks.
  isWeb ? 'http://localhost:3000' : null,
  isAndroid ? 'http://10.228.93.167:3000' : null,
  isAndroid ? 'http://10.0.2.2:3000' : null, // Android emulator (default)
  isAndroid ? 'http://10.0.3.2:3000' : null, // Genymotion
  'http://localhost:3000',
].filter(Boolean);

async function probe(url, timeout = 1200) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
      .then((res) => {
        clearTimeout(timer);
        resolve(res && (res.ok || res.status === 404 || res.status === 200 || res.status === 401));
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

// Resolve the first reachable base URL from candidates. This runs at runtime
// and avoids hard-failing when a device/emulator requires a different host.
export async function resolveApiBaseUrl() {
  // If running on web, prefer localhost immediately.
  if (isWeb) return 'http://localhost:3000';

  for (const base of CANDIDATE_BASES) {
    try {
      // probe a common health endpoint or root
      const health = `${base.replace(/\/$/, '')}/health`;
      const ok = await probe(health).catch(() => false);
      if (ok) return base.replace(/\/$/, '');

      // fallback to root probe
      const rootOk = await probe(base).catch(() => false);
      if (rootOk) return base.replace(/\/$/, '');
    } catch (e) {
      // continue
    }
  }

  // Last resort: return first candidate even if unreachable so errors are visible.
  return CANDIDATE_BASES[0] || 'http://localhost:3000';
}

export default resolveApiBaseUrl;
