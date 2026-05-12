import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OtpCodeInput, { normalizeOtpCode } from '../../components/OtpCodeInput';
import { InputField, PrimaryButton } from '../../components/UI';
import { Reveal } from '../../components/Transitions';
import {
  resetPassword,
  signOut,
  updatePassword,
  verifyRecoveryOtp,
} from '../../services/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const passwordRules = (password) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  number: /[0-9]/.test(password),
});

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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const rules = passwordRules(password);

  const handleSendCode = async () => {
    if (!normalizedEmail) {
      Alert.alert('Missing Email', 'Enter the email address for your account.');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(normalizedEmail);
    setLoading(false);

    if (error) {
      Alert.alert('Reset Failed', error.message);
      return;
    }

    setEmail(normalizedEmail);
    setOtpCode('');
    setCodeSent(true);
  };

  const handleResetPassword = async () => {
    const code = normalizeOtpCode(otpCode);

    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Enter the 6-digit code from your email.');
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

    setLoading(true);
    const { error: verifyError } = await verifyRecoveryOtp(normalizedEmail, code);
    if (verifyError) {
      setLoading(false);
      Alert.alert('Verification Failed', verifyError.message);
      return;
    }

    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      setLoading(false);
      Alert.alert('Reset Failed', updateError.message);
      return;
    }

    await signOut();
    setLoading(false);
    Alert.alert('Password Updated', 'Sign in with your new password.', [
      { text: 'OK', onPress: () => navigation.replace('Login') },
    ]);
  };

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
            <Text style={styles.headerTitle}>FitPAL</Text>
            <View style={styles.headerSpacer} />
          </Reveal>

          <Reveal delay={120} style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="keypad-outline" size={30} color={COLORS.white} />
            </View>
            <Text style={styles.title}>
              {codeSent ? 'Enter Reset Code' : 'Reset Password'}
            </Text>
            <Text style={styles.subtitle}>
              {codeSent
                ? `Use the 6-digit code sent to ${normalizedEmail}`
                : 'We will send a 6-digit reset code to your email.'}
            </Text>

            <InputField
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon={<Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />}
              style={{ marginTop: SPACING.lg }}
            />

            {codeSent && (
              <>
                <OtpCodeInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  disabled={loading}
                  autoFocus
                  style={{ marginBottom: SPACING.md }}
                />

                <InputField
                  placeholder="New Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
                />
                <InputField
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
                />

                <View style={styles.rulesBox}>
                  <PasswordRule met={rules.length} label="At least 8 characters long" />
                  <PasswordRule met={rules.upper} label="Include Upper Case(A) at least once" />
                  <PasswordRule met={rules.number} label="Include a Number" />
                </View>

                <TouchableOpacity onPress={handleSendCode} disabled={loading} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Resend reset code</Text>
                </TouchableOpacity>
              </>
            )}

            <PrimaryButton
              title={codeSent ? 'Update Password' : 'Send Reset Code'}
              onPress={codeSent ? handleResetPassword : handleSendCode}
              loading={loading}
              disabled={codeSent && otpCode.length !== 6}
              style={{ marginTop: SPACING.md }}
            />
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
  headerTitle: {
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
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: FONTS.extraBold,
    color: COLORS.maroon,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  rulesBox: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
    marginBottom: SPACING.sm,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontSize: 12, color: COLORS.textMuted },
  ruleTextMet: { color: COLORS.success },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: COLORS.maroon,
    fontSize: 13,
    fontWeight: FONTS.semiBold,
  },
});
