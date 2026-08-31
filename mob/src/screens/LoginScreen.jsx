import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PrimaryButton } from '../components/Buttons';
import { Field, AppTextInput } from '../components/FormField';

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECONDS = 292;
const RESEND_COOLDOWN_SECONDS = 45;
const INACTIVE_ACCOUNT_MESSAGE =
  'Your account is inactive. Please contact your administrator for assistance.';

const STEP_LABELS = {
  enterId: { title: 'Sign In', subtitle: 'Enter your User ID to continue', step2: 'Verify OTP' },
  adminPin: { title: 'Admin PIN', subtitle: 'Authenticating Admin', step2: 'Verify PIN' },
  otpSent: { title: 'Verify OTP', subtitle: 'Enter the code sent to your WhatsApp', step2: 'Verify OTP' },
};

function Logo() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoMark}>
        <Text style={styles.logoLetter}>M</Text>
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { requestOtp, verifyOtp, adminLogin } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState('enterId');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [identifier, setIdentifier] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [expiryLeft, setExpiryLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendLeft, setResendLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const otpRefs = useRef([]);
  const pinRef = useRef(null);
  const identifierRef = useRef(null);

  useEffect(() => {
    if (step !== 'otpSent') return;
    const interval = setInterval(() => {
      setExpiryLeft((v) => (v > 0 ? v - 1 : 0));
      setResendLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < OTP_LENGTH - 1) {
      otpRefs.current[i + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (i, { nativeEvent }) => {
    if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleCheckUser = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setErrorText('');
    try {
      const result = await requestOtp(identifier);
      if (result?.isAdmin) {
        setStep('adminPin');
        setAdminPin('');
        setTimeout(() => pinRef.current?.focus(), 150);
      } else if (result?.message || result?.success) {
        toast.success('OTP sent to your WhatsApp');
        setStep('otpSent');
        setExpiryLeft(OTP_EXPIRY_SECONDS);
        setResendLeft(RESEND_COOLDOWN_SECONDS);
        setOtp(Array(OTP_LENGTH).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 200);
      } else {
        const errMsg = result?.error || 'User not found or request failed';
        if (errMsg === INACTIVE_ACCOUNT_MESSAGE) {
          setErrorText(errMsg);
        } else {
          toast.error(errMsg);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to identify user');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(identifier, code);
      if (result?.success || result?.accessToken) {
        const name = result?.user?.name ?? '';
        toast.success(`Welcome${name ? `, ${name}` : ''}!`);
      } else {
        toast.error(result?.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!identifier.trim() || !adminPin.trim()) return;
    setLoading(true);
    try {
      const result = await adminLogin(identifier, adminPin);
      if (result?.success || result?.user) {
        const name = result?.user?.name ?? 'Admin';
        toast.success(`Welcome, ${name}!`);
      } else {
        toast.error(result?.error || 'Invalid Admin credentials');
      }
    } catch (err) {
      toast.error(err.message || 'Admin PIN authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendLeft > 0 || loading) return;
    setLoading(true);
    try {
      const result = await requestOtp(identifier);
      if (result?.message || result?.success) {
        toast.success('OTP resent');
        setExpiryLeft(OTP_EXPIRY_SECONDS);
        setResendLeft(RESEND_COOLDOWN_SECONDS);
        setOtp(Array(OTP_LENGTH).fill(''));
        otpRefs.current[0]?.focus();
      } else {
        const errMsg = result?.error || 'Failed to resend OTP';
        if (errMsg === INACTIVE_ACCOUNT_MESSAGE) {
          setErrorText(errMsg);
          setStep('enterId');
        } else {
          toast.error(errMsg);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const goBackToEditId = () => {
    setStep('enterId');
    setOtp(Array(OTP_LENGTH).fill(''));
    setAdminPin('');
    setErrorText('');
  };

  const meta = STEP_LABELS[step];
  const showBack = step !== 'enterId';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.pattern}>
            <Logo />

            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                {showBack && (
                  <Pressable onPress={goBackToEditId} style={styles.backBtn} hitSlop={8}>
                    <Text style={styles.backArrow}>‹</Text>
                  </Pressable>
                )}
                <View style={[styles.headerCenter, showBack && styles.headerCenterWithBack]}>
                  <Text style={styles.title}>{meta.title}</Text>
                  <Text style={styles.subtitle}>
                    {step === 'adminPin' ? `Authenticating Admin (${identifier})` : meta.subtitle}
                  </Text>
                </View>
              </View>

              {/* Stepper indicator */}
              <View style={styles.stepper}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, styles.stepCircleActive]}>
                    {step !== 'enterId' ? <Text style={styles.stepCheck}>✓</Text> : <Text style={styles.stepNum}>1</Text>}
                  </View>
                  <Text style={[styles.stepLabel, step === 'enterId' ? styles.stepLabelActive : null]}>User ID</Text>
                </View>
                <View style={styles.stepLine} />
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, step !== 'enterId' ? styles.stepCircleActive : styles.stepCircleInactive]}>
                    <Text style={step !== 'enterId' ? styles.stepNumActive : styles.stepNum}>2</Text>
                  </View>
                  <Text style={[styles.stepLabel, step !== 'enterId' ? styles.stepLabelActive : null]}>{meta.step2}</Text>
                </View>
              </View>

              {/* STEP 1 - Enter User ID */}
              {step === 'enterId' && (
                <View style={styles.form}>
                  <Field label="User ID" required>
                    <AppTextInput
                      ref={identifierRef}
                      value={identifier}
                      onChangeText={(t) => {
                        setIdentifier(t.toUpperCase());
                        setErrorText('');
                      }}
                      placeholder="Enter your User ID"
                      placeholderTextColor={colors.slate400}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleCheckUser}
                    />
                  </Field>

                  {errorText ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorBoxText}>{errorText}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    title="Continue"
                    icon={loading ? undefined : undefined}
                    loading={loading}
                    disabled={!identifier.trim()}
                    onPress={handleCheckUser}
                    style={styles.submit}
                  />
                </View>
              )}

              {/* STEP 2A - Admin PIN */}
              {step === 'adminPin' && (
                <View style={styles.form}>
                  <Field label="PIN" required>
                    <AppTextInput
                      ref={pinRef}
                      value={adminPin}
                      onChangeText={setAdminPin}
                      placeholder="Enter Admin PIN"
                      placeholderTextColor={colors.slate400}
                      secureTextEntry
                      maxLength={10}
                      returnKeyType="go"
                      onSubmitEditing={handleAdminLogin}
                    />
                  </Field>

                  <PrimaryButton
                    title="Verify Admin PIN"
                    loading={loading}
                    disabled={!adminPin.trim()}
                    onPress={handleAdminLogin}
                    style={styles.submit}
                  />
                </View>
              )}

              {/* STEP 2B - Verify OTP */}
              {step === 'otpSent' && (
                <View style={styles.form}>
                  <View style={styles.otpHeader}>
                    <Text style={styles.otpLabel}>Enter OTP</Text>
                    <Text style={styles.otpTimer}>{formatTime(expiryLeft)}</Text>
                  </View>

                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(i, val)}
                        onKeyPress={(e) => handleOtpKeyDown(i, e)}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={styles.otpInput}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <PrimaryButton
                    title="Verify OTP"
                    loading={loading}
                    disabled={otp.join('').length !== OTP_LENGTH}
                    onPress={handleVerifyOtp}
                    style={styles.submit}
                  />

                  <View style={styles.resendWrap}>
                    <Pressable
                      onPress={handleResendOtp}
                      disabled={resendLeft > 0 || loading}
                      style={styles.resendBtn}>
                      <Text style={resendLeft > 0 ? styles.resendDisabled : styles.resendActive}>
                        {resendLeft > 0 ? `Resend in 00:${String(resendLeft).padStart(2, '0')}` : 'Resend OTP'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.white,
    padding: 16,
    paddingVertical: 28,
  },
  pattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: 20,
  },
  logoMark: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  logoLetter: {
    fontSize: 60,
    fontWeight: '800',
    color: colors.white,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  backArrow: {
    fontSize: 28,
    color: colors.slate500,
    lineHeight: 28,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerCenterWithBack: {
    marginRight: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.slate900,
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
    textAlign: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleInactive: {
    backgroundColor: colors.slate100,
  },
  stepCheck: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  stepNum: {
    color: colors.slate400,
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumActive: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
    color: colors.slate400,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    maxWidth: 50,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.slate300,
    marginTop: 14,
  },
  form: {},
  submit: {
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red100,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorBoxText: {
    color: colors.red600,
    fontSize: 12,
    fontWeight: '500',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate600,
  },
  otpTimer: {
    fontSize: 11,
    color: colors.slate500,
    fontVariant: ['tabular-nums'],
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  otpInput: {
    width: 48,
    height: 52,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate800,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 6,
  },
  resendWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  resendBtn: {
    paddingVertical: 4,
  },
  resendActive: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  resendDisabled: {
    color: colors.slate400,
    fontSize: 12,
    fontWeight: '600',
  },
});
