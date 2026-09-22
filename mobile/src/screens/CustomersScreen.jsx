import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal as RNModal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, MapPin, Clock, User, ChevronLeft, ChevronRight, Eye, CheckCircle, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { customer as customerApi } from '../services/customer';
import { userApi } from '../services/user';
import TopBar from '../components/TopBar';

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ["Interested", "Visit Scheduled", "Visit Completed"];

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
  const [roleFilter, setRoleFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  
  const [viewCustomer, setViewCustomer] = useState(null);
  const [updating, setUpdating] = useState(null);

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

  const teamRoles = useMemo(() => {
    const roleSet = new Set();
    teamUserIds.forEach(id => {
      const u = users.find(u => u.id === id);
      if (u?.role) roleSet.add(u.role);
    });
    return ["All", ...Array.from(roleSet)];
  }, [users, teamUserIds]);

  const getCreatorRole = (customer) => {
    const creator = users.find(u => u.id === (customer.createdById || customer.createdBy));
    return creator?.role || "";
  };

  const getCreatorName = (customer) => {
    const visit = customer.visits?.[0];
    if (visit?.registeredBy) return visit.registeredBy;
    const creator = users.find(u => u.id === (customer.createdById || customer.createdBy));
    return creator ? creator.name : customer.salesManagerName || "—";
  };
  
  const getCreatorCode = (customer) => {
    const visit = customer.visits?.[0];
    if (visit?.registeredByRole) return visit.registeredByRole;
    const creator = users.find(u => u.id === (customer.createdById || customer.createdBy));
    return creator?.employeeCode || "";
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
    if (roleFilter !== "All") {
      result = result.filter(c => getCreatorRole(c) === roleFilter);
    }
    return result;
  }, [searchedCustomers, statusFilter, roleFilter, users]);

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
  const uniqueCustomerCount = myCustomers.length;

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const markCompleted = async (c) => {
    try {
      setUpdating(c._rowKey);
      await customerApi.update(c.id, { status: "Visit Completed" });
      toast.success("Marked as Completed!");
      fetchAll();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  if (loading && !customers.length) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar />
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{uniqueCustomerCount}</Text>
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

          <View style={styles.pwaHeader}>
            <View style={styles.searchBox}>
              <Search size={14} color={colors.slate400} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Name, Mobile, Site..."
                value={search}
                onChangeText={t => { setSearch(t); setCurrentPage(1); }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }} style={styles.searchClear}>
                  <X size={14} color={colors.slate400} />
                </TouchableOpacity>
              )}
            </View>

            {user?.role !== "Sales Manager" && (
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setRoleDropdownOpen(true)}>
                <Text style={styles.dropdownBtnText}>{roleFilter === "All" ? "All Roles" : roleFilter}</Text>
                <ChevronDown size={14} color={colors.slate500} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDropdownOpen(true)}>
              <Text style={styles.dropdownBtnText}>
                {statusFilter === "All" ? `All Status (${statusCounts.All})` : `${statusFilter} (${statusCounts[statusFilter] || 0})`}
              </Text>
              <ChevronDown size={14} color={colors.slate500} />
            </TouchableOpacity>

            <Text style={styles.rowsInfo}>Showing {paginatedCustomers.length} of {filteredCustomers.length} rows ({uniqueCustomerCount} customers)</Text>
          </View>

          {/* TABLE LAYOUT */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 140 }]}>CUSTOMER</Text>
                <Text style={[styles.th, { width: 140 }]}>USER</Text>
                <Text style={[styles.th, { width: 110 }]}>MOBILE</Text>
                <Text style={[styles.th, { width: 110 }]}>SITE</Text>
                <Text style={[styles.th, { width: 90 }]}>DATE</Text>
                <Text style={[styles.th, { width: 110 }]}>STATUS</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>ACTION</Text>
              </View>

              {paginatedCustomers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No customers found</Text>
                </View>
              ) : (
                paginatedCustomers.map((c) => (
                  <View style={styles.tableRow} key={c._rowKey}>
                    <View style={[styles.td, { width: 140 }]}>
                      <Text style={styles.tdName} numberOfLines={1}>{c.name || "—"}</Text>
                    </View>
                    <View style={[styles.td, { width: 140 }]}>
                      <Text style={styles.tdText} numberOfLines={1}>{getCreatorName(c)}</Text>
                      {getCreatorCode(c) ? <Text style={styles.tdSub}>{getCreatorCode(c)}</Text> : null}
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Text style={styles.tdText}>{c.mobile || "—"}</Text>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Text style={styles.tdText} numberOfLines={1}>{c.siteName || "—"}</Text>
                    </View>
                    <View style={[styles.td, { width: 90 }]}>
                      <Text style={styles.tdText}>{formatDate(c.visitDate)}</Text>
                    </View>
                    <View style={[styles.td, { width: 110, paddingVertical: 8 }]}>
                      {c.status === "Visit Scheduled" && (c.createdById === user?.id || ["Admin", "Director"].includes(user?.role)) ? (
                        <TouchableOpacity style={styles.markBtn} onPress={() => markCompleted(c)} disabled={updating === c._rowKey}>
                          {updating === c._rowKey ? <ActivityIndicator size="small" color="#1d4ed8" /> : <Text style={styles.markBtnText}>Update Status...</Text>}
                        </TouchableOpacity>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </View>
                    <View style={[styles.td, { width: 80, flexDirection: 'row', justifyContent: 'center' }]}>
                      <TouchableOpacity style={styles.actionBtnBlue} onPress={() => setViewCustomer(c)}>
                        <Eye size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} color={currentPage === 1 ? colors.slate300 : colors.slate600} />
                <Text style={[styles.pageText, currentPage === 1 && { color: colors.slate300 }]}>Prev</Text>
              </TouchableOpacity>
              <View style={styles.pageNumbers}>
                 <Text style={styles.pageNumberText}>{currentPage}</Text>
              </View>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={[styles.pageText, currentPage === totalPages && { color: colors.slate300 }]}>Next</Text>
                <ChevronRight size={14} color={currentPage === totalPages ? colors.slate300 : colors.slate600} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* DROPDOWNS */}
      <RNModal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Status</Text>
            <ScrollView style={{maxHeight: 400}}>
              {["All", ...STATUS_OPTIONS].map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.dropdownItem, statusFilter === s && styles.dropdownItemActive]}
                  onPress={() => { setStatusFilter(s); setCurrentPage(1); setDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, statusFilter === s && styles.dropdownItemTextActive]}>{s === "All" ? "All Status" : s}</Text>
                  {statusFilter === s && <CheckCircle size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </RNModal>

      <RNModal visible={roleDropdownOpen} transparent animationType="fade" onRequestClose={() => setRoleDropdownOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setRoleDropdownOpen(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Role</Text>
            <ScrollView style={{maxHeight: 400}}>
              {teamRoles.map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.dropdownItem, roleFilter === s && styles.dropdownItemActive]}
                  onPress={() => { setRoleFilter(s); setCurrentPage(1); setRoleDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, roleFilter === s && styles.dropdownItemTextActive]}>{s === "All" ? "All Roles" : s}</Text>
                  {roleFilter === s && <CheckCircle size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* VIEW MODAL */}
      <RNModal visible={viewCustomer !== null} transparent animationType="fade" onRequestClose={() => setViewCustomer(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity onPress={() => setViewCustomer(null)} style={styles.modalClose}>
                <X size={20} color={colors.slate500} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {viewCustomer && (
                <View style={styles.viewModalContent}>
                  <View style={styles.viewHeader}>
                    <View style={styles.viewAvatar}>
                      <Text style={styles.viewAvatarText}>{viewCustomer.name?.charAt(0) || 'C'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.viewName}>{viewCustomer.name}</Text>
                      <Text style={styles.viewPhone}>{viewCustomer.mobile}</Text>
                    </View>
                    <StatusBadge status={viewCustomer.status} />
                  </View>
                  
                  <View style={styles.viewDetailsBox}>
                    {[
                      { label: 'Email', value: viewCustomer.email },
                      { label: 'Site', value: viewCustomer.siteName },
                      { label: 'User', value: (() => {
                        const creatorName = getCreatorName(viewCustomer);
                        const creatorCode = getCreatorCode(viewCustomer);
                        if (creatorName && creatorCode) return `${creatorName} (${creatorCode})`;
                        return creatorName;
                      })() },
                      { label: (() => {
                        const creator = users.find(u => u.id === (viewCustomer.createdById || viewCustomer.createdBy));
                        return creator ? `${creator.role} Mobile` : 'User Mobile';
                      })(), value: (() => {
                        const creator = users.find(u => u.id === (viewCustomer.createdById || viewCustomer.createdBy));
                        return creator?.mobile || '—';
                      })() },
                      { label: 'Visit Date', value: formatDate(viewCustomer.visitDate) },
                      { label: 'Visit Time', value: (() => {
                        if (!viewCustomer.visitTime) return '—';
                        const [h, m] = viewCustomer.visitTime.split(':');
                        const hour = parseInt(h, 10);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const hour12 = hour % 12 || 12;
                        return `${hour12}:${m} ${ampm}`;
                      })() },
                      { label: 'Persons', value: viewCustomer.persons },
                      { label: 'Purchase Mode', value: viewCustomer.purchaseMode },
                      { label: 'Location', value: viewCustomer.location },
                      { label: 'Pin Code', value: viewCustomer.pinCode },
                      { label: 'Occupation', value: viewCustomer.occupation },
                      { label: 'Registered', value: formatDate(viewCustomer.registeredDate || viewCustomer.createdAt) },
                      { label: 'Address', value: viewCustomer.address },
                    ].map((item, idx) => {
                      if (!item.value) return null;
                      return (
                        <View key={idx} style={styles.viewDetailRow}>
                          <Text style={styles.viewDetailLabel}>{item.label}</Text>
                          {item.label === 'Location' ? (
                            <TouchableOpacity onPress={() => import('react-native').then(rn => rn.Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.value)}`))}>
                              <Text style={[styles.viewDetailValue, {color: colors.primary, textDecorationLine: 'underline'}]}>{item.value} ↗</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.viewDetailValue}>{item.value}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </RNModal>

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
  summaryVal: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, color: colors.slate400, marginTop: 2 },

  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden' },
  cardHeader: { padding: 16, paddingBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: colors.slate800 },
  
  pwaHeader: { padding: 12, borderBottomWidth: 1, borderColor: colors.slate100, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 12, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate800 },
  searchClear: { padding: 4 },
  
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 12, height: 40 },
  dropdownBtnText: { fontSize: 12, fontWeight: '500', color: colors.slate600 },
  rowsInfo: { fontSize: 11, color: colors.slate400, marginTop: 4 },

  tableScroll: { flexDirection: 'row' },
  tableContainer: { paddingBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.slate50, borderBottomWidth: 1, borderTopWidth: 1, borderColor: colors.slate100 },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 10, fontWeight: 'bold', color: colors.slate500, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.slate50, alignItems: 'center' },
  td: { paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
  tdName: { fontSize: 12, fontWeight: 'bold', color: colors.slate800, marginBottom: 2 },
  tdText: { fontSize: 12, color: colors.slate700, marginBottom: 2 },
  tdSub: { fontSize: 10, color: colors.slate400, fontFamily: 'monospace' },
  
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  markBtn: { backgroundColor: colors.blue50, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center' },
  markBtnText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
  actionBtnBlue: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.blue50, justifyContent: 'center', alignItems: 'center' },

  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: colors.slate100 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 8, backgroundColor: colors.slate50 },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  pageNumbers: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  pageNumberText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },

  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.slate400, fontWeight: '500' },

  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownBox: { width: '100%', maxWidth: 300, backgroundColor: colors.white, borderRadius: 16, padding: 8, elevation: 5 },
  dropdownTitle: { fontSize: 14, fontWeight: 'bold', color: colors.slate800, padding: 12, borderBottomWidth: 1, borderColor: colors.slate100, marginBottom: 8 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8 },
  dropdownItemActive: { backgroundColor: colors.blue50 },
  dropdownItemText: { fontSize: 13, color: colors.slate600 },
  dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 400, backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: colors.slate100 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: colors.slate800 },
  modalClose: { padding: 4 },
  modalBody: { padding: 16 },
  
  viewModalContent: { paddingBottom: 20 },
  viewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  viewAvatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  viewAvatarText: { fontSize: 20, fontWeight: 'bold', color: colors.white },
  viewName: { fontSize: 16, fontWeight: 'bold', color: colors.slate900 },
  viewPhone: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  
  viewDetailsBox: { backgroundColor: colors.slate50, borderRadius: 12, padding: 16, gap: 16 },
  viewDetailRow: { flexDirection: 'column', gap: 2 },
  viewDetailLabel: { fontSize: 11, fontWeight: '600', color: colors.slate400, letterSpacing: 0.5 },
  viewDetailValue: { fontSize: 14, color: colors.slate800 }
});
