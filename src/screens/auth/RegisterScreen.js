import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  resendSignupOtp,
  signInWithGoogle,
  signUp,
  verifySignupOtp,
} from '../../services/supabase';
import OtpCodeInput, { normalizeOtpCode } from '../../components/OtpCodeInput';
import { PrimaryButton, InputField, Divider, GoogleButton } from '../../components/UI';
import { Reveal } from '../../components/Transitions';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const LOGO_IMAGE = require('../../assets/logo/fitpal-logo.png');

const isOtpCooldownError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('security purposes') ||
    message.includes('rate limit') ||
    message.includes('too many') ||
    message.includes('wait')
  );
};

const PasswordRule = ({ met, label }) => (
  <View style={styles.ruleRow}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={14}
      color={met ? COLORS.success : COLORS.textMuted}
    />
    <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
  </View>
);

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (!Object.values(rules).every(Boolean)) {
      Alert.alert('Weak Password', 'Please meet all password requirements.');
      return;
    }
    if (!agreed) {
      Alert.alert('Terms Required', 'Please agree to the Terms of Use and Privacy Policy.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    const { data, error } = await signUp(normalizedEmail, password, fullName.trim());

    if (error) {
      setLoading(false);
      Alert.alert('Registration Failed', error.message);
      return;
    }

    if (data?.session) {
      setLoading(false);
      return;
    }

    const existingAccount =
      Array.isArray(data?.user?.identities) && data.user.identities.length === 0;

    if (existingAccount) {
      setLoading(false);
      Alert.alert(
        'Account Already Exists',
        'This email is already registered. Sign in instead, or reset your password if you forgot it.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
      return;
    }

    const { error: sendError } = await resendSignupOtp(normalizedEmail);
    setLoading(false);

    setVerificationEmail(normalizedEmail);
    setOtpCode('');

    if (sendError && !isOtpCooldownError(sendError)) {
      Alert.alert(
        'Verification Email Failed',
        sendError.message || 'We could not send the verification code. Check your Supabase email settings.'
      );
      return;
    }

    Alert.alert('Check Your Email', `A 6-digit verification code was sent to ${normalizedEmail}.`);
  };

  const handleVerifyCode = async () => {
    const code = normalizeOtpCode(otpCode);
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    const { error } = await verifySignupOtp(verificationEmail, code);
    setVerifying(false);

    if (error) {
      Alert.alert('Verification Failed', error.message);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    const { error } = await resendSignupOtp(verificationEmail);
    setResending(false);

    if (error) {
      Alert.alert('Could Not Resend', error.message);
    } else {
      Alert.alert('Code Sent', 'A new 6-digit code was sent to your email.');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);

    if (error) Alert.alert('Google Sign-In Failed', error.message);
  };

  const showVerification = Boolean(verificationEmail);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={40} direction="down" style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.maroon} />
            </TouchableOpacity>
            <View style={styles.headerBrand}>
              <Image
                source={LOGO_IMAGE}
                style={styles.headerBrandLogo}
                resizeMode="cover"
                accessibilityRole="image"
                accessibilityLabel="FitPAL logo"
              />
              <Text style={styles.headerBrandText}>FitPAL</Text>
            </View>
            <View style={styles.headerSpacer} />
          </Reveal>

          <Reveal delay={120} style={styles.card}>
            {showVerification ? (
              <>
                <View style={styles.codeIcon}>
                  <Ionicons name="mail-unread-outline" size={28} color={COLORS.white} />
                </View>
                <Text style={styles.title}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to {verificationEmail}
                </Text>

                <OtpCodeInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  disabled={verifying}
                  autoFocus
                  style={{ marginTop: SPACING.lg }}
                />

                <PrimaryButton
                  title="Verify Code"
                  onPress={handleVerifyCode}
                  loading={verifying}
                  disabled={otpCode.length !== 6}
                  style={{ marginTop: SPACING.lg }}
                />

                <View style={styles.codeActions}>
                  <TouchableOpacity onPress={handleResendCode} disabled={resending}>
                    <Text style={styles.codeActionText}>
                      {resending ? 'Sending...' : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setVerificationEmail('')}>
                    <Text style={styles.codeActionMuted}>Use a different email</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Create Your Account</Text>
                <Text style={styles.subtitle}>Start your journey to a stronger, healthier you</Text>

                <InputField
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  icon={<Ionicons name="person-outline" size={18} color={COLORS.textMuted} />}
                  style={{ marginTop: SPACING.md }}
                />
                <InputField
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  icon={<Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />}
                />
                <InputField
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
                />
                <InputField
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
                />

                {/* Password rules */}
                <View style={styles.rulesBox}>
                  <PasswordRule met={rules.length} label="At least 8 characters long" />
                  <PasswordRule met={rules.upper} label="Include Upper Case(A) at least once" />
                  <PasswordRule met={rules.number} label="Include a Number" />
                </View>

                {/* Terms */}
                <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)}>
                  <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                    {agreed && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink}>Terms of Use</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                <PrimaryButton
                  title="Sign Up"
                  onPress={handleRegister}
                  loading={loading}
                  style={{ marginTop: SPACING.md }}
                />

                <Divider text="or" />
                <GoogleButton onPress={handleGoogleLogin} loading={googleLoading} />

                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandLogo: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.maroon,
  },
  headerBrandText: {
    color: COLORS.maroon,
    fontSize: 18,
    fontWeight: FONTS.extraBold,
    letterSpacing: 0.8,
  },
  headerSpacer: { width: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#7A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: FONTS.extraBold,
    color: COLORS.maroon,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  codeIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  codeActionText: {
    color: COLORS.maroon,
    fontSize: 13,
    fontWeight: FONTS.semiBold,
  },
  codeActionMuted: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: FONTS.medium,
  },
  rulesBox: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
    marginBottom: SPACING.md,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontSize: 12, color: COLORS.textMuted },
  ruleTextMet: { color: COLORS.success },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.maroon,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: COLORS.maroon },
  termsText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },
  termsLink: { color: COLORS.maroon, fontWeight: FONTS.medium },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, color: COLORS.maroon, fontWeight: FONTS.bold },
});
