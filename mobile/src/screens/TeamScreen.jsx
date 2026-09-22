import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Building2, UserCheck, TrendingUp, Search, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { userApi } from '../services/user';
import { customer as customerApi } from '../services/customer';
import { bookingApi } from '../services/booking';
import TopBar from '../components/TopBar';

const ITEMS_PER_PAGE = 10;

const abbreviateRole = (role) => {
  const map = {
    "Director": "DIR",
    "Sales Manager": "SM",
    "Branch Manager": "BM",
    "Regional Manager": "RM",
  };
  return map[role] || role;
};

const SUB_ROLES = {
  "Director": [
    { role: "Regional Manager", icon: Building2, color: "#2563eb", bg: "#eff6ff", label: "RM Count" },
    { role: "Branch Manager", icon: Users, color: "#0891b2", bg: "#ecfeff", label: "BM Count" },
    { role: "BDM", icon: Users, color: "#9333ea", bg: "#faf5ff", label: "BDM Count" },
    { role: "Sales Manager", icon: UserCheck, color: "#16a34a", bg: "#f0fdf4", label: "SM Count" },
  ],
  "Regional Manager": [
    { role: "Branch Manager", icon: Building2, color: "#0891b2", bg: "#ecfeff", label: "BM Count" },
    { role: "BDM", icon: Users, color: "#9333ea", bg: "#faf5ff", label: "BDM Count" },
    { role: "Sales Manager", icon: UserCheck, color: "#16a34a", bg: "#f0fdf4", label: "SM Count" },
  ],
  "Branch Manager": [
    { role: "BDM", icon: Users, color: "#9333ea", bg: "#faf5ff", label: "BDM Count" },
    { role: "Sales Manager", icon: UserCheck, color: "#16a34a", bg: "#f0fdf4", label: "SM Count" },
  ],
  "BDM": [
    { role: "Sales Manager", icon: UserCheck, color: "#16a34a", bg: "#f0fdf4", label: "SM Count" },
  ],
  "Sales Manager": [],
};

const TEAM_CONFIG = {
  "Director": { role: "Regional Manager", title: "My Team", subtitle: "All team members under you", cardLabel: "Regional Managers" },
  "Regional Manager": { role: "Branch Manager", title: "My Team", subtitle: "Manage Branch Managers", cardLabel: "Branch Managers" },
  "Branch Manager": { role: "BDM", title: "My Team", subtitle: "Manage BDMs", cardLabel: "BDMs" },
  "BDM": { role: "Sales Manager", title: "My Team", subtitle: "Manage Sales Managers", cardLabel: "Sales Managers" },
};

