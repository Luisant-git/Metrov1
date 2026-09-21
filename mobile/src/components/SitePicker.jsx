import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';

export default function SitePicker({
  visible,
  plots = [],
  selectedSiteId,
  onSelectSite,
  onClose,
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Site / Plot</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={plots}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelectedSite = Number(selectedSiteId) === Number(item.id);

              return (
                <Pressable
                  onPress={() => onSelectSite(item.id)}
                  style={[styles.siteRow, isSelectedSite && styles.siteRowSelected]}>
                  <View style={styles.siteTextWrap}>
                    <Text style={[styles.siteName, isSelectedSite && styles.siteNameSelected]}>
                      Site {item.siteNo || item.id}
                    </Text>
                    <Text style={styles.siteMeta}>
                      {item.facing} · {Number(item.totalSqft).toLocaleString('en-IN')} sqft
                    </Text>
                  </View>
                  <Text style={styles.price}>
                    ₹{Number(item.pricePerSqft).toLocaleString('en-IN')}/sqft
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.gray900,
  },
  close: {
    fontSize: 18,
    color: colors.slate500,
  },
  list: {
    padding: 16,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  siteRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  siteTextWrap: {
    flex: 1,
  },
  siteName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate800,
  },
  siteNameSelected: {
    color: colors.primaryDark,
  },
  siteMeta: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 4,
  },
  price: {
    fontSize: 13,
    color: colors.green700,
    fontWeight: '700',
  },
});
