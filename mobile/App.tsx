/**
 * Metrohomes Mobile — React Native app
 * Entry point wiring up Auth + Toast providers and the navigator.
 *
 * This app is a standalone mobile client for the EXISTING Metrohomes backend.
 * It implements only: (1) Login and (2) Site Visit Registration.
 *
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/components/Toast';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Force hide after a few seconds in case of fatal error preventing hideAsync in AppNavigator
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 3500);

function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <AppNavigator />
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