function getDownlineIds(usersList, parentId) {
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

export default function TeamScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [downlinePage, setDownlinePage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, cRes, bRes] = await Promise.all([
        userApi.getAll(),
        customerApi.getAll(),
        bookingApi.getAll()
      ]);
      setUsers(Array.isArray(uRes) ? uRes : (uRes?.data || []));
      setCustomers(Array.isArray(cRes) ? cRes : (cRes?.data || []));
      setBookings(Array.isArray(bRes) ? bRes : (bRes?.data || []));
    } catch (err) {
      toast.error('Failed to load team data');
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

  const user = useMemo(() => {
    if (!authUser?.id || !users.length) return authUser;
    const match = users.find(u => u.employeeCode === authUser.employeeCode || u.email === authUser.email);
    return match || authUser;
  }, [authUser, users]);

  const config = TEAM_CONFIG[user?.role] || TEAM_CONFIG["BDM"];
  const subRoles = useMemo(() => SUB_ROLES[user?.role] || [], [user?.role]);
  
  const downlineUserIds = useMemo(() => {
    if (!user?.id) return [];
    return getDownlineIds(users, user.id);
  }, [users, user?.id]);

  const roleCounts = useMemo(() => {
    return subRoles.map(({ role }) => ({
      role,
      count: users.filter((u) => u.role === role && downlineUserIds.includes(u.id)).length,
    }));
  }, [users, downlineUserIds, subRoles]);

  const directMembers = useMemo(() => {
    if (!user?.id) return [];
    return users.filter((u) => u.role === config.role && u.parentUserId === user.id);
  }, [users, user?.id, config.role]);

  const allMembers = useMemo(() => {
    if (selectedRole) {
      return users.filter((u) => u.role === selectedRole && downlineUserIds.includes(u.id));
    }
    return directMembers;
  }, [directMembers, selectedRole, users, downlineUserIds]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return allMembers;
    const term = searchTerm.toLowerCase().trim();
    return allMembers.filter((m) => {
      const code = (m.employeeCode || `ID:${m.id}`).toLowerCase();
      const name = (m.name || "").toLowerCase();
      const mobile = (m.mobile || "").toLowerCase();
      return code.includes(term) || name.includes(term) || mobile.includes(term);
    });
  }, [allMembers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const summary = useMemo(() => {
    const teamIds = new Set([...downlineUserIds, user?.id].filter(Boolean));
    const isTeamCustomer = (c) => teamIds.has(c.createdById) || teamIds.has(c.createdBy) || teamIds.has(c.assignedTo);
    const teamCustomers = customers.filter(isTeamCustomer);
    const teamCustomerIds = new Set(teamCustomers.map(c => c.id));
    const teamBookings = bookings.filter(b => {
      if (b.status === "Cancelled") return false;
      if (teamIds.has(b.createdById) || teamIds.has(b.createdBy) || teamIds.has(b.assignedTo)) return true;
      return teamCustomerIds.has(b.customerId);
    });
    return { customers: teamCustomers.length, bookings: teamBookings.length };
  }, [downlineUserIds, customers, bookings, user?.id]);

  const getMemberStats = (member) => {
    const memberCustomers = customers.filter((c) =>
      c.createdById === member.id || c.createdBy === member.id || c.assignedTo === member.id
    );
    const memberCustomerIds = new Set(memberCustomers.map((c) => c.id));
    const memberBookings = bookings.filter((b) => {
      if (b.createdById === member.id || b.createdBy === member.id || b.assignedTo === member.id) return true;
      return memberCustomerIds.has(b.customerId);
    });
    return { customers: memberCustomers.length, bookings: memberBookings.length };
  };

  const getMemberDownline = (member) => {
    if (!member?.id) return [];
    const result = [];
    const queue = users.filter((u) => u.parentUserId === member.id).map((u) => u.id);
    while (queue.length > 0) {
      const id = queue.shift();
      const u = users.find((x) => x.id === id);
      if (u) {
        result.push(u);
        const children = users.filter((x) => x.parentUserId === id).map((x) => x.id);
        queue.push(...children);
      }
    }
    return result;
  };

  const renderMemberModal = () => {
    if (!selectedMember) return null;
    const stats = getMemberStats(selectedMember);
    const downline = getMemberDownline(selectedMember);
    const downlineByRole = {};
    downline.forEach((u) => {
      if (u.role) downlineByRole[u.role] = (downlineByRole[u.role] || 0) + 1;
    });

    const dlPages = Math.max(1, Math.ceil(downline.length / 5));

    return (
      <Modal visible={!!selectedMember} animationType="slide" transparent={true} onRequestClose={() => setSelectedMember(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Member Details</Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <X size={24} color={colors.slate600} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.memberInfoTop}>
                <View style={styles.modalAvatar}>
                  {selectedMember.avatar ? (
                    <Image source={{ uri: selectedMember.avatar }} style={styles.modalAvatarImg} />
                  ) : (
                    <Text style={styles.modalAvatarText}>{selectedMember.name?.charAt(0) || 'U'}</Text>
                  )}
                </View>
                <View style={styles.memberInfoBody}>
                  <Text style={styles.memberName}>{selectedMember.name}</Text>
                  <Text style={styles.memberRoleLine}>
                    {selectedMember.role} • {selectedMember.employeeCode || 'N/A'}
                  </Text>
                  <Text style={styles.memberEmail}>{selectedMember.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: selectedMember.status === 'Active' ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[styles.statusBadgeText, { color: selectedMember.status === 'Active' ? '#15803d' : '#dc2626' }]}>
                    {selectedMember.status || 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.contactCard}>
                <Text style={styles.contactLabel}>Mobile</Text>
                <Text style={styles.contactValue}>{selectedMember.mobile}</Text>
              </View>

              <View style={styles.perfCard}>
                <View style={styles.perfCol}>
                  <Text style={styles.perfLabel}>Customers</Text>
                  <Text style={[styles.perfVal, { color: '#2563eb' }]}>{stats.customers}</Text>
                </View>
                <View style={styles.perfCol}>
                  <Text style={styles.perfLabel}>Bookings</Text>
                  <Text style={[styles.perfVal, { color: '#16a34a' }]}>{stats.bookings}</Text>
                </View>
              </View>

              {downline.length > 0 ? (
                <View style={styles.downlineWrap}>
                  <Text style={styles.dlTitle}>Downline Team ({downline.length})</Text>
                  <View style={styles.dlRoleTagsRow}>
                    {Object.entries(downlineByRole).map(([r, c]) => (
                      <View key={r} style={styles.dlRoleTag}>
                        <Text style={styles.dlRoleTagText}>{abbreviateRole(r)}: {c}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.dlTable}>
                    <View style={styles.dlTableHead}>
                      <Text style={[styles.dlTableText, styles.dlTableHeadText, { flex: 1.5 }]}>User ID</Text>
                      <Text style={[styles.dlTableText, styles.dlTableHeadText, { flex: 2 }]}>Name</Text>
                      <Text style={[styles.dlTableText, styles.dlTableHeadText, { flex: 1, textAlign: 'center' }]}>Role</Text>
                    </View>
                    {downline.slice((downlinePage - 1) * 5, downlinePage * 5).map((d, i) => (
                      <View key={d.id} style={[styles.dlTableRow, i % 2 === 0 ? { backgroundColor: colors.white } : { backgroundColor: colors.slate50 }]}>
                        <Text style={[styles.dlTableText, { flex: 1.5, color: colors.slate600 }]} numberOfLines={1}>{d.employeeCode || `ID:${d.id}`}</Text>
                        <Text style={[styles.dlTableText, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{d.name}</Text>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <View style={styles.dlRolePill}>
                            <Text style={styles.dlRolePillText}>{abbreviateRole(d.role)}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {downline.length > 5 && (
                    <View style={styles.dlPagination}>
                      <TouchableOpacity 
                        style={[styles.dlPageBtn, downlinePage === 1 && styles.dlPageBtnDisabled]} 
                        onPress={() => setDownlinePage(p => Math.max(1, p - 1))}
                        disabled={downlinePage === 1}
                      >
                        <Text style={[styles.dlPageText, downlinePage === 1 && { color: colors.slate400 }]}>Prev</Text>
                      </TouchableOpacity>
                      <Text style={styles.dlPageInfo}>Page {downlinePage} of {dlPages}</Text>
                      <TouchableOpacity 
                        style={[styles.dlPageBtn, downlinePage === dlPages && styles.dlPageBtnDisabled]} 
                        onPress={() => setDownlinePage(p => Math.min(dlPages, p + 1))}
                        disabled={downlinePage === dlPages}
                      >
                        <Text style={[styles.dlPageText, downlinePage === dlPages && { color: colors.slate400 }]}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyDownline}>
                  <Text style={styles.emptyDownlineText}>No downline members</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
        
        <View style={styles.pageHeader}>
          {selectedRole && (
            <TouchableOpacity onPress={() => { setSelectedRole(null); setSearchTerm(""); setCurrentPage(1); }} style={styles.backBtn}>
              <ChevronLeft size={24} color={colors.slate400} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.pageTitle}>{selectedRole ? `${selectedRole}s` : config.title}</Text>
            <Text style={styles.pageSubtitle}>{selectedRole ? `Showing ${selectedRole}s` : config.subtitle}</Text>
          </View>
        </View>

        {!selectedRole && roleCounts.length > 0 && (
          <View style={styles.roleStatsGrid}>
            {roleCounts.map(({ role, count }) => {
              const cfg = subRoles.find(r => r.role === role) || { icon: Users, color: colors.slate600, bg: colors.slate50, label: role };
              return (
                <TouchableOpacity key={role} style={styles.roleCard} onPress={() => { setSelectedRole(role); setSearchTerm(""); setCurrentPage(1); }}>
                  <View style={[styles.roleIconWrap, { backgroundColor: cfg.bg }]}>
                    <cfg.icon size={18} color={cfg.color} />
                  </View>
                  <Text style={[styles.roleCountText, { color: cfg.color }]}>{count}</Text>
                  <Text style={styles.roleLabelText}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: '#faf5ff' }]}>
              <Users size={18} color="#9333ea" />
            </View>
            <Text style={[styles.summaryCount, { color: '#9333ea' }]}>{summary.customers}</Text>
            <Text style={styles.summaryLabel}>Total Customers</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: '#fff7ed' }]}>
              <TrendingUp size={18} color="#ea580c" />
            </View>
            <Text style={[styles.summaryCount, { color: '#ea580c' }]}>{summary.bookings}</Text>
            <Text style={styles.summaryLabel}>Total Bookings</Text>
          </View>
        </View>

        {(allMembers.length > 0 || searchTerm !== "") && (
          <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
            <Search size={18} color={colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID, Name, or Mobile…"
              value={searchTerm}
              onChangeText={(t) => { setSearchTerm(t); setCurrentPage(1); }}
              placeholderTextColor={colors.slate400}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
        )}

        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={colors.slate300} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>{searchTerm ? "No members match your search" : `No ${config.cardLabel.toLowerCase()} yet`}</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.tableHeadText, { width: 90 }]}>User ID</Text>
                  <Text style={[styles.tableCell, styles.tableHeadText, { width: 120 }]}>Name</Text>
                  <Text style={[styles.tableCell, styles.tableHeadText, { width: 100 }]}>Mobile</Text>
                  <Text style={[styles.tableCell, styles.tableHeadText, { width: 60, textAlign: 'center' }]}>Action</Text>
                </View>
                {paginatedMembers.map((m, idx) => (
                  <View key={m.id} style={[styles.tableRow, idx % 2 === 0 ? { backgroundColor: colors.white } : { backgroundColor: colors.slate50 }]}>
                    <Text style={[styles.tableCell, { width: 90, color: colors.slate600, fontFamily: 'monospace' }]} numberOfLines={1}>{m.employeeCode || `ID:${m.id}`}</Text>
                    <Text style={[styles.tableCell, { width: 120, fontWeight: '600', color: colors.slate800 }]} numberOfLines={1}>{m.name}</Text>
                    <Text style={[styles.tableCell, { width: 100, color: colors.slate600 }]} numberOfLines={1}>{m.mobile}</Text>
                    <View style={{ width: 60, alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setSelectedMember(m)} style={styles.actionBtn}>
                        <Eye size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} color={currentPage === 1 ? colors.slate300 : colors.slate600} />
                </TouchableOpacity>

                <View style={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <TouchableOpacity key={p} style={[styles.pageNumBtn, currentPage === p && styles.pageNumBtnActive]} onPress={() => setCurrentPage(p)}>
                      <Text style={[styles.pageNumText, currentPage === p && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} color={currentPage === totalPages ? colors.slate300 : colors.slate600} />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.paginationInfo}>Showing {paginatedMembers.length} of {filteredMembers.length} members</Text>
          </View>
        )}

      </ScrollView>
      {renderMemberModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 100 },
  
  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4, marginRight: 8 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: colors.slate900 },
  pageSubtitle: { fontSize: 13, color: colors.slate400, marginTop: 2 },
  
  roleStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  roleCard: { flex: 1, minWidth: '30%', backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.slate100, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  roleIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  roleCountText: { fontSize: 20, fontWeight: 'bold' },
  roleLabelText: { fontSize: 10, color: colors.slate400, marginTop: 2 },
  
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.slate100, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryCount: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 10, color: colors.slate400, marginTop: 2 },
  
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.slate200, height: 48, marginBottom: 16 },
  searchWrapFocused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft || '#eff6ff' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate800 },
  
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.white, borderRadius: 16 },
  emptyText: { fontSize: 14, color: colors.slate400 },
  
  tableCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden' },
  table: { minWidth: 370 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 10, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.slate50, alignItems: 'center' },
  tableCell: { fontSize: 12, color: colors.slate800, paddingHorizontal: 8 },
  tableHeadText: { fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', fontSize: 10 },
  actionBtn: { padding: 6, backgroundColor: colors.primarySoft || '#eff6ff', borderRadius: 8 },
  
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.slate100 },
  pageBtn: { padding: 8, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.5 },
  pageNumbers: { flexDirection: 'row', gap: 4 },
  pageNumBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  pageNumBtnActive: { backgroundColor: colors.primary },
  pageNumText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  pageNumTextActive: { color: colors.white },
  paginationInfo: { textAlign: 'center', fontSize: 11, color: colors.slate400, paddingBottom: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.slate900 },
  modalScroll: { padding: 20, paddingBottom: 40 },
  
  memberInfoTop: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingBottom: 16, marginBottom: 16 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalAvatarImg: { width: '100%', height: '100%', borderRadius: 32 },
  modalAvatarText: { fontSize: 24, fontWeight: 'bold', color: '#1d4ed8' },
  memberInfoBody: { flex: 1 },
  memberName: { fontSize: 18, fontWeight: 'bold', color: colors.slate900, marginBottom: 2 },
  memberRoleLine: { fontSize: 12, color: colors.slate500, marginBottom: 4 },
  memberEmail: { fontSize: 11, color: colors.slate400 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  
  contactCard: { backgroundColor: colors.slate50, borderRadius: 12, padding: 12, marginBottom: 16 },
  contactLabel: { fontSize: 11, color: colors.slate400, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  
  perfCard: { flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 20 },
  perfCol: { flex: 1 },
  perfLabel: { fontSize: 11, color: colors.slate500, marginBottom: 4 },
  perfVal: { fontSize: 20, fontWeight: 'bold' },
  
  downlineWrap: { marginTop: 8 },
  dlTitle: { fontSize: 14, fontWeight: 'bold', color: colors.slate800, marginBottom: 12 },
  dlRoleTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dlRoleTag: { backgroundColor: colors.slate100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dlRoleTagText: { fontSize: 11, color: colors.slate600, fontWeight: '600' },
  
  dlTable: { backgroundColor: colors.slate50, borderRadius: 12, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden' },
  dlTableHead: { flexDirection: 'row', backgroundColor: colors.slate100, paddingVertical: 8, paddingHorizontal: 12 },
  dlTableHeadText: { fontSize: 10, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase' },
  dlTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.slate100, alignItems: 'center' },
  dlTableText: { fontSize: 12, color: colors.slate800 },
  dlRolePill: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  dlRolePillText: { fontSize: 10, fontWeight: '600', color: '#1d4ed8' },
  
  dlPagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  dlPageBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eff6ff', borderRadius: 8 },
  dlPageBtnDisabled: { backgroundColor: colors.slate50 },
  dlPageText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  dlPageInfo: { fontSize: 11, color: colors.slate500 },
  
  emptyDownline: { paddingVertical: 20, alignItems: 'center' },
  emptyDownlineText: { fontSize: 13, color: colors.slate400 }
});
