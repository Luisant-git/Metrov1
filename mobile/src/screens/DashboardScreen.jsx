import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Users, MapPin, UserCheck, UserPlus, Award, UsersRound, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { customer as customerApi } from '../services/customer';
import TopBar from '../components/TopBar';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerApi.getAll();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCustomers(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCustomers();
    });
    return unsubscribe;
  }, [navigation, fetchCustomers]);

  const getQuickActions = () => {
    const role = user?.role;
    // Using EXACT Lucide icons matching PWA
    if (role === 'Regional Manager' || role === 'Branch Manager' || role === 'BDM') {
      return [
        { label: "View Projects", icon: Building2, path: "Sites", color: "#8b5cf6" },
        { label: "Site Visit Registration", icon: UserPlus, path: "Register", color: "#3b82f6" },
        { label: "My Team", icon: Users, path: "Team", color: "#3b82f6" },
        { label: "My Customers", icon: UserCheck, path: "Customers", color: "#22c55e" },
        { label: "My Booking", icon: Award, path: "Customers", color: "#14b8a6" },
        { label: "View Site Visit", icon: MapPin, path: "Visits", color: "#10b981" },
      ];
    }
    if (role === 'Director') {
      return [
        { label: "View Projects", icon: Building2, path: "Sites", color: "#8b5cf6" },
        { label: "Site Visit Registration", icon: UserPlus, path: "Register", color: "#3b82f6" },
        { label: "My Team", icon: Users, path: "Team", color: "#f97316" },
        { label: "My Customers", icon: UserCheck, path: "Customers", color: "#22c55e" },
        { label: "My Booking", icon: Award, path: "Customers", color: "#14b8a6" },
        { label: "View Site Visit", icon: MapPin, path: "Visits", color: "#10b981" },
      ];
    }
    return [
      { label: "View Projects", icon: Building2, path: "Sites", color: "#8b5cf6" },
      { label: "Site Visit Registration", icon: UserPlus, path: "Register", color: "#3b82f6" },
      { label: "My Customers", icon: UsersRound, path: "Customers", color: "#f97316" },
      { label: "My Booking", icon: Award, path: "Customers", color: "#14b8a6" },
      { label: "View Site Visit", icon: MapPin, path: "Visits", color: "#10b981" },
    ];
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const getSubtitle = () => {
    const mapping = { "Admin": "Admin", "Director": "Director", "Regional Manager": "Reg. Manager", "Branch Manager": "Branch Manager", "BDM": "Business Dev. Manager", "Sales Manager": "Sales Manager" };
    return mapping[user?.role] || user?.role;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} bounces={false}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          
          <View style={styles.bgCircleTop} />
          <View style={styles.bgCircleBottom} />
          <View style={styles.bgShape} />

          <View style={styles.headerContent}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.greetingText}>Good {getGreeting()}, 👋</Text>
              <Text style={styles.headerTitle}>{user?.name?.split(' ')[0] || 'User'}</Text>
              <Text style={styles.headerSub}>{user?.role || 'Sales Manager'}</Text>
            </View>
            <View style={styles.avatarWrap}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.quickActionsContainer}>
            <View style={styles.sectionHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Award size={16} color={colors.primary} style={{marginRight: 6}} />
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>
            </View>
            <View style={styles.gridContainer}>
              {getQuickActions().map((action, index) => {
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.gridItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate(action.path)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: action.color }]}>
                      <action.icon size={20} color={colors.white} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.gridLabel} numberOfLines={2}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.slate50 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
    overflow: 'hidden',
  },
  bgCircleTop: {
    position: 'absolute',
    top: -50,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bgCircleBottom: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bgShape: {
    position: 'absolute',
    bottom: -10,
    right: 40,
    width: 60,
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '45deg' }],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  headerTextWrap: { flex: 1 },
  greetingText: { fontSize: 14, color: colors.blue100, fontWeight: '500', marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: colors.white, marginBottom: 6 },
  headerSub: { fontSize: 14, color: colors.blue100, fontWeight: '500' },
  avatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.white },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  quickActionsContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'column', // Changed to column for 1-column layout like PWA
    gap: 8,
  },
  gridItem: {
    width: '100%', // Full width like PWA grid-cols-1
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
    backgroundColor: colors.white,
    marginBottom: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12, // changed from 10 to 12 to match rounded-xl exactly
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gridLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate800,
  },
  customersContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.slate100,
    flex: 1,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  sectionCount: { fontSize: 13, color: colors.slate500, fontWeight: '500' },
  seeAllText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  listContainer: { paddingBottom: 20 },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  customerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate50,
  },
  customerInfo: { flex: 1, paddingRight: 12 },
  customerName: { fontSize: 14, fontWeight: '600', color: colors.slate900, marginBottom: 2 },
  customerDetail: { fontSize: 12, color: colors.slate500 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: colors.slate400, marginTop: 12, fontWeight: '500' },
});
