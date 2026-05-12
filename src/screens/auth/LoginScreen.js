import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  resendSignupOtp,
  signIn,
  signInWithGoogle,
  verifySignupOtp,
} from '../../services/supabase';
import OtpCodeInput, { normalizeOtpCode } from '../../components/OtpCodeInput';
import { PrimaryButton, InputField, Divider, GoogleButton } from '../../components/UI';
import { FitPALLogo } from '../../components/Logo';
import { Reveal } from '../../components/Transitions';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const isEmailNotConfirmedError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || error?.status || '').toLowerCase();
  return (
    code.includes('email_not_confirmed') ||
    message.includes('email not confirmed') ||
    message.includes('not confirmed') ||
    message.includes('confirm your email')
  );
};

const isOtpCooldownError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('security purposes') ||
    message.includes('rate limit') ||
    message.includes('too many') ||
    message.includes('wait')
  );
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    setLoading(true);
    const { error } = await signIn(normalizedEmail, password);

    if (error && isEmailNotConfirmedError(error)) {
      const { error: sendError } = await resendSignupOtp(normalizedEmail);
      setLoading(false);
      setVerificationEmail(normalizedEmail);
      setOtpCode('');

      if (sendError && !isOtpCooldownError(sendError)) {
        Alert.alert(
          'Email Not Verified',
          `Your account needs verification, but the email could not be sent: ${sendError.message}`
        );
        return;
      }

      Alert.alert(
        'Verify Your Email',
        sendError
          ? 'Enter the code from your latest email, or wait a moment and resend it.'
          : `A new 6-digit verification code was sent to ${normalizedEmail}.`
      );
      return;
    }

    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
    // Navigation handled by AuthContext listener in RootNavigator
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
    // Navigation handled by AuthContext listener in RootNavigator
  };

  const showVerification = Boolean(verificationEmail);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Reveal delay={40} direction="down" style={styles.logoSection}>
            <FitPALLogo size="lg" showTagline={false} />
          </Reveal>

          {/* Card */}
          <Reveal delay={120} style={styles.card}>
            {showVerification ? (
              <>
                <View style={styles.codeIcon}>
                  <Ionicons name="mail-unread-outline" size={28} color={COLORS.white} />
                </View>
                <Text style={styles.welcomeLabel}>VERIFY EMAIL</Text>
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
                    <Text style={styles.codeActionMuted}>Back to sign in</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.welcomeLabel}>WELCOME</Text>
                <Text style={styles.subtitle}>Login to continue your fitness journey</Text>

                <InputField
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  icon={<Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />}
                  style={{ marginTop: SPACING.md }}
                />

                <View style={styles.passwordRow}>
                  <InputField
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.accountHelpRow}>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <PrimaryButton
                  title="Login"
                  onPress={handleLogin}
                  loading={loading}
                  style={{ marginTop: SPACING.md }}
                />

                <Divider text="or" />

                <GoogleButton onPress={handleGoogleLogin} loading={googleLoading} />

                <View style={styles.signupRow}>
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.signupLink}>Sign up</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
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
  welcomeLabel: {
    fontSize: 22,
    fontWeight: FONTS.extraBold,
    color: COLORS.maroon,
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  eyeBtn: {
    padding: 8,
    marginBottom: 2,
  },
  accountHelpRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginVertical: 6,
  },
  forgotText: { fontSize: 13, color: COLORS.maroon, fontWeight: FONTS.medium },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  signupText: { fontSize: 14, color: COLORS.textSecondary },
  signupLink: { fontSize: 14, color: COLORS.maroon, fontWeight: FONTS.bold },
});
