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
    paddingVertical: 13,
    paddingHorizontal: 8,
    margin: 4,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionUnselected: {
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.primaryDark,
  },
  optionTextUnselected: {
    color: colors.slate600,
  },
});
