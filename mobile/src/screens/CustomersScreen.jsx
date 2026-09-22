import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Eye, UserX, X, MapPin } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { customer as customerApi } from '../services/customer';
import TopBar from '../components/TopBar';

export default function CustomersScreen({ navigation }) {
  const { user } = useAuth();
  const toast = useToast();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [viewCustomer, setViewCustomer] = useState(null);

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

  const statusCounts = useMemo(() => {
    const counts = { All: customers.length, Interested: 0, "Visit Scheduled": 0, "Visit Completed": 0, "Ready for Booking": 0, Booked: 0, "Payment Done": 0, Dropped: 0 };
    customers.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(s) ||
        c.mobile?.includes(s) ||
        c.siteName?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "All") {
      result = result.filter(c => c.status === statusFilter);
    }
    return result;
  }, [customers, search, statusFilter]);

  const filterOptions = [
    { key: "All", label: "All" },
    { key: "Interested", label: "Interested" },
    { key: "Visit Scheduled", label: "Visit Scheduled" },
    { key: "Visit Completed", label: "Visit Completed" },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Interested': return { bg: '#dbeafe', text: '#1d4ed8' };
      case 'Visit Scheduled': return { bg: '#fef08a', text: '#a16207' };
      case 'Visit Completed': return { bg: '#dcfce7', text: '#15803d' };
      case 'Ready for Booking': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'Booked': return { bg: '#d1fae5', text: '#047857' };
      case 'Payment Done': return { bg: '#d1fae5', text: '#047857' };
      case 'Dropped': return { bg: '#fee2e2', text: '#b91c1c' };
      case 'Follow-up': return { bg: '#ffedd5', text: '#c2410c' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const renderCustomerItem = (item) => {
    const statusColor = getStatusColor(item.status);
    return (
      <View key={item.id} style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.customerDetailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Mobile</Text>
            <Text style={styles.detailValue}>{item.mobile}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Visit Date</Text>
            <Text style={styles.detailValue}>{formatDate(item.visitDate)}</Text>
          </View>
        </View>
        
        <View style={styles.customerDetailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Site</Text>
            <Text style={styles.detailValue}>{item.siteName || '—'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.viewBtn} 
          onPress={() => setViewCustomer(item)}
        >
          <Eye size={16} color={colors.primary} />
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerArea}>
          <Text style={styles.pageTitle}>Customer Overview</Text>
          <Text style={styles.pageSubtitle}>Team customer performance</Text>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{statusCounts.All}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryVal, { color: '#16a34a' }]}>{statusCounts.Booked + statusCounts["Payment Done"]}</Text>
              <Text style={styles.summaryLabel}>Booked</Text>
            </View>
          </View>
        </View>

        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>My Customers</Text>
          </View>
          
          <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
            <Search size={16} color={colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Name, Mobile, Site..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.slate400}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
          
          <View style={styles.filterWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filterOptions.map(opt => (
                <TouchableOpacity 
                  key={opt.key} 
                  style={[styles.filterChip, statusFilter === opt.key && styles.filterChipActive]}
                  onPress={() => setStatusFilter(opt.key)}
                >
                  <Text style={[styles.filterChipText, statusFilter === opt.key && styles.filterChipTextActive]}>
                    {opt.label} ({opt.key === 'All' ? statusCounts.All : statusCounts[opt.key] || 0})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.listContent}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40, marginBottom: 40 }} />
            ) : filteredCustomers.length === 0 ? (
              <View style={styles.emptyState}>
                <UserX size={40} color={colors.slate300} />
                <Text style={styles.emptyText}>No customers found</Text>
              </View>
            ) : (
              filteredCustomers.map(renderCustomerItem)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Customer Detail Modal */}
      <Modal visible={!!viewCustomer} animationType="slide" transparent={true} onRequestClose={() => setViewCustomer(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {viewCustomer && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Customer Details</Text>
                  <TouchableOpacity onPress={() => setViewCustomer(null)}>
                    <X size={24} color={colors.slate600} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={styles.modalProfileRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{viewCustomer.name?.charAt(0)}</Text>
                    </View>
                    <View style={styles.modalProfileInfo}>
                      <Text style={styles.modalName}>{viewCustomer.name}</Text>
                      <Text style={styles.modalMobile}>{viewCustomer.mobile}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(viewCustomer.status).bg }]}>
                      <Text style={[styles.badgeText, { color: getStatusColor(viewCustomer.status).text }]}>{viewCustomer.status}</Text>
                    </View>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoVal}>{viewCustomer.email || '—'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Site</Text><Text style={styles.infoVal}>{viewCustomer.siteName || '—'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Visit Date</Text><Text style={styles.infoVal}>{formatDate(viewCustomer.visitDate)}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Visit Time</Text><Text style={styles.infoVal}>{viewCustomer.visitTime || '—'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Persons</Text><Text style={styles.infoVal}>{viewCustomer.persons || '—'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Purchase Mode</Text><Text style={styles.infoVal}>{viewCustomer.purchaseMode || '—'}</Text></View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Location</Text>
                      {viewCustomer.location ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewCustomer.location)}`)}>
                          <Text style={[styles.infoVal, { color: colors.primary, textDecorationLine: 'underline' }]}>{viewCustomer.location} ↗</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.infoVal}>—</Text>
                      )}
                    </View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoVal}>{viewCustomer.address || '—'}</Text></View>
                  </View>

                  {viewCustomer.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesTitle}>Notes</Text>
                      <Text style={styles.notesText}>{viewCustomer.notes}</Text>
                    </View>
                  )}
                  
                  {(viewCustomer.driverName || viewCustomer.cabNumber) && (
                    <View style={styles.notesSection}>
                      <Text style={[styles.notesTitle, {color: colors.primary}]}>🚗 Driver Details</Text>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>Name</Text><Text style={styles.infoVal}>{viewCustomer.driverName || '—'}</Text></View>
                      <View style={styles.infoRow}><Text style={styles.infoLabel}>Cab Number</Text><Text style={styles.infoVal}>{viewCustomer.cabNumber || '—'}</Text></View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.slate50 },
  headerArea: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.white },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.slate900 },
  pageSubtitle: { fontSize: 14, color: colors.slate400, marginTop: 4 },
  
  summaryContainer: { marginHorizontal: 16, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.slate100 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', gap: 12 },
  summaryBox: { flex: 1, backgroundColor: colors.slate50, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryVal: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  summaryLabel: { fontSize: 12, color: colors.slate400 },
  
  listContainer: { marginHorizontal: 16, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden' },
  listHeader: { padding: 16, paddingBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, marginHorizontal: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.slate200, height: 44, marginBottom: 16 },
  searchWrapFocused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft || '#eff6ff' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate800, minHeight: 44 },
  
  filterWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.slate100, marginRight: 8, borderWidth: 1, borderColor: colors.slate200 },
  filterChipActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  filterChipText: { fontSize: 12, fontWeight: '500', color: colors.slate600 },
  filterChipTextActive: { color: colors.primary, fontWeight: '600' },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  customerCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.slate100, shadowColor: colors.black, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  customerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  customerDetailsRow: { flexDirection: 'row', marginBottom: 10 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: colors.slate400, fontWeight: '500', marginBottom: 2 },
  detailValue: { fontSize: 13, color: colors.slate700, fontWeight: '500' },
  
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  viewBtnText: { marginLeft: 6, fontSize: 12, fontWeight: '600', color: colors.primary },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginTop: 20 },
  emptyText: { fontSize: 14, color: colors.slate400, marginTop: 12, fontWeight: '500' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', flexShrink: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.slate900 },
  modalProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: colors.white },
  modalProfileInfo: { flex: 1 },
  modalName: { fontSize: 16, fontWeight: 'bold', color: colors.slate900 },
  modalMobile: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  infoGrid: { gap: 12 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: colors.slate400, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  infoVal: { fontSize: 14, color: colors.slate800, fontWeight: '500' },
  notesSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.slate100 },
  notesTitle: { fontSize: 12, fontWeight: '600', color: colors.slate500, marginBottom: 6 },
  notesText: { fontSize: 13, color: colors.slate700, lineHeight: 20 },
});
