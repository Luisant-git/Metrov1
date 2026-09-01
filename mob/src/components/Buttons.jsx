import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

const PRIMARY_GRADIENT = ['#1D6FB9', '#175a97'];

// Primary gradient button matching the PWA gradient + shadow + icon.
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  style,
  textStyle,
  variant = 'md',
}) {
  const isDisabled = disabled || loading;
  const content = loading ? (
    <ActivityIndicator size={variant === 'sm' ? 'small' : 'small'} color={colors.white} />
  ) : (
    <View style={styles.content}>
      {icon}
      <Text style={[styles.text, variant === 'sm' ? styles.textSm : null, textStyle]}>{title}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.buttonWrap,
        variant === 'sm' ? styles.buttonWrapSm : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
      <LinearGradient
        colors={PRIMARY_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, variant === 'sm' ? styles.buttonSm : null]}>
        {content}
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, disabled, style, textStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondary,
        pressed ? styles.secondaryPressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}>
      <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
    minHeight: 48,
    width: '100%',
  },
  buttonWrapSm: {
    borderRadius: 8,
    minHeight: 40,
  },
  button: {
    backgroundColor: colors.primary,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    flex: 1,
  },
  buttonSm: {
    minHeight: 40,
    paddingVertical: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  textSm: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
  secondary: {
    backgroundColor: colors.gray100,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryPressed: {
    backgroundColor: colors.gray200,
  },
  secondaryText: {
    color: colors.gray700,
    fontWeight: '700',
    fontSize: 14,
  },
});
