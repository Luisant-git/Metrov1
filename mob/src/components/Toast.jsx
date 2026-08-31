import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

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
  const bg =
    toast.type === 'error'
      ? colors.red600
      : toast.type === 'info'
      ? colors.slate700
      : colors.green600;

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bg }]}>
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 46,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  text: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
