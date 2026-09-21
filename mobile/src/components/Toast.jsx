import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

import { Ionicons } from '@expo/vector-icons';

// Lightweight toast notification mirroring react-toastify behavior in the PWA.
// Shows the most recent message; newer toasts replace older ones.
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const current = useRef({ id: 0 });
  const [state, setState] = useState(null); // { id, message, type }

  const show = useCallback((message, type = 'success') => {
    current.current.id += 1;
    const id = current.current.id;
    setState({ id, message, type });
    clearTimeout(current.current.timer);
    current.current.timer = setTimeout(() => {
      setState((prev) => (prev && prev.id === id ? null : prev));
    }, 3000);
  }, []);

  const api = {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {state ? <ToastView toast={state} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast }) {
  let iconName = 'information-circle';
  let color = colors.slate700;

  if (toast.type === 'error') {
    iconName = 'close-circle';
    color = colors.red600;
  } else if (toast.type === 'success') {
    iconName = 'checkmark-circle';
    color = colors.green600;
  }

  return (
    <Animated.View style={[styles.toast, { borderLeftColor: color }]}>
      <Ionicons name={iconName} size={22} color={color} style={styles.icon} />
      <View style={styles.textWrap}>
        <Text style={styles.text}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  icon: {
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    color: colors.slate800,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
