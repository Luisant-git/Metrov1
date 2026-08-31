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
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/components/Toast';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
