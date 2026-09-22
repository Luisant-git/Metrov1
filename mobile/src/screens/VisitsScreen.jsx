import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { customer as customerApi } from '../services/customer';
import { userApi } from '../services/user';
import TopBar from '../components/TopBar';

const ITEMS_PER_PAGE = 5;

// Helper to filter downline users (since we don't have the context)
function getDownline(usersList, parentId) {
  const ids = [];
  const queue = usersList.filter((u) => u.parentUserId === parentId).map((u) => u.id);
  while (queue.length > 0) {
    const id = queue.shift();
    ids.push(id);
    const children = usersList.filter((u) => u.parentUserId === id).map((u) => u.id);
    queue.push(...children);
  }
  return ids;
}

export default function VisitsScreen({ navigation }) {
  const { user } = useAuth();
  const toast = useToast();
  
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [updating, setUpdating] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, userRes] = await Promise.all([
        customerApi.getAll(),
        userApi.getAll()
      ]);
      const custList = Array.isArray(custRes) ? custRes : (custRes?.data || []);
      const userList = Array.isArray(userRes) ? userRes : (userRes?.data || []);
      setCustomers(custList);
      setUsers(userList);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const teamUserIds = useMemo(() => {
    if (!users.length || !user?.id) return [user?.id].filter(Boolean);
    const downlineIds = getDownline(users, user.id);
    return [user.id, ...downlineIds];
  }, [users, user]);

  const myVisits = useMemo(() => {
    return customers
      .filter(c => teamUserIds.includes(c.createdById || c.createdBy))
      .filter(c => ["Visit Scheduled", "Visit Completed", "Booked", "Payment Done"].includes(c.status))
      .map(c => ({
        ...c,
        customerName: c.name,
      }));
  }, [customers, teamUserIds]);

  const filtered = useMemo(() => {
    if (filter === "All") return myVisits;
    return myVisits.filter(v => v.status === filter);
  }, [filter, myVisits]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedVisits = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const completeVisit = async (v) => {
    try {
      setUpdating(v.id);
      await customerApi.update(v.id, { status: "Visit Completed" });
      toast.success("Visit marked as completed!");
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update visit');
    } finally {
      setUpdating(null);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const upcoming = myVisits.filter(v => v.visitDate >= todayStr && v.status === "Visit Scheduled");

  const StatusBadge = ({ status }) => {
    const getStatusStyle = (s) => {
      switch (s) {
        case 'Visit Scheduled': return { bg: '#fef08a', text: '#a16207' };
        case 'Visit Completed': return { bg: '#dcfce7', text: '#15803d' };
        case 'Booked':
        case 'Payment Done': return { bg: '#d1fae5', text: '#047857' };
        default: return { bg: colors.slate100, text: colors.slate600 };
      }
    };
    const s = getStatusStyle(status);
    return (
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        <View style={styles.filterRow}>
          {["All", "Visit Scheduled", "Visit Completed"].map(s => {
            const isActive = filter === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, isActive ? styles.filterChipActive : styles.filterChipInactive]}
                onPress={() => handleFilterChange(s)}
              >
                <Text style={[styles.filterChipText, isActive ? styles.filterTextActive : styles.filterTextInactive]}>
                  {s === "All" ? `All (${myVisits.length})` : s.replace("Visit ", "")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {upcoming.length > 0 && filter === "All" && (
          <View style={styles.upcomingBox}>
            <View style={styles.upcomingHeader}>
              <Clock size={14} color={colors.primary} />
              <Text style={styles.upcomingTitle}>Upcoming Visits ({upcoming.length})</Text>
            </View>
            {upcoming.map(v => (
              <View key={v.id} style={styles.upcomingCard}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>{v.customerName?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ucName}>{v.customerName}</Text>
                  <View style={styles.iconRow}>
                    <MapPin size={10} color={colors.slate400} />
                    <Text style={styles.iconText}>{v.siteName || '—'}</Text>
                  </View>
                  <View style={styles.iconRow}>
                    <Calendar size={10} color={colors.primary} />
                    <Text style={[styles.iconText, { color: colors.primary, fontWeight: '600' }]}>{v.visitDate}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.doneBtn} onPress={() => completeVisit(v)} disabled={updating === v.id}>
                  {updating === v.id ? <ActivityIndicator size="small" color="#15803d" /> : (
                    <>
                      <CheckCircle size={12} color="#15803d" />
                      <Text style={styles.doneBtnText}>Done</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>{filter === "All" ? "All Visits" : filter}</Text>

        {paginatedVisits.map(v => {
          const isCompleted = v.status === 'Visit Completed' || v.status === 'Booked' || v.status === 'Payment Done';
          const iconColor = isCompleted ? '#22c55e' : (v.status === 'Cancelled' ? '#f87171' : '#3b82f6');
          const Icon = isCompleted ? CheckCircle : (v.status === 'Cancelled' ? XCircle : Clock);

          return (
            <View key={v.id} style={styles.visitCard}>
              <View style={styles.visitRow}>
                <View style={styles.statusIconWrap}>
                  <Icon size={20} color={iconColor} />
                </View>
                <View style={styles.visitDetails}>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitName} numberOfLines={1}>{v.customerName}</Text>
                    <StatusBadge status={v.status} />
                  </View>
                  <View style={styles.iconRow}>
                    <MapPin size={12} color={colors.slate400} />
                    <Text style={styles.iconTextLG}>{v.siteName || '—'}</Text>
                  </View>
                  <View style={styles.iconRow}>
                    <Calendar size={12} color={colors.slate400} />
                    <Text style={styles.iconTextLG}>{v.visitDate} {v.visitTime ? `at ${v.visitTime}` : ''}</Text>
                  </View>
                  {v.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>📝 {v.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {v.status === "Visit Scheduled" && (
                <TouchableOpacity style={styles.markDoneBtn} onPress={() => completeVisit(v)} disabled={updating === v.id}>
                  {updating === v.id ? <ActivityIndicator size="small" color="#15803d" /> : (
                    <>
                      <CheckCircle size={14} color="#15803d" />
                      <Text style={styles.markDoneText}>Mark Visit as Completed</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <MapPin size={36} color={colors.slate300} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No visits found</Text>
          </View>
        )}

        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} color={currentPage === 1 ? colors.slate300 : colors.slate600} />
              <Text style={[styles.pageText, currentPage === 1 && { color: colors.slate300 }]}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pageNumBtn, currentPage === p && styles.pageNumBtnActive]}
                  onPress={() => setCurrentPage(p)}
                >
                  <Text style={[styles.pageNumText, currentPage === p && styles.pageNumTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.pageText, currentPage === totalPages && { color: colors.slate300 }]}>Next</Text>
              <ChevronRight size={16} color={currentPage === totalPages ? colors.slate300 : colors.slate600} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 100 },
  
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipInactive: { backgroundColor: colors.white, borderColor: colors.slate200 },
  filterTextActive: { color: colors.white, fontSize: 12, fontWeight: '700' },
  filterTextInactive: { color: colors.slate600, fontSize: 12, fontWeight: '600' },
  
  upcomingBox: { backgroundColor: colors.primarySoft || '#eff6ff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#dbeafe' },
  upcomingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  upcomingTitle: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  
  upcomingCard: { backgroundColor: colors.white, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  ucName: { fontSize: 14, fontWeight: 'bold', color: colors.slate800, marginBottom: 2 },
  
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  iconText: { fontSize: 10, color: colors.slate400 },
  iconTextLG: { fontSize: 12, color: colors.slate500 },
  
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  doneBtnText: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },

  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: colors.slate400, textTransform: 'uppercase', marginBottom: 12, marginTop: 4 },
  
  visitCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.slate100, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  visitRow: { flexDirection: 'row', gap: 12 },
  statusIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.slate50, justifyContent: 'center', alignItems: 'center' },
  visitDetails: { flex: 1 },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  visitName: { fontSize: 15, fontWeight: 'bold', color: colors.slate800, flex: 1, marginRight: 8 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  notesBox: { backgroundColor: colors.slate50, borderRadius: 8, padding: 8, marginTop: 8 },
  notesText: { fontSize: 12, color: colors.slate500 },
  
  markDoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f0fdf4', marginTop: 12, paddingVertical: 12, borderRadius: 12 },
  markDoneText: { fontSize: 13, fontWeight: 'bold', color: '#15803d' },
  
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.slate400 },
  
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingHorizontal: 4 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  pageBtnDisabled: { opacity: 0.5 },
  pageText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  pageNumbers: { flexDirection: 'row', gap: 4 },
  pageNumBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  pageNumBtnActive: { backgroundColor: colors.primary },
  pageNumText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  pageNumTextActive: { color: colors.white }
});
