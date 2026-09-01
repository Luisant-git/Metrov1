import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Radio-button group styled like the PWA's pill selection cards.
export function RadioGroup({ options, value, onChange, columns = 2 }) {
  return (
    <View style={styles.grid}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.option,
              { flexBasis: `${100 / columns}%` },
              selected ? styles.optionSelected : styles.optionUnselected,
            ]}>
            <Text
              style={[
                styles.optionText,
                selected ? styles.optionTextSelected : styles.optionTextUnselected,
              ]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  option: {
    flexGrow: 1,
<<<<<<< HEAD
    flexBasis: '29%',
    minHeight: 46,
    paddingVertical: 12,
=======
    paddingVertical: 13,
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
    paddingHorizontal: 8,
    margin: 4,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
<<<<<<< HEAD
    borderColor: colors.blue600,
    backgroundColor: colors.blue50,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
=======
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
  },
  optionUnselected: {
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
<<<<<<< HEAD
    textAlign: 'center',
  },
  optionTextSelected: {
    color: colors.blue700,
=======
  },
  optionTextSelected: {
    color: colors.primaryDark,
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
  },
  optionTextUnselected: {
    color: colors.slate600,
  },
});
