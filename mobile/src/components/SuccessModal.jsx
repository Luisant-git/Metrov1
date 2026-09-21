import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PrimaryButton, SecondaryButton } from './Buttons';

// Success modal mirroring the PWA's "Registration Successful!" modal.
export function SuccessModal({ visible, title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onSecondary}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onSecondary} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.check}>✓</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {primaryLabel ? (
              <PrimaryButton title={primaryLabel} onPress={onPrimary} style={styles.btn} />
            ) : null}
            {secondaryLabel ? (
              <SecondaryButton title={secondaryLabel} onPress={onSecondary} style={styles.btn} />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  check: {
    fontSize: 36,
    color: colors.green600,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  btn: {
    width: '100%',
  },
});
