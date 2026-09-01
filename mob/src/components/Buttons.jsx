import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
<<<<<<< HEAD
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

const PRIMARY_GRADIENT = ['#1D6FB9', '#175a97'];

// Primary gradient button matching the PWA gradient + shadow + icon.
=======
import { colors } from '../theme';

// Primary gradient-styled button (gradient approximated with solid + shadow to match PWA blue).
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  style,
  textStyle,
<<<<<<< HEAD
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
=======
}) {
  const isDisabled = disabled || loading;
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
<<<<<<< HEAD
        styles.buttonWrap,
        variant === 'sm' ? styles.buttonWrapSm : null,
=======
        styles.button,
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
<<<<<<< HEAD
      <LinearGradient
        colors={PRIMARY_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, variant === 'sm' ? styles.buttonSm : null]}>
        {content}
      </LinearGradient>
=======
      {loading ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </View>
      )}
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
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
<<<<<<< HEAD
  buttonWrap: {
    borderRadius: 10,
    overflow: 'hidden',
=======
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
<<<<<<< HEAD
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
=======
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
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
<<<<<<< HEAD
  textSm: {
    fontSize: 12,
  },
=======
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
  secondary: {
    backgroundColor: colors.gray100,
<<<<<<< HEAD
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
=======
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
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
