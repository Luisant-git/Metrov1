import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Field, AppTextInput, AppTextArea } from '../components/FormField';
import { RadioGroup } from '../components/RadioGroup';
import { SuccessModal } from '../components/SuccessModal';
import * as Location from 'expo-location';
import ProjectPicker from '../components/ProjectPicker';
import SitePicker from '../components/SitePicker';
import TopBar from '../components/TopBar';
import { site as siteApi } from '../services/site';
import { customer as customerApi } from '../services/customer';
import { siteVisit as siteVisitApi } from '../services/siteVisit';
import { mapsService } from '../services/maps';

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00',
];

const formatSlot = (slot) => {
  const [hour, minute] = slot.split(':').map(Number);
  const suffix = hour === 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const occupations = [
  { label: 'Self Employed', value: 'Self Employed' },
  { label: 'Salaried', value: 'Salaried' },
  { label: 'Business', value: 'Business' },
];

const ROLE_LABELS = {
  Admin: 'Admin',
  Director: 'Director',
  'Regional Manager': 'Reg. Manager',
  'Branch Manager': 'Branch Manager',
  BDM: 'Business Dev. Manager',
  'Sales Manager': 'Sales Manager',
};

const purchaseModes = [
  { label: 'Own Funding', value: 'Own Funding' },
  { label: 'Loan', value: 'Loan' },
];

const pad2 = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function buildDateOptions(count = 30) {
  const options = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    options.push({
      value: toISODate(d),
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    });
  }
  return options;
}

