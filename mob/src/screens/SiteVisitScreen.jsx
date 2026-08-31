import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Field, AppTextInput } from '../components/FormField';
import { RadioGroup } from '../components/RadioGroup';
import { SuccessModal } from '../components/SuccessModal';
import ProjectPicker from '../components/ProjectPicker';
import { site as siteApi } from '../services/site';
import { customer as customerApi } from '../services/customer';
import { siteVisit as siteVisitApi } from '../services/siteVisit';

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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const otpTimerRef = useRef(null);

  const dateOptions = useMemo(() => buildDateOptions(30), []);

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

  const selectedProject = sites.find((s) => s.id === Number(form.projectId));
  const availablePlots = (selectedProject?.plots || []).filter((p) => p.status === 'Active');
  const selectedSite = availablePlots.find((p) => p.id === Number(form.siteId));

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
    if (!form.email || (form.email && !/^\S+@\S+\.\S+$/.test(form.email))) {
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading projects…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pageShell}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Site Visit Registration</Text>
              <Text style={styles.headerSub}>Register new customer and schedule site visit</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.contentCard}>
            {/* Stepper */}
            <View style={styles.stepper}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={styles.stepFlex}>
                  <View style={[styles.stepBar, s <= step ? styles.stepBarActive : null]} />
                  <View style={[styles.stepDot, s <= step ? styles.stepDotActive : styles.stepDotInactive]}>
                    <Text style={s <= step ? styles.stepDotTextActive : styles.stepDotText}>
                      {s < step ? '✓' : s}
                    </Text>
                  </View>
                  {s < 3 ? <View style={[styles.stepBar, s < step ? styles.stepBarActive : null]} /> : null}
                </View>
              ))}
            </View>
            <Text style={styles.stepTitle}>
              {step === 1 ? 'Personal Info & Occupation' : step === 2 ? 'Visit & Purchase Details' : 'Review & Submit'}
            </Text>

            <ScrollView
              style={styles.scroller}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled">
              {/* STEP 1 */}
              {step === 1 && (
                <View>
                  <View style={styles.bannerBlue}>
                    <Text style={styles.bannerText}>Enter customer details and verify mobile number</Text>
                  </View>

              <Field label="Applicant Name" required error={errors.name}>
                <AppTextInput
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  placeholder="Full name"
                  error={!!errors.name}
                />
              </Field>

              <Field label="Mobile Number" required error={errors.mobile}>
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

              <Field label="Address" required error={errors.address}>
                <TextInput
                  value={form.address}
                  onChangeText={(v) => setField('address', v)}
                  placeholder="Full address"
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={3}
                  style={[styles.textArea, errors.address ? styles.inputError : null]}
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

              <Field label="Occupation" required error={errors.occupation}>
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
                <Text style={styles.bannerTextGreen}>Visit & purchase details</Text>
              </View>

              <Field label="Select Project" required error={errors.projectId}>
                <Pressable onPress={() => setProjectPickerOpen(true)} style={styles.pickerBox}>
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
                  <Text style={styles.projectInfoName}>{selectedProject.name}</Text>
                  <Text style={styles.projectInfoLoc}>{selectedProject.location}</Text>
                  <Text style={styles.projectInfoAvail}>{availablePlots.length} available</Text>
                </View>
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

              <Field label="Purchase Mode" required error={errors.purchaseMode}>
                <RadioGroup
                  options={purchaseModes}
                  value={form.purchaseMode}
                  onChange={(v) => setField('purchaseMode', v)}
                  columns={2}
                />
              </Field>

              <Field label="Visit Date" required error={errors.visitDate}>
                <Pressable onPress={() => setDatePickerOpen(true)} style={styles.pickerBox}>
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

              <Field label="Visit Time" required error={errors.visitTime}>
                <Pressable onPress={() => setTimePickerOpen(true)} style={styles.pickerBox}>
                  {form.visitTime ? (
                    <Text style={styles.pickerValue}>{formatSlot(form.visitTime)}</Text>
                  ) : (
                    <Text style={styles.pickerPlaceholder}>Choose time…</Text>
                  )}
                  <Text style={styles.pickerCaret}>⌄</Text>
                </Pressable>
              </Field>

              <Field label="Number of Persons" required error={errors.persons}>
                <AppTextInput
                  value={form.persons}
                  onChangeText={(v) => setField('persons', v.replace(/[^\d]/g, ''))}
                  placeholder="1"
                  keyboardType="number-pad"
                  maxLength={2}
                  error={!!errors.persons}
                />
              </Field>

              <Field label="Pickup Location">
                <AppTextInput
                  value={form.location}
                  onChangeText={(v) => setField('location', v)}
                  placeholder="Search pickup address or area…"
                />
              </Field>

              <Field label="Notes / Requirements">
                <TextInput
                  value={form.notes}
                  onChangeText={(v) => setField('notes', v)}
                  placeholder="Plot size preference, budget, etc."
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={3}
                  style={styles.textArea}
                />
              </Field>
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View>
              <View style={styles.bannerPurple}>
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

            {/* Bottom nav buttons */}
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
        selectedSiteId={Number(form.siteId)}
        onSelectProject={(p) => {
          setField('projectId', String(p.id));
          setForm((prev) => ({ ...prev, siteId: '' }));
        }}
        onSelectSite={(siteId) => setField('siteId', siteId ? String(siteId) : '')}
        onClose={() => setProjectPickerOpen(false)}
      />

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
  safe: { flex: 1, backgroundColor: colors.white },
  centerSafe: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.slate500, fontSize: 13, marginTop: 12 },
  flex: { flex: 1 },
  pageShell: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 52,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.slate900, lineHeight: 28 },
  headerSub: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  logoutText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
  scroller: {
    flex: 1,
    marginBottom: 0,
  },
  scroll: {
    paddingTop: 6,
    paddingBottom: 16,
    flexGrow: 1,
  },
  bannerBlue: {
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: '#D3E4FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: colors.blue700, fontSize: 13, fontWeight: '600' },
  bannerGreen: {
    backgroundColor: colors.green50,
    borderWidth: 1,
    borderColor: '#D8F2DF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerTextGreen: { color: colors.green700, fontSize: 13, fontWeight: '600' },
  bannerPurple: {
    backgroundColor: colors.purple50,
    borderWidth: 1,
    borderColor: '#E9D9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerTextPurple: { color: colors.purple700, fontSize: 13, fontWeight: '600' },
  mobileRow: { flexDirection: 'row', alignItems: 'flex-start' },
  mobileInputWrap: { flex: 1 },
  smallBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBtn: { backgroundColor: colors.blue50 },
  otpBtnText: { color: colors.blue700, fontSize: 13, fontWeight: '700' },
  verifyBtn: { backgroundColor: colors.green50 },
  verifyBtnText: { color: colors.green700, fontSize: 13, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  otpExpiry: { fontSize: 12, color: colors.gray500, marginTop: 4, fontWeight: '600' },
  otpExpiryWarning: { color: colors.red500 },
  verifiedBanner: {
    backgroundColor: colors.green50,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  verifiedText: { color: colors.green700, fontSize: 13, fontWeight: '600' },
  textArea: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    color: colors.slate900,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colors.red500 },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 6,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  pickerValue: { fontSize: 13, color: colors.slate900, flex: 1 },
  pickerPlaceholder: { fontSize: 13, color: colors.slate400, flex: 1 },
  pickerCaret: { fontSize: 16, color: colors.slate400 },
  projectInfoCard: {
    backgroundColor: colors.blue50,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  projectInfoName: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  projectInfoLoc: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  projectInfoAvail: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 4 },
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
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  flexBtn: { flex: 1 },
  flexBtnSide: { flex: 1 },
  flexBtnFull: { flex: 0, width: '100%' },
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
});
