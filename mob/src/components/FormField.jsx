import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

export function Field({ label, required, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export const AppTextInput = React.forwardRef(function AppTextInput(
  { icon, error, style, hint, ...props },
  ref,
) {
  return (
    <View>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {icon ? <View style={styles.iconBox}>{icon}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.slate400}
          selectionColor={colors.primary}
          style={[styles.input, icon ? styles.inputWithIcon : null, style]}
          {...props}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
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
    borderColor: colors.slate300,
    borderRadius: 6,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.red500,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate900,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  iconBox: {
    paddingLeft: 12,
  },
  hint: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 4,
  },
});