export default function SiteVisitScreen({ navigation }) {
  const { user, logout } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', address: '', pinCode: '', occupation: '',
    projectId: '', siteId: '', visitDate: '', visitTime: '09:00',
    persons: '', purchaseMode: 'Own Funding', location: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [locLoading, setLocLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);

  const otpTimerRef = useRef(null);

  const dateOptions = useMemo(() => buildDateOptions(30), []);

  const selectedProject = useMemo(() => sites.find((s) => s.id === Number(form.projectId)), [sites, form.projectId]);
  const availablePlots = useMemo(() => (selectedProject?.plots || []).filter((p) => p.status === 'Active'), [selectedProject]);
  const selectedSite = useMemo(() => availablePlots.find((p) => p.id === Number(form.siteId)), [availablePlots, form.siteId]);

  const handleLocationInputChange = async (val) => {
    setField('location', val);
    if (val && val.trim().length > 2) {
      try {
        const res = await mapsService.getAutocomplete(val);
        if (res?.suggestions) {
          setSuggestions(res.suggestions);
          setShowSuggestions(true);
        }
      } catch (err) {
        // ignore
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (sug) => {
    const text = sug.description || sug.main_text || sug.formatted_address;
    setField('location', text);
    setShowSuggestions(false);
    try {
      const geocodeRes = await mapsService.geocode(text);
      if (geocodeRes?.formatted_address) {
        setField('location', geocodeRes.formatted_address);
      }
    } catch (err) {
      // ignore
    }
  };

  const getLocation = async () => {
    setLocLoading(true);
    try {
      let coords = null;

      // Web fallback: sometimes expo-location permissions fail silently on browsers
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          coords = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
        } catch (e) {
          // Ignore and fallback to expo-location
        }
      }

      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          toast.error('Location permission denied. Please enable it in browser/device settings.');
          setLocLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      }

      const latlngStr = `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
      try {
        const geoRes = await mapsService.geocode(null, latlngStr);
        if (geoRes?.formatted_address) {
          setField('location', geoRes.formatted_address);
          toast.success('GPS location captured!');
        } else {
          setField('location', latlngStr);
          toast.success('GPS coordinates captured!');
        }
      } catch (e) {
        setField('location', latlngStr);
        toast.success('GPS coordinates captured!');
      }
    } catch (err) {
      toast.error('Unable to fetch GPS location. Please enter address manually.');
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    const calcDist = async () => {
      if (form.location && form.location.trim().length > 3 && selectedProject?.location) {
        setDistLoading(true);
        try {
          const res = await mapsService.calculateDistance(form.location, selectedProject.location);
          if (res && res.success) {
            setDistanceInfo(res);
          } else {
            setDistanceInfo(null);
          }
        } catch (err) {
          setDistanceInfo(null);
        } finally {
          setDistLoading(false);
        }
      } else {
        setDistanceInfo(null);
      }
    };
    const timer = setTimeout(calcDist, 600);
    return () => clearTimeout(timer);
  }, [form.location, selectedProject]);

  const fetchSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const list = await siteApi.getAll();
      setSites(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoadingSites(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, []);

  const startOtpTimer = () => {
    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    const expiresAt = Date.now() + 300000;
    setTimeLeft(300);
    otpTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
        setOtpSent(false);
        setOtp('');
        toast.info('OTP expired. Please request a new one.');
      }
    }, 1000);
  };



  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const sendOtp = async () => {
    if (!form.mobile || form.mobile.length !== 10) {
      setErrors((p) => ({ ...p, mobile: 'Enter valid 10-digit mobile number' }));
      toast.error('Enter valid 10-digit mobile number');
      return;
    }

    setSendingOtp(true);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp('');
    try {
      // Preload existing customer details if any (duplicate check)
      try {
        const dup = await customerApi.checkDuplicate(form.mobile, form.email || null);
        if (dup?.duplicate && dup?.message?.exists && dup?.message?.customer) {
          const existing = dup.message.customer;
          setForm((p) => ({
            ...p,
            name: existing.name || p.name,
            email: existing.email || p.email,
            address: existing.address || p.address,
            pinCode: existing.pinCode || p.pinCode,
            occupation: existing.occupation || p.occupation,
          }));
        }
      } catch (e) {
        // proceed anyway
      }
      await customerApi.requestOtp(form.mobile);
      toast.success('OTP sent to your mobile via WhatsApp!');
      setOtpSent(true);
      setErrors((p) => {
        const next = { ...p };
        delete next.mobile;
        return next;
      });
      startOtpTimer();
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyCustomerOtp = async () => {
    if (otp.length !== 4) {
      toast.error('Please enter the 4-digit OTP');
      return;
    }
    setVerifyingOtp(true);
    try {
      await customerApi.verifyOtp(form.mobile, otp);
      setOtpVerified(true);
      toast.success('Mobile verified!');
      setErrors((p) => {
        const next = { ...p };
        delete next.mobile;
        return next;
      });
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.name) e.name = 'Applicant name is required';
    if (!form.mobile) {
      e.mobile = 'Mobile number is required';
    } else if (form.mobile.length !== 10) {
      e.mobile = 'Enter valid 10-digit mobile number';
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      e.email = 'Enter valid email address';
    }
    if (!form.address) e.address = 'Address is required';
    if (!form.pinCode) {
      e.pinCode = 'Pin code is required';
    } else if (!/^\d{6}$/.test(form.pinCode)) {
      e.pinCode = 'Pin code must be 6 digits';
    }
    if (!form.occupation) e.occupation = 'Occupation is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.projectId) e.projectId = 'Please select a project';
    if (!form.visitDate) e.visitDate = 'Visit date is required';
    if (!form.visitTime) {
      e.visitTime = 'Visit time is required';
    } else {
      const [h, m] = form.visitTime.split(':').map(Number);
      const total = h * 60 + m;
      if (total > 12 * 60) {
        e.visitTime = 'Site visit registration is allowed only until 12:00 PM.';
      }
    }
    if (!form.persons) {
      e.persons = 'Number of persons is required';
    } else if (Number(form.persons) < 1) {
      e.persons = 'At least 1 person required';
    }
    if (!form.purchaseMode) e.purchaseMode = 'Purchase mode is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNextStep = () => {
    setErrors({});
    if (step === 1) {
      if (!validateStep1()) return;
      if (!otpVerified) {
        toast.error('Please verify OTP before proceeding to the next step');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    const s1 = validateStep1();
    const s2 = validateStep2();
    if (!s1 || !s2) {
      setStep(s1 ? 2 : 1);
      toast.error('Please fix the errors below');
      return;
    }
    if (!otpVerified) {
      toast.error('Please verify OTP to continue');
      return;
    }

    setSubmitting(true);
    try {
      const customerPayload = {
        name: form.name,
        email: form.email || undefined,
        mobile: form.mobile,
        address: form.address,
        pinCode: form.pinCode,
        occupation: form.occupation,
        createdBy: user?.id,
      };
      const createdCustomer = await customerApi.registerCustomer(customerPayload);

      const visitPayload = {
        customerId: createdCustomer?.id ?? createdCustomer?.data?.id,
        projectId: Number(form.projectId),
        ...(form.siteId ? { siteId: Number(form.siteId) } : {}),
        visitDate: form.visitDate,
        visitTime: form.visitTime || '09:00',
        persons: Number(form.persons),
        pickupLocation: form.location,
        purchaseMode: form.purchaseMode,
        notes: form.notes,
        status: 'Interested',
        assignedTo: user?.id,
        driverName: '',
        driverMobile: '',
        cabNumber: '',
      };

      await siteVisitApi.create(visitPayload);
      setSuccessOpen(true);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '', mobile: '', email: '', address: '', pinCode: '', occupation: '',
      projectId: '', siteId: '', visitDate: '', visitTime: '09:00',
      persons: '', purchaseMode: 'Own Funding', location: '', notes: '',
    });
    setOtp(''); setOtpSent(false); setOtpVerified(false);
    setErrors({});
    setStep(1);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loadingSites) {
    return (
      <SafeAreaView style={styles.centerSafe}>
        <StatusBar barStyle="light-content" backgroundColor="#1D6FB9" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading projects…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1D6FB9" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pageShell}>
          <TopBar />

          <View style={styles.contentCard}>
            <View style={styles.contentHeader}>
              {/* Page heading */}
              <Text style={styles.pageTitle}>Customer Registration</Text>
              <Text style={styles.pageSubtitle}>Register new customer and schedule site visit</Text>

              {/* Stepper */}
              <View style={styles.stepper}>
                {[1, 2, 3].map((s) => (
                  <View key={s} style={styles.stepFlex}>
                    <View style={[styles.stepBar, s <= step ? styles.stepBarActive : null]} />
                    <View style={[styles.stepDot, s <= step ? styles.stepDotActive : styles.stepDotInactive]}>
                      {s < step ? (
                        <Text style={styles.stepDotTextActive}>✓</Text>
                      ) : (
                        <Text style={s <= step ? styles.stepDotTextActive : styles.stepDotText}>{s}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.stepTitle}>
                {step === 1 ? 'Personal Info & Occupation' : step === 2 ? 'Visit Details' : 'Review & Submit'}
              </Text>
            </View>

          <ScrollView
            style={styles.scroller}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
              {/* STEP 1 */}
              {step === 1 && (
                <View>
                  <View style={styles.bannerBlue}>
                    <Ionicons name="person-outline" size={14} color={colors.blue700} />
                    <Text style={styles.bannerText}>Enter customer details</Text>
                  </View>

              <Field label="Applicant Name" required error={errors.name} icon={<Ionicons name="person-outline" size={14} color={colors.gray400} />}>
                <AppTextInput
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  placeholder="Full name"
                  error={!!errors.name}
                />
              </Field>

              <Field label="Mobile Number" required error={errors.mobile} icon={<Ionicons name="call-outline" size={14} color={colors.gray400} />}>
                <View style={styles.mobileRow}>
                  <View style={styles.mobileInputWrap}>
                    <AppTextInput
                      value={form.mobile}
                      onChangeText={(v) => setField('mobile', v.replace(/[^\d]/g, ''))}
                      placeholder="10-digit number"
                      keyboardType="number-pad"
                      maxLength={10}
                      editable={!otpVerified}
                      error={!!errors.mobile}
                    />
                  </View>
                  {!otpVerified && (
                    <Pressable
                      onPress={sendOtp}
                      disabled={sendingOtp}
                      style={[styles.smallBtn, styles.otpBtn, sendingOtp && styles.disabledBtn]}>
                      {sendingOtp ? (
                        <ActivityIndicator size="small" color={colors.primaryDark} />
                      ) : (
                        <Text style={styles.otpBtnText}>Get OTP</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </Field>

              {otpSent && !otpVerified && (
                <Field label="Enter OTP" required>
                  <View style={styles.mobileRow}>
                    <View style={styles.mobileInputWrap}>
                      <AppTextInput
                        value={otp}
                        onChangeText={(v) => setOtp(v.replace(/[^\d]/g, ''))}
                        placeholder="Enter 4-digit OTP"
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                    <Pressable
                      onPress={verifyCustomerOtp}
                      disabled={verifyingOtp}
                      style={[styles.smallBtn, styles.verifyBtn, verifyingOtp && styles.disabledBtn]}>
                      {verifyingOtp ? (
                        <ActivityIndicator size="small" color={colors.green700} />
                      ) : (
                        <Text style={styles.verifyBtnText}>Verify</Text>
                      )}
                    </Pressable>
                  </View>
                  {timeLeft > 0 && (
                    <Text style={[styles.otpExpiry, timeLeft <= 30 ? styles.otpExpiryWarning : null]}>
                      OTP expires in {Math.floor(timeLeft / 60)}:{pad2(timeLeft % 60)}
                    </Text>
                  )}
                </Field>
              )}

              {otpVerified && (
                <View style={styles.verifiedBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.green600} />
                  <Text style={styles.verifiedText}>Mobile verified ✓</Text>
                </View>
              )}

              <Field label="Email" error={errors.email}>
                <AppTextInput
                  value={form.email}
                  onChangeText={(v) => setField('email', v)}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={!!errors.email}
                />
              </Field>

              <Field label="Address" required error={errors.address} icon={<Ionicons name="location-outline" size={14} color={colors.gray400} />}>
                <AppTextArea
                  value={form.address}
                  onChangeText={(v) => setField('address', v)}
                  placeholder="Full address"
                  error={!!errors.address}
                  numberOfLines={3}
                />
              </Field>

              <Field label="Pin Code" required error={errors.pinCode}>
                <AppTextInput
                  value={form.pinCode}
                  onChangeText={(v) => setField('pinCode', v.replace(/[^\d]/g, ''))}
                  placeholder="6-digit pin code"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={!!errors.pinCode}
                />
              </Field>

              <Field label="Occupation" required error={errors.occupation} icon={<Ionicons name="briefcase-outline" size={14} color={colors.gray400} />}>
                <RadioGroup
                  options={occupations}
                  value={form.occupation}
                  onChange={(v) => setField('occupation', v)}
                  columns={3}
                />
              </Field>
            </View>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <View>
              <View style={styles.bannerGreen}>
                <Ionicons name="business-outline" size={14} color={colors.green700} />
                <Text style={styles.bannerTextGreen}>Visit & purchase details</Text>
              </View>

              <Field label="Select Project" required error={errors.projectId}>
                <Pressable onPress={() => setProjectPickerOpen(true)} style={[styles.pickerBox, projectPickerOpen && styles.pickerBoxActive]}>
                  {selectedProject ? (
                    <Text style={styles.pickerValue}>{selectedProject.name} — {selectedProject.location}</Text>
                  ) : (
                    <Text style={styles.pickerPlaceholder}>Choose project…</Text>
                  )}
                  <Text style={styles.pickerCaret}>⌄</Text>
                </Pressable>
              </Field>

              {selectedProject && (
                <View style={styles.projectInfoCard}>
                  <Image 
                    source={{ uri: selectedProject.images?.[0] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&q=80' }} 
                    style={styles.projectInfoImgPlaceholder} 
                  />
                  <View style={{flex: 1}}>
                    <Text style={styles.projectInfoName}>{selectedProject.name}</Text>
                    <Text style={styles.projectInfoLoc}>{selectedProject.location}</Text>
                    <Text style={styles.projectInfoAvail}>{availablePlots.length} available · ₹{selectedProject.basePrice || 0}/sqft</Text>
                  </View>
                </View>
              )}

              {selectedProject && (
                <Field label="Select Site / Plot (optional)" error={errors.siteId}>
                  <Pressable onPress={() => setSitePickerOpen(true)} style={[styles.pickerBox, sitePickerOpen && styles.pickerBoxActive]}>
                    {selectedSite ? (
                      <Text style={styles.pickerValue}>Site {selectedSite.siteNo}</Text>
                    ) : (
                      <Text style={styles.pickerPlaceholder}>Choose site...</Text>
                    )}
                    <Text style={styles.pickerCaret}>⌄</Text>
                  </Pressable>
                </Field>
              )}

              {selectedSite && (
                <View style={styles.siteInfoCard}>
                  <Text style={styles.siteInfoName}>Site {selectedSite.siteNo}</Text>
                  <Text style={styles.siteInfoMeta}>
                    {selectedSite.facing} · {Number(selectedSite.totalSqft).toLocaleString('en-IN')} sqft
                  </Text>
                  <Text style={styles.siteInfoPrice}>
                    ₹{Number(selectedSite.pricePerSqft).toLocaleString('en-IN')}/sqft
                  </Text>
                </View>
              )}

              <Field label="Purchase Mode" required error={errors.purchaseMode} icon={<Ionicons name="cash-outline" size={14} color={colors.gray400} />}>
                <RadioGroup
                  options={purchaseModes}
                  value={form.purchaseMode}
                  onChange={(v) => setField('purchaseMode', v)}
                  columns={2}
                />
              </Field>

              <Field label="Visit Date" required error={errors.visitDate} icon={<Ionicons name="calendar-outline" size={14} color={colors.gray400} />}>
                <Pressable onPress={() => setDatePickerOpen(true)} style={[styles.pickerBox, datePickerOpen && styles.pickerBoxActive]}>
                  {form.visitDate ? (
                    <Text style={styles.pickerValue}>
                      {dateOptions.find((d) => d.value === form.visitDate)?.label || form.visitDate}
                    </Text>
                  ) : (
                    <Text style={styles.pickerPlaceholder}>Choose date…</Text>
                  )}
                  <Text style={styles.pickerCaret}>⌄</Text>
                </Pressable>
              </Field>

              <Field label="Visit Time" required error={errors.visitTime} icon={<Ionicons name="time-outline" size={14} color={colors.gray400} />}>
                <Pressable onPress={() => setTimePickerOpen(true)} style={[styles.pickerBox, timePickerOpen && styles.pickerBoxActive]}>
                  {form.visitTime ? (
                    <Text style={styles.pickerValue}>{formatSlot(form.visitTime)}</Text>
                  ) : (
                    <Text style={styles.pickerPlaceholder}>Choose time…</Text>
                  )}
                  <Text style={styles.pickerCaret}>⌄</Text>
                </Pressable>
              </Field>

              <Field label="Number of Persons" required error={errors.persons} icon={<Ionicons name="people-outline" size={14} color={colors.gray400} />}>
                <AppTextInput
                  value={form.persons}
                  onChangeText={(v) => setField('persons', v.replace(/[^\d]/g, ''))}
                  placeholder="1"
                  keyboardType="number-pad"
                  maxLength={2}
                  error={!!errors.persons}
                />
              </Field>

              <Field label="Pickup Location & Map Route" icon={<Ionicons name="location-outline" size={14} color={colors.gray400} />}>
                <View style={styles.locationRow}>
                  <View style={styles.locationInputWrap}>
                    <AppTextInput
                      value={form.location}
                      onChangeText={handleLocationInputChange}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Search pickup address or area…"
                    />
                  </View>
                  <Pressable
                    onPress={getLocation}
                    disabled={locLoading}
                    style={[styles.smallBtn, styles.gpsBtn, locLoading && styles.disabledBtn]}>
                    {locLoading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <View style={styles.gpsContent}>
                        <Ionicons name="navigate-outline" size={16} color={colors.white} />
                        <Text style={styles.gpsBtnText}>GPS</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Place Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {suggestions.map((sug, idx) => (
                      <Pressable
                        key={sug.place_id || idx}
                        onPress={() => handleSelectSuggestion(sug)}
                        style={styles.suggestionRow}>
                        <Ionicons name="location-sharp" size={14} color={colors.primary} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, marginLeft: 6 }}>
                          <Text style={styles.sugMain}>{sug.main_text || sug.description}</Text>
                          {sug.secondary_text ? <Text style={styles.sugSub}>{sug.secondary_text}</Text> : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Distance & Travel Time Calculation */}
                {(distLoading || distanceInfo) && (
                  <View style={styles.distanceBadgeCard}>
                    <View style={styles.distanceRowLeft}>
                      <Ionicons name="car-outline" size={18} color={colors.primary} />
                      <Text style={styles.distanceLabel}>Route to Project Site:</Text>
                    </View>
                    {distLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : distanceInfo ? (
                      <View style={styles.distanceBadges}>
                        <View style={styles.badgeBlue}>
                          <Text style={styles.badgeBlueText}>
                            {distanceInfo.distanceText || `${distanceInfo.distanceKm} km`}
                          </Text>
                        </View>
                        <View style={styles.badgePurple}>
                          <Text style={styles.badgePurpleText}>
                            ⏱ {distanceInfo.durationText || `${distanceInfo.durationMins} mins`}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Google Map View Box */}
                {form.location ? (
                  <View style={styles.mapCard}>
                    {Platform.OS === 'web' ? (
                      <iframe
                        title="Pickup Location Map"
                        width="100%"
                        height="160"
                        style={{ border: 0, borderRadius: 12 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyAfUP27GUuOL0cBm_ROdjE2n6EyVKesIu8&q=${encodeURIComponent(form.location)}`}
                      />
                    ) : (
                      <View style={styles.mapPlaceholder}>
                        <Ionicons name="map-outline" size={28} color={colors.primary} />
                        <Text style={styles.mapPlaceholderText} numberOfLines={1}>
                          {form.location}
                        </Text>
                      </View>
                    )}
                    <View style={styles.mapFooter}>
                      <View style={styles.mapFooterLeft}>
                        <Ionicons name="location-sharp" size={14} color={colors.red500} />
                        <Text style={styles.mapFooterAddress} numberOfLines={1}>{form.location}</Text>
                      </View>
                      <Pressable
                        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`)}
                        hitSlop={8}>
                        <Text style={styles.openMapLink}>Open Maps ↗</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </Field>

              <Field label="Notes / Requirements" icon={<Ionicons name="document-text-outline" size={14} color={colors.gray400} />}>
                <AppTextArea
                  value={form.notes}
                  onChangeText={(v) => setField('notes', v)}
                  placeholder="Plot size preference, budget, etc."
                  numberOfLines={3}
                />
              </Field>
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View>
              <View style={styles.bannerPurple}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.purple700} />
                <Text style={styles.bannerTextPurple}>Review details before submitting</Text>
              </View>

              <View style={styles.reviewCard}>
                <ReviewRow label="Name" value={form.name} />
                <ReviewRow label="Mobile" value={form.mobile} />
                <ReviewRow label="Email" value={form.email || '—'} />
                <ReviewRow label="Address" value={form.address} />
                <ReviewRow label="Pin Code" value={form.pinCode} />
                <ReviewRow label="Occupation" value={form.occupation} />
                <ReviewRow label="Project" value={selectedProject?.name || '—'} />
                <ReviewRow
                  label="Site / Plot"
                  value={selectedSite ? `Site ${selectedSite.siteNo} (${selectedSite.facing})` : null}
                />
                <ReviewRow label="Purchase Mode" value={form.purchaseMode} />
                <ReviewRow label="Visit Date" value={form.visitDate} />
                <ReviewRow label="Visit Time" value={formatSlot(form.visitTime)} />
                <ReviewRow label="Persons" value={form.persons} />
                <ReviewRow label="Pickup" value={form.location || '—'} />
                <ReviewRow label="Notes" value={form.notes || '—'} />
                <ReviewRow label="User" value={user?.name} sub={user?.employeeCode} />
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  Customer will be registered with status <Text style={styles.noteStrong}>"Interested"</Text>.
                </Text>
              </View>
            </View>
          )}
          </ScrollView>

          {/* Bottom nav buttons - fixed at bottom */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              {step > 1 && <SecondaryButton title="← Back" onPress={() => setStep((s) => s - 1)} style={styles.flexBtn} />}
              {step < 3 ? (
                <PrimaryButton
                  title="Continue →"
                  onPress={handleNextStep}
                  style={[styles.flexBtn, step > 1 ? styles.flexBtnSide : styles.flexBtnFull]}
                />
              ) : (
                <PrimaryButton title="Submit Registration" onPress={handleSubmit} loading={submitting} style={styles.flexBtn} />
              )}
            </View>
          </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <ProjectPicker
        visible={projectPickerOpen}
        projects={sites}
        selectedProjectId={Number(form.projectId)}
        onSelectProject={(p) => {
          setField('projectId', String(p.id));
          setField('siteId', '');
          setProjectPickerOpen(false);
        }}
        onClose={() => setProjectPickerOpen(false)}
      />

      {selectedProject && (
        <SitePicker
          visible={sitePickerOpen}
          plots={availablePlots}
          selectedSiteId={Number(form.siteId)}
          onSelectSite={(siteId) => {
            setField('siteId', String(siteId));
            setSitePickerOpen(false);
          }}
          onClose={() => setSitePickerOpen(false)}
        />
      )}

      <ChoiceModal
        visible={datePickerOpen}
        title="Select Visit Date"
        options={dateOptions}
        selected={form.visitDate}
        onSelect={(v) => { setField('visitDate', v.value); setDatePickerOpen(false); }}
        onClose={() => setDatePickerOpen(false)}
      />

      <ChoiceModal
        visible={timePickerOpen}
        title="Select Visit Time"
        options={timeSlots.map((s) => ({ value: s, label: formatSlot(s) }))}
        selected={form.visitTime}
        onSelect={(v) => { setField('visitTime', v.value); setTimePickerOpen(false); }}
        onClose={() => setTimePickerOpen(false)}
      />

      <SuccessModal
        visible={successOpen}
        title="Registration Successful!"
        message="Customer has been registered and visit scheduled successfully."
        primaryLabel="Done"
        secondaryLabel="Register Another"
        onPrimary={() => { setSuccessOpen(false); resetForm(); }}
        onSecondary={() => { setSuccessOpen(false); resetForm(); }}
      />
    </SafeAreaView>
  );
}

function ReviewRow({ label, value, sub }) {
  if (value === null || value === undefined) return null;
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <View style={styles.reviewValueWrap}>
        <Text style={styles.reviewValue}>{value}</Text>
        {sub ? <Text style={styles.reviewSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function ChoiceModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.choiceList}
            renderItem={({ item }) => {
              const isSelected = selected === item.value;
              return (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={[styles.choiceRow, isSelected ? styles.choiceSelected : null]}>
                  <Text style={isSelected ? styles.choiceTextSelected : styles.choiceText}>
                    {item.label}
                  </Text>
                  <View style={isSelected ? styles.radioOn : styles.radioOff}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
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
  safe: { flex: 1, backgroundColor: colors.primary },
  centerSafe: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.slate500, fontSize: 13, marginTop: 12 },
  flex: { flex: 1, minHeight: 0 },
  pageShell: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#1D6FB9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
    flexShrink: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  headerLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.white, lineHeight: 22 },
  headerSub: { fontSize: 11, color: colors.blue100, marginTop: 2 },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stepFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray100,
  },
  stepBarActive: { backgroundColor: colors.primary },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotInactive: { backgroundColor: colors.gray100 },
  stepDotText: { fontSize: 10, fontWeight: '700', color: colors.gray400 },
  stepDotTextActive: { fontSize: 10, fontWeight: '700', color: colors.white },
  stepTitle: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gray900,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 4,
    marginBottom: 16,
  },
  contentCard: {
    flex: 1,
    minHeight: 0,
  },
  contentHeader: {
    paddingHorizontal: 16,
    flexShrink: 0,
  },
  scroller: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  bannerBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue50,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  bannerText: { color: colors.blue700, fontSize: 12, fontWeight: '600' },
  bannerGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green50,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  bannerTextGreen: { color: colors.green700, fontSize: 12, fontWeight: '600' },
  bannerPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.purple50,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  bannerTextPurple: { color: colors.purple700, fontSize: 12, fontWeight: '600' },
  mobileRow: { flexDirection: 'row', alignItems: 'center' },
  mobileInputWrap: { flex: 1 },
  smallBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  otpBtn: { backgroundColor: colors.blue100 },
  otpBtnText: { color: colors.blue700, fontSize: 13, fontWeight: '700' },
  verifyBtn: { backgroundColor: colors.green100 },
  verifyBtnText: { color: colors.green700, fontSize: 13, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  otpExpiry: { fontSize: 12, color: colors.gray500, marginTop: 4, fontWeight: '600' },
  otpExpiryWarning: { color: colors.red500 },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green50,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  verifiedText: { color: colors.green700, fontSize: 13, fontWeight: '600' },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  pickerBoxActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primarySoft,
  },
  pickerValue: { fontSize: 14, color: colors.slate900, flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: colors.slate400, flex: 1 },
  pickerCaret: { fontSize: 16, color: colors.slate400 },
  projectInfoCard: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInfoImgPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectInfoName: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  projectInfoLoc: { fontSize: 13, color: colors.slate500, marginTop: 4 },
  projectInfoAvail: { fontSize: 13, color: colors.primary, marginTop: 4 },
  siteInfoCard: {
    backgroundColor: colors.green50,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  siteInfoName: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  siteInfoMeta: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  siteInfoPrice: { fontSize: 12, color: colors.green600, fontWeight: '700', marginTop: 4 },
  reviewCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate100,
    borderRadius: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate50,
  },
  reviewLabel: { fontSize: 13, color: colors.gray400, fontWeight: '500' },
  reviewValueWrap: { flex: 1, alignItems: 'flex-end', marginLeft: 8 },
  reviewValue: { fontSize: 13, fontWeight: '700', color: colors.slate800, textAlign: 'right' },
  reviewSub: { fontSize: 11, color: colors.gray400, fontFamily: 'monospace', marginTop: 2 },
  noteBox: {
    backgroundColor: colors.blue50,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  noteText: { fontSize: 12, color: colors.primary },
  noteStrong: { fontWeight: '700' },
  footer: {
    paddingTop: 12,
    paddingBottom: 12,
    flexShrink: 0,
    backgroundColor: colors.gray50,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingHorizontal: 16,
    zIndex: 10,
    elevation: 6,
    minHeight: 72,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    width: '100%',
    minHeight: 48,
  },
  flexBtn: { flex: 1, minHeight: 48 },
  flexBtnSide: { flex: 1, minHeight: 48 },
  flexBtnFull: { flex: 1, minHeight: 48 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  closeBtn: { fontSize: 18, color: colors.slate500 },
  choiceList: { padding: 16 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    marginBottom: 8,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { fontSize: 13, color: colors.slate800, fontWeight: '600' },
  choiceTextSelected: { fontSize: 13, color: colors.primaryDark, fontWeight: '700' },
  radioOn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOff: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate300,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationInputWrap: { flex: 1 },
  gpsBtn: { backgroundColor: colors.primary, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  gpsContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  suggestionsBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 180,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  sugMain: { fontSize: 13, fontWeight: '600', color: colors.slate900 },
  sugSub: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  distanceBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.blue50,
    borderColor: colors.blue100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  distanceRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distanceLabel: { fontSize: 12, fontWeight: '600', color: colors.slate800 },
  distanceBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeBlue: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeBlueText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  badgePurple: { backgroundColor: colors.purple700, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgePurpleText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  mapCard: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
  },
  mapPlaceholder: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue50,
    padding: 12,
  },
  mapPlaceholderText: {
    fontSize: 12,
    color: colors.slate700,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  mapFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 },
  mapFooterAddress: { fontSize: 11, color: colors.slate700, fontWeight: '500', flex: 1 },
  openMapLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
