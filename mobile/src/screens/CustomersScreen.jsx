import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, MapPin, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { customer as customerApi } from '../services/customer';
import { userApi } from '../services/user';
import TopBar from '../components/TopBar';

const ITEMS_PER_PAGE = 10;

// Helper to filter downline users
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

export default function CustomersScreen({ navigation }) {
  const { user } = useAuth();
  const toast = useToast();
  
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, userRes] = await Promise.all([
        customerApi.getAll(),
        userApi.getAll()
      ]);
      const list = Array.isArray(custRes) ? custRes : (Array.isArray(custRes?.data) ? custRes.data : []);
      const uList = Array.isArray(userRes) ? userRes : (Array.isArray(userRes?.data) ? userRes.data : []);
      setCustomers(list);
      setUsers(uList);
    } catch (err) {
      toast.error(err.message || 'Failed to load data');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchAll());
    return unsubscribe;
  }, [navigation, fetchAll]);

  const teamUserIds = useMemo(() => {
    if (!users.length || !user?.id) return [user?.id].filter(Boolean);
    const downline = getDownline(users, user.id);
    return [user.id, ...downline];
  }, [users, user]);

  const myCustomers = useMemo(() => {
    return customers.filter(c => teamUserIds.includes(c.createdById || c.createdBy));
  }, [customers, teamUserIds]);

  const expandedCustomers = useMemo(() => {
    const rows = [];
    myCustomers.forEach((c) => {
      const visits = c.visits && c.visits.length > 0 ? c.visits : null;
      if (!visits) {
        rows.push({ ...c, _rowKey: `${c.id}-base` });
      } else {
        visits.forEach((v, idx) => {
          rows.push({
            ...c,
            siteName: v.siteName || c.siteName || "—",
            visitDate: v.visitDate || c.visitDate || "",
            visitTime: v.visitTime || c.visitTime || "",
            status: v.status || c.status,
            _visitId: v.id,
            _rowKey: `${c.id}-${v.id ?? idx}`,
          });
        });
      }
    });
    return rows;
  }, [myCustomers]);

  const getCreatorName = (customer) => {
    const visit = customer.visits?.[0];
    if (visit?.registeredBy) return visit.registeredBy;
    const creator = users.find(u => u.id === (customer.createdById || customer.createdBy));
    return creator ? creator.name : customer.salesManagerName || "—";
  };

  const searchedCustomers = useMemo(() => {
    if (!search.trim()) return expandedCustomers;
    const s = search.toLowerCase().trim();
    return expandedCustomers.filter(c => 
      c.name?.toLowerCase().includes(s) ||
      c.mobile?.includes(s) ||
      c.siteName?.toLowerCase().includes(s) ||
      c.salesManagerName?.toLowerCase().includes(s) ||
      String(c.createdById || c.createdBy || "").includes(s)
    );
  }, [expandedCustomers, search]);

  const filteredCustomers = useMemo(() => {
    let result = searchedCustomers;
    if (statusFilter !== "All") {
      result = result.filter(c => c.status === statusFilter);
    }
    return result;
  }, [searchedCustomers, statusFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const statusCounts = useMemo(() => {
    const counts = { All: myCustomers.length, Interested: 0, "Visit Scheduled": 0, "Visit Completed": 0, "Ready for Booking": 0, Booked: 0, "Payment Done": 0, Dropped: 0 };
    myCustomers.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [myCustomers]);

  const bookedCount = statusCounts["Booked"] + statusCounts["Payment Done"];

  const StatusBadge = ({ status }) => {
    let bg = colors.slate100, text = colors.slate600;
    if (status === 'Interested') { bg = '#f3e8ff'; text = '#7e22ce'; }
    else if (status === 'Visit Scheduled') { bg = '#fef08a'; text = '#a16207'; }
    else if (status === 'Visit Completed') { bg = '#dcfce7'; text = '#15803d'; }
    else if (status === 'Booked' || status === 'Payment Done') { bg = '#d1fae5'; text = '#047857'; }
    else if (status === 'Ready for Booking') { bg = '#e0e7ff'; text = '#4338ca'; }
    else if (status === 'Dropped') { bg = '#fee2e2'; text = '#b91c1c'; }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: text }]}>{status || "Interested"}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Customer Overview</Text>
          <Text style={styles.pageSub}>Team customer performance</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{myCustomers.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: '#16a34a' }]}>{bookedCount}</Text>
              <Text style={styles.summaryLabel}>Booked</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My Customers</Text>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color={colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              value={search}
              onChangeText={t => { setSearch(t); setCurrentPage(1); }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }} style={styles.searchClear}>
                <X size={14} color={colors.slate400} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
            {["All", "Interested", "Visit Scheduled", "Visit Completed", "Ready for Booking", "Booked"].map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                onPress={() => { setStatusFilter(s); setCurrentPage(1); }}
              >
                <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : paginatedCustomers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {paginatedCustomers.map(c => (
                <View key={c._rowKey} style={styles.customerRow}>
                  <View style={styles.custMain}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{c.name?.charAt(0) || 'C'}</Text>
                    </View>
                    <View style={styles.custInfo}>
                      <Text style={styles.custName}>{c.name}</Text>
                      <Text style={styles.custPhone}>{c.mobile || "—"}</Text>
                    </View>
                    <StatusBadge status={c.status} />
                  </View>
                  
                  <View style={styles.custMeta}>
                    <View style={styles.metaCol}>
                      <View style={styles.metaRow}><MapPin size={10} color={colors.slate400} /><Text style={styles.metaText}>{c.siteName || '—'}</Text></View>
                      <View style={styles.metaRow}><Clock size={10} color={colors.slate400} /><Text style={styles.metaText}>{c.visitDate || '—'} {c.visitTime || ''}</Text></View>
                    </View>
                    <View style={styles.metaCol}>
                      <View style={styles.metaRow}><User size={10} color={colors.slate400} /><Text style={styles.metaText}>{getCreatorName(c)}</Text></View>
                    </View>
                  </View>
                </View>
              ))}
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
              <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
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
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 100 },
  
  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: colors.slate900 },
  pageSub: { fontSize: 13, color: colors.slate400, marginTop: 2 },
  
  summaryCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.slate100 },
  summaryTitle: { fontSize: 13, fontWeight: 'bold', color: colors.slate800, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', gap: 12 },
  summaryItem: { flex: 1, backgroundColor: colors.slate50, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryVal: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: colors.slate400, fontWeight: '500' },
  
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden' },
  cardHeader: { padding: 16, paddingBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: colors.slate800 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate800 },
  searchClear: { padding: 4 },
  
  filterScroll: { marginHorizontal: 16, marginBottom: 12 },
  filterScrollContent: { paddingRight: 16, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: colors.slate600 },
  filterChipTextActive: { color: colors.white },
  
  loadingBox: { padding: 40, alignItems: 'center' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.slate400, fontWeight: '500' },
  
  list: { borderTopWidth: 1, borderColor: colors.slate50 },
  customerRow: { padding: 16, borderBottomWidth: 1, borderColor: colors.slate50 },
  custMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.blue50, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  custInfo: { flex: 1 },
  custName: { fontSize: 14, fontWeight: 'bold', color: colors.slate800 },
  custPhone: { fontSize: 12, color: colors.slate400 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  custMeta: { flexDirection: 'row', backgroundColor: colors.slate50, borderRadius: 8, padding: 10, gap: 16 },
  metaCol: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: colors.slate600, fontWeight: '500' },
  
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: colors.slate100 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 8, backgroundColor: colors.slate50 },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  pageInfo: { fontSize: 12, color: colors.slate500, fontWeight: '500' }
});
