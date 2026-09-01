import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

const webInputStyles = Platform.OS === 'web'
  ? { outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none', outline: 'none' }
  : null;

// Field with optional leading icon — mirrors the PWA's FormField (icon + label).
// variant: 'default' = standard field (14px label), 'login' = PWA login (11px label)
export function Field({ label, required, error, children, icon, variant = 'default' }) {
  const isLogin = variant === 'login';
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        {icon ? <View style={styles.labelIcon}>{icon}</View> : null}
        <Text style={[styles.label, isLogin ? styles.labelLogin : null]}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      </View>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// variant: 'field' = PWA .input-field (radius 12, gray-200 border, ~46px tall)
//          'login' = PWA login input (radius 6, slate-300 border)
export const AppTextInput = React.forwardRef(function AppTextInput(
  { icon, error, style, hint, variant = 'field', onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View style={[
        styles.focusRing,
        focused && !error && variant === 'login' ? styles.focusRingActive : null,
      ]}>
        <View style={[
          styles.inputRow,
          variant === 'login' ? styles.inputRowLogin : null,
          error ? styles.inputError : null,
          focused && !error
            ? variant === 'login'
              ? [styles.inputRowFocused, styles.inputRowFocusedLogin]
              : styles.inputRowFocusedField
            : null,
        ]}>
          {icon ? <View style={[styles.iconBox, variant === 'login' ? styles.iconBoxLogin : null]}>{icon}</View> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.slate400}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            style={[styles.input, variant === 'login' ? styles.inputLogin : null, icon ? [styles.inputWithIcon, variant === 'login' ? styles.inputLoginWithIcon : null] : null, webInputStyles, style]}
            onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
            onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
            {...props}
          />
        </View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

export const AppTextArea = React.forwardRef(function AppTextArea(
  { error, style, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      multiline
      placeholderTextColor={colors.slate400}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      style={[
        styles.textArea,
        error ? styles.inputError : null,
        focused && !error ? styles.textAreaFocused : null,
        webInputStyles,
        style,
      ]}
      onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
      onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  field: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  labelLogin: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.slate600,
    marginBottom: 6,
  },
  required: {
    color: colors.red500,
  },
  error: {
    fontSize: 12,
    color: colors.red500,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    minHeight: 46,
  },
  inputRowLogin: {
    borderColor: colors.slate300,
    borderRadius: 6,
    minHeight: 44,
  },
  inputRowFocused: {
    borderColor: colors.primary,
  },
  inputRowFocusedLogin: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  inputRowFocusedField: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primarySoft,
  },
  focusRing: {
    borderRadius: 8,
  },
  focusRingActive: {
    backgroundColor: colors.primaryFocusRing,
    padding: 3,
  },
  inputError: {
    borderColor: colors.red500,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate900,
    minHeight: 44,
  },
  inputLogin: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    minHeight: 42,
  },
  inputWithIcon: {
    paddingLeft: 6,
  },
  inputLoginWithIcon: {
    paddingLeft: 10,
  },
  iconBox: {
    paddingLeft: 12,
  },
  iconBoxLogin: {
    paddingLeft: 12,
  },
  textArea: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.slate900,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primarySoft,
  },
  hint: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 4,
  },
});
