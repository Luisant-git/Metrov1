import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

const logoImg = require('../../assets/logo.png');

const ROLE_LABELS = {
  Admin: 'Admin',
  Director: 'Director',
  'Regional Manager': 'Reg. Manager',
  'Branch Manager': 'Branch Manager',
  BDM: 'Business Dev. Manager',
  'Sales Manager': 'Sales Manager',
};

export default function TopBar({ showBack = false }) {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const getSubtitle = () => {
    return ROLE_LABELS[user?.role] || user?.role || 'User';
  };

  return (
    <View style={styles.topBar}>
      {showBack ? (
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
      ) : (
        <View style={styles.logoBox}>
          <Image source={logoImg} style={styles.logoImage} resizeMode="contain" />
        </View>
      )}
      
      <View style={styles.topBarText}>
        <Text style={styles.topBarTitle}>Metrohomes</Text>
        <Text style={styles.topBarSub}>
          {getSubtitle()} · {(user?.name || '').split(' ')[0]} 
          {user?.employeeCode || user?.id ? ` · ID: ${user?.employeeCode || user?.id}` : ''}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={logout}>
        <LogOut size={22} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  logoBox: {
    width: 48,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: { width: 32, height: 32 },
  backBtn: { 
    padding: 8, 
    marginRight: 12, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)' 
  },
  topBarText: { flex: 1 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  topBarSub: { fontSize: 12, fontWeight: '500', color: colors.blue100, marginTop: 2 },
  logoutButton: { padding: 8, marginLeft: 10 },
});
