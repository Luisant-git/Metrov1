import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Building2, ChevronRight, X, LayoutGrid, FileText, Download, ChevronLeft, Image as LucideImage } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { site as siteApi } from '../services/site';
import TopBar from '../components/TopBar';

export default function SitesScreen({ navigation }) {
  const toast = useToast();
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  
  const [selectedSite, setSelectedSite] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await siteApi.getAll();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setSites(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load sites');
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSites();
    });
    return unsubscribe;
  }, [navigation, fetchSites]);

  const filteredSites = useMemo(() => {
    let result = sites.filter(s => s.status === 'Active');
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      result = result.filter(site => 
        site.name?.toLowerCase().includes(s) ||
        site.location?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [sites, search]);

  const openGallery = (site, initialIdx = 0) => {
    setSelectedSite(site);
    setImgIdx(initialIdx);
    setGalleryOpen(true);
  };

  const nextImg = () => {
    if (!selectedSite?.images?.length) return;
    setImgIdx(i => (i + 1) % selectedSite.images.length);
  };

  const prevImg = () => {
    if (!selectedSite?.images?.length) return;
    setImgIdx(i => (i - 1 + selectedSite.images.length) % selectedSite.images.length);
  };

  const renderSiteCard = ({ item }) => {
    const defaultImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80';
    const imageUri = item.images?.[0] || defaultImage;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.9} 
        onPress={() => setSelectedSite(item)}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.cardImage} />
          <View style={styles.badgeTopRight}>
            <Text style={styles.badgeTopRightText}>{item.availablePlots || 0} available</Text>
          </View>
          {item.images?.length > 1 && (
            <TouchableOpacity 
              style={styles.galleryBtn} 
              onPress={() => openGallery(item)}
            >
              <LucideImage size={18} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.slate400} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
            </View>
          </View>
          
          {item.pricePerSqft > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>₹{Number(item.pricePerSqft).toLocaleString('en-IN')}</Text>
              <Text style={styles.priceUnit}>/sqft</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGalleryModal = () => {
    if (!galleryOpen || !selectedSite) return null;
    const defaultImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80';
    const imageUri = selectedSite.images?.[imgIdx] || defaultImage;
    const totalImgs = selectedSite.images?.length || 1;

    return (
      <Modal visible={galleryOpen} animationType="fade" transparent={true} onRequestClose={() => setGalleryOpen(false)}>
        <View style={styles.galleryOverlay}>
          <TouchableOpacity style={styles.galleryClose} onPress={() => setGalleryOpen(false)}>
            <X size={28} color={colors.white} />
          </TouchableOpacity>
          
          <View style={styles.galleryCenter}>
            <Image source={{ uri: imageUri }} style={styles.galleryImage} resizeMode="contain" />
          </View>

          <View style={styles.galleryBottomNav}>
            <View style={styles.galleryNavControls}>
              <TouchableOpacity onPress={prevImg} style={styles.galleryNavBtn}>
                <ChevronLeft size={24} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.galleryNavText}>{imgIdx + 1} / {totalImgs}</Text>
              <TouchableOpacity onPress={nextImg} style={styles.galleryNavBtn}>
                <ChevronRight size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.gallerySiteName} numberOfLines={1}>{selectedSite.name}</Text>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDetailModal = () => {
    if (!selectedSite || galleryOpen) return null;
    const defaultImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80';
    // Inside detail modal we might want to just show the first image or let them slide through
    const imageUri = selectedSite.images?.[imgIdx] || defaultImage;
    const activePlots = selectedSite.plots?.filter(p => p.status === 'Active') || [];
    const totalImgs = selectedSite.images?.length || 1;

    return (
      <Modal visible={!!selectedSite && !galleryOpen} animationType="slide" transparent={true} onRequestClose={() => setSelectedSite(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Project Overview</Text>
              <TouchableOpacity onPress={() => setSelectedSite(null)}>
                <X size={24} color={colors.slate600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setGalleryOpen(true)} style={styles.modalImageWrap}>
                <Image source={{ uri: imageUri }} style={styles.modalImage} />
                {totalImgs > 1 && (
                  <>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); prevImg(); }} style={styles.modalImgNavLeft}>
                      <ChevronLeft size={20} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); nextImg(); }} style={styles.modalImgNavRight}>
                      <ChevronRight size={20} color={colors.white} />
                    </TouchableOpacity>
                    <View style={styles.modalImgCounter}>
                      <Text style={styles.modalImgCounterText}>{imgIdx + 1} / {totalImgs}</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
              
              {totalImgs > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsWrap}>
                  {selectedSite.images.map((img, i) => (
                    <TouchableOpacity key={i} onPress={() => setImgIdx(i)} style={[styles.thumbnailBtn, i === imgIdx && styles.thumbnailBtnActive]}>
                      <Image source={{ uri: img }} style={styles.thumbnailImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalInfoWrap}>
                <View style={[styles.badge, { backgroundColor: '#dcfce7', alignSelf: 'flex-start', marginBottom: 8 }]}>
                  <Text style={[styles.badgeText, { color: '#15803d' }]}>{selectedSite.status}</Text>
                </View>
                <Text style={styles.modalSiteName}>{selectedSite.name}</Text>
                <View style={styles.locationRowModal}>
                  <MapPin size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.locationTextModal}>{selectedSite.location}</Text>
                </View>
              </View>

              {activePlots.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <LayoutGrid size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>Available Plots</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 40}]}>S.No</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 50}]}>Site</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 70}]}>Facing</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 60}]}>E-W</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 60}]}>N-S</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 75}]}>Total Sqft</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 75}]}>Price/sqft</Text>
                        <Text style={[styles.tableCell, styles.tableHeadText, {width: 70}]}>Status</Text>
                      </View>
                      {activePlots.map((pl, idx) => (
                        <View key={pl.id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, {width: 40}]}>{idx + 1}</Text>
                          <Text style={[styles.tableCell, styles.tableCellBold, {width: 50}]}>{pl.siteNo}</Text>
                          <Text style={[styles.tableCell, {width: 70}]}>{pl.facing || "—"}</Text>
                          <Text style={[styles.tableCell, {width: 60}]}>{pl.eastWest ? `${pl.eastWest} ft` : "—"}</Text>
                          <Text style={[styles.tableCell, {width: 60}]}>{pl.northSouth ? `${pl.northSouth} ft` : "—"}</Text>
                          <Text style={[styles.tableCell, styles.tableCellBold, {width: 75}]}>{Number(pl.totalSqft).toLocaleString("en-IN")}</Text>
                          <Text style={[styles.tableCell, {width: 75}]}>₹{Number(pl.pricePerSqft).toLocaleString("en-IN")}</Text>
                          <Text style={[styles.tableCell, {width: 70, color: '#15803d', fontWeight: 'bold'}]}>{pl.status}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {selectedSite.description && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <FileText size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>Description</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedSite.description}</Text>
                </View>
              )}

              {selectedSite.documents && selectedSite.documents.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <FileText size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>Brochures & Documents</Text>
                  </View>
                  {selectedSite.documents.map((doc, idx) => (
                    <TouchableOpacity key={idx} style={styles.docRow} onPress={() => {
                      import('react-native').then(rn => rn.Linking.openURL(doc.url || doc));
                    }}>
                      <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                        <View style={styles.docIconBox}>
                          <FileText size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.docName} numberOfLines={1}>{doc.name || `Document ${idx+1}`}</Text>
                      </View>
                      <Download size={18} color={colors.slate400} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />
      <View style={styles.container}>
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <Search size={18} color={colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sites…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate400}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredSites}
            keyExtractor={item => String(item.id)}
            renderItem={renderSiteCard}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Building2 size={48} color={colors.slate300} />
                <Text style={styles.emptyText}>No sites found</Text>
              </View>
            }
          />
        )}
      </View>
      {renderDetailModal()}
      {renderGalleryModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.slate50 },
  
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, margin: 16, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.slate200, height: 48, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  searchWrapFocused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: '#eff6ff' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate800 },
  
  flatListContent: { paddingHorizontal: 16, paddingBottom: 20 },
  
  card: { backgroundColor: colors.white, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.slate100, overflow: 'hidden', shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  imageContainer: { width: '100%', height: 180, position: 'relative', backgroundColor: colors.slate100 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeTopRight: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTopRightText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  galleryBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 },
  
  cardBody: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.slate900, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 12, color: colors.slate400, marginLeft: 4 },
  
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  priceValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  priceUnit: { fontSize: 12, color: colors.slate400, marginLeft: 2 },
  
  cardFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.slate100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  viewDetailsText: { fontSize: 14, fontWeight: '600', color: colors.primary, marginRight: 4 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.slate400, marginTop: 16, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.slate900 },
  
  modalImageWrap: { height: 220, width: '100%', backgroundColor: colors.slate100, position: 'relative' },
  modalImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalImgNavLeft: { position: 'absolute', left: 8, top: '50%', marginTop: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalImgNavRight: { position: 'absolute', right: 8, top: '50%', marginTop: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalImgCounter: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalImgCounterText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  
  thumbnailsWrap: { padding: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  thumbnailBtn: { width: 64, height: 48, borderRadius: 6, overflow: 'hidden', marginRight: 8, borderWidth: 2, borderColor: 'transparent', opacity: 0.6 },
  thumbnailBtnActive: { borderColor: colors.primary, opacity: 1 },
  thumbnailImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  modalInfoWrap: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  modalSiteName: { fontSize: 24, fontWeight: 'bold', color: colors.slate900, marginBottom: 8 },
  locationRowModal: { flexDirection: 'row', alignItems: 'center' },
  locationTextModal: { fontSize: 14, color: colors.slate500 },
  
  sectionContainer: { margin: 20, marginBottom: 0, padding: 16, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate200 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: colors.slate500, textTransform: 'uppercase' },
  
  descriptionText: { fontSize: 14, color: colors.slate700, lineHeight: 22 },
  
  tableScroll: { paddingBottom: 8 },
  table: { width: 330 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.slate50, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  tableCell: { fontSize: 12, color: colors.slate600 },
  tableHeadText: { fontWeight: '700', color: colors.slate500 },
  tableCellBold: { fontWeight: '600', color: colors.slate800 },
  
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.slate50, borderRadius: 12, marginBottom: 8 },
  docIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  docName: { fontSize: 13, fontWeight: '600', color: colors.slate800 },

  // Full Screen Gallery Styles
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  galleryClose: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 8 },
  galleryCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  galleryImage: { width: '100%', height: '100%' },
  galleryBottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  galleryNavControls: { flexDirection: 'row', alignItems: 'center' },
  galleryNavBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  galleryNavText: { color: colors.white, fontSize: 14, fontWeight: '600', marginHorizontal: 12 },
  gallerySiteName: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', maxWidth: '50%' }
});
