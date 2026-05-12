import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '../../components/UI';
import { FitPALLogo } from '../../components/Logo';
import { Reveal } from '../../components/Transitions';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { resolveDisplayName } from '../../services/supabase';

export default function WelcomeScreen({ navigation }) {
  const { user } = useAuth();
  const firstName = resolveDisplayName(
    user?.email,
    user?.user_metadata?.full_name
  ).split(' ')[0];

  return (
    <LinearGradient colors={[COLORS.maroon, COLORS.maroonDark]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Logo in cream tones on maroon bg */}
          <Reveal delay={40} direction="down" style={styles.logoBox}>
            <FitPALLogo size="lg" showTagline={false} />
          </Reveal>

          <Reveal delay={140} style={styles.content}>
            <Text style={styles.welcomeSmall}>Hello, {firstName}.</Text>
            <Text style={styles.welcomeBig}>Welcome!</Text>
            <Text style={styles.welcomeDesc}>
              Let's personalize your fitness journey.{'\n'}
              We just need a few details to get started.
            </Text>
          </Reveal>

          <Reveal delay={220} style={styles.footer}>
            <PrimaryButton
              title="Continue"
              onPress={() => navigation.replace('SetupFlow')}
              style={styles.continueBtn}
              textStyle={styles.continueBtnText}
            />
            <Text style={styles.footerNote}>
              Takes less than 2 minutes
            </Text>
          </Reveal>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'space-between', paddingVertical: SPACING.xxl },
  logoBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: SPACING.lg,
    alignSelf: 'center',
    marginTop: SPACING.xl,
  },
  content: { alignItems: 'center', gap: 12 },
  welcomeSmall: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FONTS.medium,
  },
  welcomeBig: {
    fontSize: 56,
    fontWeight: FONTS.extraBold,
    color: COLORS.white,
    letterSpacing: -1,
  },
  welcomeDesc: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: FONTS.regular,
  },
  footer: { gap: 14 },
  continueBtn: {
    backgroundColor: COLORS.white,
  },
  continueBtnText: {
    color: COLORS.maroon,
  },
  footerNote: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
});
