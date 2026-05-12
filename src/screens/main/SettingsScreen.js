import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getBmiLogs,
  getWorkoutSessions,
  logBmi,
  replaceActiveWorkoutPlan,
  resetPassword,
  resolveDisplayName,
  signOut,
  supabase,
} from '../../services/supabase';
import { generateWorkoutPlan, GOAL_LABELS, EQUIPMENT_LABELS } from '../../services/workoutAI';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const SettingsRow = ({ icon, label, value, onPress, danger }) => {
  const Row = onPress ? TouchableOpacity : View;
  const rowProps = onPress ? { onPress, activeOpacity: 0.8 } : {};

  return (
    <Row
      {...rowProps}
      style={styles.settingsRow}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : COLORS.maroon} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={danger ? COLORS.error : COLORS.textMuted} />
      )}
    </Row>
  );
};

const EquipmentChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.equipChip, selected && styles.equipChipSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.equipChipText, selected && styles.equipChipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const EQUIPMENT_OPTIONS = [
  { id: 'no_equipment', label: 'No Equipment' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'resistance_bands', label: 'Resistance Bands' },
  { id: 'machines', label: 'Machines' },
];

export default function SettingsScreen({ navigation }) {
  const { user, profile, workoutPlan, setProfile, setWorkoutPlan } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [height, setHeight] = useState(String(profile?.height_cm || ''));
  const [weight, setWeight] = useState(String(profile?.weight_kg || ''));
  const [equipment, setEquipment] = useState(profile?.equipment || []);
  const [saving, setSaving] = useState(false);
  const planAdaptation = workoutPlan?.adaptation;
  const planSignals = (planAdaptation?.dataSignals || ['Baseline metrics'])
    .map((signal) => signal === 'Profile' ? 'Baseline metrics' : signal)
    .map((signal) => signal === 'Sessions' ? 'Workout logs' : signal)
    .filter((signal, index, list) => list.indexOf(signal) === index)
    .join(', ');
  const profileName = resolveDisplayName(
    user?.email,
    profile?.full_name || user?.user_metadata?.full_name
  );

  const toggleEquip = (id) => {
    if (id === 'no_equipment') { setEquipment(['no_equipment']); return; }
    const filtered = equipment.filter(e => e !== 'no_equipment');
    setEquipment(filtered.includes(id) ? filtered.filter(e => e !== id) : [...filtered, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const h = parseFloat(height);
      const w = parseFloat(weight);
      if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) {
        Alert.alert('Invalid Details', 'Enter a valid height and weight before saving.');
        return;
      }
      if (equipment.length === 0) {
        Alert.alert('Required', 'Select at least one equipment option.');
        return;
      }
      if (!profile?.goal) {
        Alert.alert('Missing Goal', 'Complete your setup goal before regenerating your plan.');
        return;
      }

      const [{ data: sessions }, { data: bmiLogs }] = await Promise.all([
        getWorkoutSessions(user.id, 30),
        getBmiLogs(user.id, 8),
      ]);
      const plan = generateWorkoutPlan({
        heightCm: h,
        weightKg: w,
        goal: profile?.goal,
        equipment,
        weekNumber: workoutPlan?.weekNumber || 1,
        sessions: sessions || [],
        bmiLogs: bmiLogs || [],
        currentPlan: workoutPlan,
      });

      const newProfile = {
        ...profile,
        email: user.email,
        height_cm: h,
        weight_kg: w,
        equipment,
        bmi: plan.bmi,
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, ...newProfile });
      if (profileError) throw profileError;

      const { error: bmiError } = await logBmi({
        userId: user.id,
        heightCm: h,
        weightKg: w,
        bmi: plan.bmi,
      });
      if (bmiError) throw bmiError;

      const { error: planError } = await replaceActiveWorkoutPlan(user.id, plan);
      if (planError) throw planError;

      setProfile(newProfile);
      setWorkoutPlan(plan);
      setEditMode(false);
      Alert.alert('Saved!', 'Your profile and workout plan have been updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleChangePassword = () => {
    if (!user?.email) {
      Alert.alert('Missing Email', 'No email address is available for this account.');
      return;
    }

    Alert.alert(
      'Change Password',
      `Send a password reset code to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Code',
          onPress: async () => {
            const { error } = await resetPassword(user.email);
            if (error) {
              Alert.alert('Reset Failed', error.message);
              return;
            }

            Alert.alert(
              'Reset Code Sent',
              'Log out, then use Forgot Password on the sign-in screen to enter the code and set a new password.',
              [
                { text: 'Stay Here', style: 'cancel' },
                { text: 'Log Out', onPress: async () => signOut() },
              ]
            );
          },
        },
      ]
    );
  };

  const showInfo = (title, message) => {
    Alert.alert(title, message);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[COLORS.maroon, COLORS.maroonDark]} style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Manage your profile & preferences</Text>
        </LinearGradient>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.sectionCard}>
            <SettingsRow icon="key-outline" label="Change Password" onPress={handleChangePassword} />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Security Settings"
              value="Email verification and secure session storage are active."
              onPress={() => showInfo('Security Settings', 'FitPAL uses Supabase authentication and secure local session storage.')}
            />
          </View>
        </View>

        {/* My Fitness Profile */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>My Fitness Profile</Text>
            <TouchableOpacity onPress={() => setEditMode(!editMode)}>
              <Text style={styles.editToggle}>{editMode ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            {editMode ? (
              <View style={styles.editForm}>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    placeholder="cm"
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="kg"
                  />
                </View>
                <Text style={styles.editLabel}>Equipment</Text>
                <View style={styles.equipChips}>
                  {EQUIPMENT_OPTIONS.map(e => (
                    <EquipmentChip
                      key={e.id}
                      label={e.label}
                      selected={equipment.includes(e.id)}
                      onPress={() => toggleEquip(e.id)}
                    />
                  ))}
                </View>
                <PrimaryButton title="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.sm }} />
              </View>
            ) : (
              <>
                <SettingsRow
                  icon="resize-outline"
                  label="Height"
                  value={profile?.height_cm ? `${profile.height_cm} cm` : '-'}
                />
                <View style={styles.rowDivider} />
                <SettingsRow
                  icon="scale-outline"
                  label="Weight"
                  value={profile?.weight_kg ? `${profile.weight_kg} kg` : '-'}
                />
                <View style={styles.rowDivider} />
                <SettingsRow
                  icon="flag-outline"
                  label="Fitness Goal"
                  value={GOAL_LABELS[profile?.goal] || '-'}
                />
                <View style={styles.rowDivider} />
                <SettingsRow
                  icon="barbell-outline"
                  label="Equipment"
                  value={profile?.equipment?.map(e => EQUIPMENT_LABELS[e] || e).join(', ') || '-'}
                />
              </>
            )}
          </View>
        </View>

        {!!planAdaptation && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Plan Tuning</Text>
            <View style={styles.sectionCard}>
              <SettingsRow
                icon="pulse-outline"
                label="Active Intensity"
                value={planAdaptation.intensityLevel || 'Balanced'}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="bar-chart-outline"
                label="Data Used"
                value={planSignals}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="timer-outline"
                label="Target Time"
                value={`${planAdaptation.targetMinutes || 45} min`}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="scale-outline"
                label="BMI History"
                value={`${planAdaptation.bmiLogCount || 0} logs`}
              />
              {!!planAdaptation.summary && (
                <View style={styles.adaptiveSummaryBox}>
                  <Ionicons name="analytics-outline" size={16} color={COLORS.maroon} />
                  <Text style={styles.adaptiveSummaryText}>{planAdaptation.summary}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support & Legal</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => showInfo('Help Center', 'For support, contact your FitPAL administrator or developer team.')}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="document-text-outline"
              label="Privacy Policy"
              onPress={() => showInfo('Privacy Policy', 'FitPAL stores your profile, BMI logs, workout plans, and workout sessions to personalize your experience.')}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="reader-outline"
              label="Terms of Service"
              onPress={() => showInfo('Terms of Service', 'Use FitPAL as a fitness planning aid, not as medical advice.')}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="flag-outline"
              label="Report a Bug"
              onPress={() => showInfo('Report a Bug', 'Send the issue details, your device, and the steps to reproduce it to the project maintainer.')}
            />
          </View>
        </View>

        {/* App version */}
        <Text style={styles.version}>FitPAL v1.0.0</Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingBottom: 100 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: FONTS.extraBold, color: COLORS.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOW.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 26, fontWeight: FONTS.bold },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  profileEmail: { fontSize: 13, color: COLORS.textMuted },
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: FONTS.semiBold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  editToggle: { fontSize: 14, color: COLORS.maroon, fontWeight: FONTS.semiBold },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.maroonSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: COLORS.errorLight },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  rowLabelDanger: { color: COLORS.error },
  rowValue: { fontSize: 13, color: COLORS.textMuted },
  rowDivider: { height: 1, backgroundColor: COLORS.cardBorder, marginLeft: 60 },
  editForm: { padding: SPACING.md, gap: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editLabel: { fontSize: 14, fontWeight: FONTS.medium, color: COLORS.textSecondary },
  editInput: {
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 100,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  equipChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  equipChip: {
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  equipChipSelected: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  equipChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  equipChipTextSelected: { color: COLORS.white, fontWeight: FONTS.semiBold },
  adaptiveSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.maroonSurface,
    margin: SPACING.md,
    marginTop: 4,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  adaptiveSummaryText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginVertical: SPACING.sm },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorLight,
    margin: SPACING.md,
    borderRadius: RADIUS.xl,
    paddingVertical: 15,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.error + '44',
  },
  logoutText: { fontSize: 16, fontWeight: FONTS.bold, color: COLORS.error },
});
