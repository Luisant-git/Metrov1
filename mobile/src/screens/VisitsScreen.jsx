import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal as RNModal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, CheckCircle, Clock, XCircle, Search, X, ChevronLeft, ChevronRight, Eye, Edit2, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { customer as customerApi } from '../services/customer';
import { siteVisit as siteVisitApi } from '../services/siteVisit';
import { userApi } from '../services/user';
import TopBar from '../components/TopBar';

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ["Interested", "Visit Scheduled", "Visit Completed"];

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
  
  const isDirector = user?.role === 'Director';

  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updating, setUpdating] = useState(null);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'view' | 'edit' | null
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', driverName: '', driverMobile: '', cabNumber: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editStatusDropdownOpen, setEditStatusDropdownOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDirector) {
        const res = await siteVisitApi.getAll();
        setData(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []));
      } else {
        const [custRes, userRes] = await Promise.all([
          customerApi.getAll(),
          userApi.getAll()
        ]);
        const custList = Array.isArray(custRes) ? custRes : (Array.isArray(custRes?.data) ? custRes.data : []);
        const uList = Array.isArray(userRes) ? userRes : (Array.isArray(userRes?.data) ? userRes.data : []);
        setData(custList);
        setUsers(uList);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isDirector, toast]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // -------------- DIRECTOR MODE LOGIC --------------
  const filteredDirectorVisits = useMemo(() => {
    if (!isDirector) return [];
    let result = data;
    if (filter !== "All") {
      result = result.filter(v => v.status === filter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(v => 
        v.customer?.name?.toLowerCase().includes(s) ||
        v.customer?.phone?.includes(s) ||
        v.siteNo?.toLowerCase().includes(s) ||
        v.projectName?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [data, filter, search, isDirector]);

  // -------------- SALES MODE LOGIC --------------
  const teamUserIds = useMemo(() => {
    if (isDirector || !users.length || !user?.id) return [user?.id].filter(Boolean);
    const downlineIds = getDownline(users, user.id);
    return [user.id, ...downlineIds];
  }, [users, user, isDirector]);

  const salesVisits = useMemo(() => {
    if (isDirector) return [];
    return data
      .filter(c => teamUserIds.includes(c.createdById || c.createdBy))
      .filter(c => ["Visit Scheduled", "Visit Completed", "Booked", "Payment Done"].includes(c.status))
      .map(c => ({ ...c, customerName: c.name }));
  }, [data, teamUserIds, isDirector]);

  const filteredSalesVisits = useMemo(() => {
    if (isDirector) return [];
    if (filter === "All") return salesVisits;
    return salesVisits.filter(v => v.status === filter);
  }, [filter, salesVisits, isDirector]);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingSalesVisits = useMemo(() => {
    if (isDirector) return [];
    return salesVisits.filter(v => v.visitDate >= todayStr && v.status === "Visit Scheduled");
  }, [salesVisits, todayStr, isDirector]);

  // -------------- COMMON LOGIC --------------
  const activeList = isDirector ? filteredDirectorVisits : filteredSalesVisits;
  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const paginatedList = activeList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const completeVisit = async (id, isCustApi) => {
    try {
      setUpdating(id);
      if (isCustApi) {
        await customerApi.update(id, { status: "Visit Completed" });
      } else {
        await siteVisitApi.update(id, { status: "Visit Completed" });
      }
      toast.success("Visit marked as completed!");
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update visit');
    } finally {
      setUpdating(null);
    }
  };

  const saveEditVisit = async () => {
    if (!selectedVisit) return;
    try {
      setSavingEdit(true);
      const hasDriver = editForm.driverName || editForm.driverMobile || editForm.cabNumber;
      const updates = { 
        status: hasDriver ? "Visit Scheduled" : editForm.status,
        driverName: editForm.driverName,
        driverMobile: editForm.driverMobile,
        cabNumber: editForm.cabNumber,
      };
      await siteVisitApi.update(selectedVisit.id, updates);
      toast.success("Visit updated successfully!"); 
      setModalType(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update visit");
    } finally {
      setSavingEdit(false);
    }
  };

  const openViewModal = (v) => {
    setSelectedVisit(v);
    setModalType('view');
  };

  const openEditModal = (v) => {
    setSelectedVisit(v);
    setEditForm({
      status: v.status || 'Interested',
      driverName: v.driverName || '',
      driverMobile: v.driverMobile || '',
      cabNumber: v.cabNumber || ''
    });
    setModalType('edit');
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

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(':');
    if (!h || !m) return timeStr;
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const StatusBadge = ({ status }) => {
    const s = status || "Interested";
    let bg = colors.slate100, text = colors.slate600;
    if (s === 'Visit Scheduled') { bg = '#fef08a'; text = '#a16207'; }
    else if (s === 'Visit Completed') { bg = '#dcfce7'; text = '#15803d'; }
    else if (s === 'Booked' || s === 'Payment Done') { bg = '#d1fae5'; text = '#047857'; }
    else if (s === 'Cancelled') { bg = '#fee2e2'; text = '#b91c1c'; }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: text }]}>{s}</Text>
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
        
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Site Visits</Text>
          <Text style={styles.pageSub}>
            {isDirector ? `${data.length} total visits` : 'My team visits'}
          </Text>
        </View>

        {isDirector ? (
          <View style={styles.card}>
            <View style={styles.pwaHeader}>
              <View style={styles.searchBox}>
                <Search size={14} color={colors.slate400} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search visits..."
                  value={search}
                  onChangeText={t => { setSearch(t); setCurrentPage(1); }}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }} style={styles.searchClear}>
                    <X size={14} color={colors.slate400} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDropdownOpen(true)}>
                <Text style={styles.dropdownBtnText}>{filter === "All" ? "All Status" : filter}</Text>
                <ChevronDown size={14} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 150 }]}>CUSTOMER</Text>
                  <Text style={[styles.th, { width: 120 }]}>SITE</Text>
                  <Text style={[styles.th, { width: 110 }]}>DATE</Text>
                  <Text style={[styles.th, { width: 110 }]}>STATUS</Text>
                  <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>ACTION</Text>
                </View>

                {paginatedList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No visits found</Text>
                  </View>
                ) : (
                  paginatedList.map((v, i) => (
                    <View style={styles.tableRow} key={v.id || i}>
                      <View style={[styles.td, { width: 150 }]}>
                        <Text style={styles.tdName} numberOfLines={1}>{v.customer?.name || "—"}</Text>
                        <Text style={styles.tdSub}>{v.customer?.phone || ""}</Text>
                      </View>
                      <View style={[styles.td, { width: 120 }]}>
                        <Text style={styles.tdText}>Site {v.siteNo || "—"}</Text>
                        {v.projectName && <Text style={styles.tdSub} numberOfLines={1}>{v.projectName}</Text>}
                      </View>
                      <View style={[styles.td, { width: 110 }]}>
                        <Text style={styles.tdText}>{formatDate(v.visitDate)}</Text>
                        {v.visitTime && <Text style={styles.tdSub}>{formatTime(v.visitTime)}</Text>}
                      </View>
                      <View style={[styles.td, { width: 110 }]}>
                        <StatusBadge status={v.status} />
                      </View>
                      <View style={[styles.td, { width: 100, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                        <TouchableOpacity style={styles.actionBtnBlue} onPress={() => openViewModal(v)}>
                          <Eye size={14} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnOrange} onPress={() => openEditModal(v)}>
                          <Edit2 size={14} color="#ea580c" />
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
        ) : (
          /* --------------- SALES MODE --------------- */
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
              {["All", "Visit Scheduled", "Visit Completed"].map(s => {
                const isActive = filter === s;
                const count = s === "All" ? salesVisits.length : salesVisits.filter(d => d.status === s).length;
                return (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => { setFilter(s); setCurrentPage(1); }}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {s === "All" ? `All (${count})` : s.replace("Visit ", "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {upcomingSalesVisits.length > 0 && filter === "All" && (
              <View style={styles.upcomingBox}>
                <View style={styles.upcomingHeader}>
                  <Clock size={14} color={colors.primary} />
                  <Text style={styles.upcomingTitle}>Upcoming Visits ({upcomingSalesVisits.length})</Text>
                </View>
                {upcomingSalesVisits.map(v => (
                  <View key={v.id} style={styles.upcomingCard}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarMiniText}>{v.customerName?.charAt(0) || 'C'}</Text>
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
                    <TouchableOpacity style={styles.doneBtn} onPress={() => completeVisit(v.id, true)} disabled={updating === v.id}>
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

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{filter === "All" ? "All Visits" : filter}</Text>
              </View>

              {paginatedList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No visits found</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {paginatedList.map((v, i) => {
                    const isCompleted = v.status === 'Visit Completed' || v.status === 'Booked' || v.status === 'Payment Done';
                    const iconColor = isCompleted ? '#22c55e' : (v.status === 'Cancelled' ? '#f87171' : '#3b82f6');
                    const Icon = isCompleted ? CheckCircle : (v.status === 'Cancelled' ? XCircle : Clock);

                    return (
                      <View key={v.id || i} style={styles.visitRow}>
                        <View style={styles.visitHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                            <View style={styles.statusIconWrap}>
                              <Icon size={20} color={iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.visitName} numberOfLines={1}>{v.customerName}</Text>
                              {v.mobile && <Text style={styles.custPhone}>{v.mobile}</Text>}
                            </View>
                          </View>
                          <StatusBadge status={v.status} />
                        </View>
                        
                        <View style={styles.custMeta}>
                          <View style={styles.metaCol}>
                            <View style={styles.metaRow}>
                              <MapPin size={10} color={colors.slate400} />
                              <Text style={styles.metaText}>{v.siteName}</Text>
                            </View>
                          </View>
                          <View style={styles.metaCol}>
                            <View style={styles.metaRow}>
                              <Calendar size={10} color={colors.slate400} />
                              <Text style={styles.metaText}>{v.visitDate} {v.visitTime ? `at ${v.visitTime}` : ''}</Text>
                            </View>
                          </View>
                        </View>

                        {v.status === "Visit Scheduled" && (
                          <TouchableOpacity 
                            style={[styles.markDoneBtn, { marginTop: 12 }]} 
                            onPress={() => completeVisit(v.id, true)} 
                            disabled={updating === v.id}
                          >
                            {updating === v.id ? <ActivityIndicator size="small" color="#15803d" /> : (
                              <>
                                <CheckCircle size={14} color="#15803d" />
                                <Text style={styles.markDoneText}>Mark as Completed</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
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
          </>
        )}
      </ScrollView>

      {/* DROPDOWN FILTER MODAL */}
      <RNModal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Status</Text>
            {["All", ...STATUS_OPTIONS].map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.dropdownItem, filter === s && styles.dropdownItemActive]}
                onPress={() => { setFilter(s); setCurrentPage(1); setDropdownOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, filter === s && styles.dropdownItemTextActive]}>{s === "All" ? "All Status" : s}</Text>
                {filter === s && <CheckCircle size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* VIEW & EDIT MODALS */}
      <RNModal visible={modalType !== null} transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalType === 'view' ? 'Visit Details' : 'Update Visit'}</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.modalClose}>
                <X size={20} color={colors.slate500} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedVisit && modalType === 'view' && (
                <View style={styles.viewModalContent}>
                  <View style={styles.viewHeader}>
                    <View style={styles.viewAvatar}>
                      <Text style={styles.viewAvatarText}>{selectedVisit.customer?.name?.charAt(0) || 'C'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.viewName}>{selectedVisit.customer?.name}</Text>
                      <Text style={styles.viewPhone}>{selectedVisit.customer?.phone}</Text>
                    </View>
                    <StatusBadge status={selectedVisit.status} />
                  </View>
                  
                  <View style={styles.viewDetailsBox}>
                    {[
                      { label: 'Project', value: selectedVisit.projectName || selectedVisit.project?.name },
                      { label: 'Site', value: `Site ${selectedVisit.siteNo || selectedVisit.site?.siteNo}` },
                      { label: 'Visit Date', value: formatDate(selectedVisit.visitDate) },
                      { label: 'Visit Time', value: formatTime(selectedVisit.visitTime) },
                      { label: 'Persons', value: selectedVisit.persons },
                      { label: 'Purchase Mode', value: selectedVisit.purchaseMode },
                      { label: 'Pickup Location', value: selectedVisit.pickupLocation, isLink: true },
                      { label: 'User', value: selectedVisit.assignedToUser?.name || '—' },
                      { label: 'Notes', value: selectedVisit.notes },
                    ].map((item, idx) => (
                      <View key={idx} style={styles.viewDetailRow}>
                        <Text style={styles.viewDetailLabel}>{item.label}</Text>
                        {item.isLink && item.value ? (
                          <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.value)}`)}>
                            <Text style={[styles.viewDetailValue, { color: colors.primary, textDecorationLine: 'underline' }]}>{item.value} ↗</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.viewDetailValue}>{item.value || '—'}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                  
                  {(selectedVisit.driverName || selectedVisit.driverMobile || selectedVisit.cabNumber) && (
                    <View style={styles.driverBox}>
                      <Text style={styles.driverTitle}>DRIVER DETAILS</Text>
                      {selectedVisit.driverName && (
                        <View style={styles.driverRow}>
                          <Text style={styles.driverLabel}>Name</Text>
                          <Text style={styles.driverVal}>{selectedVisit.driverName}</Text>
                        </View>
                      )}
                      {selectedVisit.driverMobile && (
                        <View style={styles.driverRow}>
                          <Text style={styles.driverLabel}>Mobile</Text>
                          <Text style={styles.driverVal}>{selectedVisit.driverMobile}</Text>
                        </View>
                      )}
                      {selectedVisit.cabNumber && (
                        <View style={styles.driverRow}>
                          <Text style={styles.driverLabel}>Cab</Text>
                          <Text style={styles.driverVal}>{selectedVisit.cabNumber}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {selectedVisit && modalType === 'edit' && (
                <View style={styles.editModalContent}>
                  <View style={styles.editHeader}>
                    <View style={styles.viewAvatar}>
                      <Text style={styles.viewAvatarText}>{selectedVisit.customer?.name?.charAt(0) || 'C'}</Text>
                    </View>
                    <View>
                      <Text style={styles.viewName}>{selectedVisit.customer?.name}</Text>
                      <Text style={styles.viewPhone}>Site {selectedVisit.siteNo || selectedVisit.site?.siteNo}</Text>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Current Status</Text>
                  <View style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
                    <StatusBadge status={selectedVisit.status} />
                  </View>

                  <Text style={styles.inputLabel}>Update Status</Text>
                  <View style={styles.modalDropdownWrap}>
                    <TouchableOpacity 
                      style={styles.modalDropdownBtn} 
                      onPress={() => setEditStatusDropdownOpen(!editStatusDropdownOpen)}
                    >
                      <Text style={styles.modalDropdownBtnText}>{editForm.status || 'Select Status'}</Text>
                      <ChevronDown size={16} color={colors.slate400} />
                    </TouchableOpacity>
                    {editStatusDropdownOpen && (
                      <View style={styles.modalDropdownList}>
                        {STATUS_OPTIONS.map(s => (
                          <TouchableOpacity 
                            key={s} 
                            style={styles.modalDropdownItem}
                            onPress={() => {
                              setEditForm({ ...editForm, status: s });
                              setEditStatusDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.modalDropdownItemText, editForm.status === s && styles.modalDropdownItemTextActive]}>{s}</Text>
                            {editForm.status === s && <CheckCircle size={14} color={colors.primary} />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.divider} />
                  <Text style={styles.driverSectionTitle}>Driver Details (Optional)</Text>

                  <Text style={styles.inputLabel}>Driver Name</Text>
                  <TextInput 
                    style={styles.modalInput}
                    placeholder="Enter driver name"
                    value={editForm.driverName}
                    onChangeText={t => {
                      const hasDriver = t || editForm.driverMobile || editForm.cabNumber;
                      setEditForm({...editForm, driverName: t, status: hasDriver ? "Visit Scheduled" : (selectedVisit.status || 'Interested')});
                    }}
                  />

                  <Text style={styles.inputLabel}>Driver Mobile</Text>
                  <TextInput 
                    style={styles.modalInput}
                    placeholder="Driver mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={editForm.driverMobile}
                    onChangeText={t => {
                      const hasDriver = editForm.driverName || t || editForm.cabNumber;
                      setEditForm({...editForm, driverMobile: t, status: hasDriver ? "Visit Scheduled" : (selectedVisit.status || 'Interested')});
                    }}
                  />

                  <Text style={styles.inputLabel}>Cab Number</Text>
                  <TextInput 
                    style={styles.modalInput}
                    placeholder="Cab/Vehicle number"
                    value={editForm.cabNumber}
                    onChangeText={t => {
                      const hasDriver = editForm.driverName || editForm.driverMobile || t;
                      setEditForm({...editForm, cabNumber: t, status: hasDriver ? "Visit Scheduled" : (selectedVisit.status || 'Interested')});
                    }}
                  />

                  <TouchableOpacity 
                    style={[styles.saveBtn, savingEdit && { opacity: 0.7 }]}
                    onPress={saveEditVisit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, paddingBottom: 100 },
  
  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: colors.slate900 },
  pageSub: { fontSize: 13, color: colors.slate400, marginTop: 2 },
  
  // PWA Table & Dropdown Styles
  pwaHeader: { padding: 12, borderBottomWidth: 1, borderColor: colors.slate100, gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 12, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate800 },
  searchClear: { padding: 4 },
  
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 12, height: 40 },
  dropdownBtnText: { fontSize: 13, fontWeight: '500', color: colors.slate600 },
  
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownBox: { width: '100%', maxWidth: 300, backgroundColor: colors.white, borderRadius: 16, padding: 8, elevation: 5 },
  dropdownTitle: { fontSize: 14, fontWeight: 'bold', color: colors.slate800, padding: 12, borderBottomWidth: 1, borderColor: colors.slate100, marginBottom: 8 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8 },
  dropdownItemActive: { backgroundColor: colors.blue50 },
  dropdownItemText: { fontSize: 13, color: colors.slate600 },
  dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },

  tableScroll: { flexDirection: 'row' },
  tableContainer: { paddingBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.slate50, borderBottomWidth: 1, borderTopWidth: 1, borderColor: colors.slate100 },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 10, fontWeight: 'bold', color: colors.slate500, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.slate50, alignItems: 'center' },
  td: { paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
  tdName: { fontSize: 13, fontWeight: 'bold', color: colors.slate800, marginBottom: 2 },
  tdText: { fontSize: 13, color: colors.slate700, marginBottom: 2 },
  tdSub: { fontSize: 11, color: colors.slate400 },
  
  actionBtnBlue: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.blue50, justifyContent: 'center', alignItems: 'center' },
  actionBtnOrange: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center' },

  // Standard Styles
  filterScroll: { marginBottom: 16 },
  filterScrollContent: { paddingRight: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  filterChipTextActive: { color: colors.white },
  
  upcomingBox: { backgroundColor: colors.primarySoft || '#eff6ff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#dbeafe' },
  upcomingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  upcomingTitle: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  upcomingCard: { backgroundColor: colors.white, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  ucName: { fontSize: 14, fontWeight: 'bold', color: colors.slate800, marginBottom: 2 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  iconText: { fontSize: 10, color: colors.slate500 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  doneBtnText: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },

  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden' },
  cardHeader: { padding: 16, paddingBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: colors.slate400, textTransform: 'uppercase' },
  
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.slate400, fontWeight: '500' },
  
  list: { borderTopWidth: 1, borderColor: colors.slate50 },
  visitRow: { padding: 16, borderBottomWidth: 1, borderColor: colors.slate50 },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statusIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.slate50, justifyContent: 'center', alignItems: 'center' },
  visitName: { fontSize: 15, fontWeight: 'bold', color: colors.slate800, marginBottom: 2 },
  custPhone: { fontSize: 12, color: colors.slate400 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  
  custMeta: { flexDirection: 'row', backgroundColor: colors.slate50, borderRadius: 8, padding: 10, gap: 16 },
  metaCol: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: colors.slate600, fontWeight: '500' },
  
  markDoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingVertical: 12, borderRadius: 12 },
  markDoneText: { fontSize: 13, fontWeight: 'bold', color: '#15803d' },
  
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: colors.slate100 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 8, backgroundColor: colors.slate50 },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  pageNumbers: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  pageNumberText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },

  // Modal Styles
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
  
  viewDetailsBox: { backgroundColor: colors.slate50, borderRadius: 12, padding: 16, gap: 12 },
  viewDetailRow: { },
  viewDetailLabel: { fontSize: 11, fontWeight: '700', color: colors.slate400, textTransform: 'uppercase', marginBottom: 2 },
  viewDetailValue: { fontSize: 13, color: colors.slate800, fontWeight: '500' },
  
  driverBox: { backgroundColor: colors.blue50, borderRadius: 12, padding: 16, marginTop: 16, gap: 8 },
  driverTitle: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  driverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverLabel: { fontSize: 13, color: colors.slate500 },
  driverVal: { fontSize: 13, fontWeight: '600', color: colors.slate800 },

  editModalContent: { paddingBottom: 20 },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.slate50, padding: 12, borderRadius: 12, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.slate700, marginBottom: 6 },
  
  modalDropdownWrap: { marginBottom: 16 },
  modalDropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 14, height: 48 },
  modalDropdownBtnText: { fontSize: 14, color: colors.slate800 },
  modalDropdownList: { marginTop: 4, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, overflow: 'hidden' },
  modalDropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: colors.slate50 },
  modalDropdownItemText: { fontSize: 14, color: colors.slate700 },
  modalDropdownItemTextActive: { color: colors.primary, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: colors.slate100, marginVertical: 16 },
  driverSectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.slate800, marginBottom: 16 },
  modalInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14, color: colors.slate800, marginBottom: 16 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: 'bold' }
});
