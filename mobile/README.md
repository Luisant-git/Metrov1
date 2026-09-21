# Metrohomes Mobile (`mob/`)

A separate **React Native** mobile application that talks to the **existing Metrohomes
backend** and database. It implements only two flows for now:

1. **Login** — mirrors the PWA's OTP/Admin-PIN authentication flow.
2. **Site Visit Registration** — a 3-step form that registers a customer (with mobile
   OTP verification) and submits a site visit to the existing backend.

This app is **isolated** from `frontend/` and `backend/` — neither is modified. There is
no new backend; all data goes through the existing NestJS APIs.

## Architecture

```
mob/ React Native  ──►  Existing Backend APIs  ──►  Existing Database
```

Used existing endpoints (identical to the PWA):
- `POST /auth/request-otp` `{ employeeCode }`
- `POST /auth/verify-otp` `{ employeeCode, otp }` → `{ accessToken, user }`
- `POST /auth/admin-login` `{ identifier, pin }` → `{ accessToken, user }`
- `GET /projects` (authenticated) → project list with embedded plots
- `POST /customers/check-duplicate?mobile=&email=`
- `POST /customers/request-otp` `{ mobile }`
- `POST /customers/verify-otp` `{ mobile, otp }`
- `POST /customers` `{ name, email, mobile, address, pinCode, occupation, createdBy }`
- `POST /site-visits` (authenticated) `{ customerId, projectId, siteId?, visitDate, visitTime, persons, pickupLocation, purchaseMode, notes, status, assignedTo, driverName, driverMobile, cabNumber }`

Authentication: the JWT returned on login is stored with
`@react-native-async-storage/async-storage` (the RN equivalent of `localStorage`) and
attached as `Authorization: Bearer <token>` on authenticated requests. Expired/invalid
tokens (HTTP 401) trigger an automatic logout back to the Login screen.

## Configuration

The API base URL is centralized in **`src/config/api.js`** via the exported
`API_BASE_URL` constant, which every service imports.

- Android **emulator** → `http://10.0.2.2:3000`
- Physical **device** → `http://<your-lan-ip>:3000` (your machine's LAN IP)

Edit `src/config/api.js` to point at your running backend.

## Running on Android

> Note: the full `. /android` native project plus `android/` folder are included.
> You need Node, JDK 17+, and Android Studio (SDK + emulator) set up as per the
> React Native environment guide.

```bash
cd mob
npm install            # install dependencies (including the added packages below)
npm start              # start Metro bundler
# in another terminal:
npm run android        # build & launch on a connected emulator/device
```

> If the node_modules installation fails due to limited disk space on the drive where
> `mob/` lives, either free up space or move `mob/node_modules` to a drive with capacity.

## Added dependencies

The CLI template was extended with:

- `@react-native-async-storage/async-storage` — token/user storage (localStorage equivalent)
- `@react-navigation/native` + `@react-navigation/native-stack` — screen navigation
- `react-native-safe-area-context` — safe area handling
- `react-native-screens` — native stack screens

## Structure

```
mob/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.jsx       # User ID → Admin PIN / OTP flow
│   │   └── SiteVisitScreen.jsx   # 3-step site visit registration
│   ├── components/               # FormField, Buttons, RadioGroup, Toast, modals, pickers
│   ├── services/                 # api client + auth/site/customer/siteVisit APIs
│   ├── navigation/AppNavigator.jsx
│   ├── context/AuthContext.jsx
│   ├── utils/storage.js          # AsyncStorage wrapper
│   ├── config/api.js             # API_BASE_URL (single source of truth)
│   └── theme/                    # design tokens mirroring the PWA colors
├── android/                      # native Android project
├── App.tsx                       # providers + navigator entry
└── package.json
```
