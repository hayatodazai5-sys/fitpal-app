import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { logBmi, replaceActiveWorkoutPlan, resolveDisplayName, supabase } from '../../services/supabase';
import { generateWorkoutPlan } from '../../services/workoutAI';
import { PrimaryButton } from '../../components/UI';
import { Reveal } from '../../components/Transitions';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const StepDot = ({ active, done }) => (
  <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
    {done && <Ionicons name="checkmark" size={10} color={COLORS.white} />}
  </View>
);

const StepBar = ({ current, total }) => (
  <View style={styles.stepBar}>
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <StepDot active={i === current} done={i < current} />
        {i < total - 1 && (
          <View style={[styles.stepLine, i < current && styles.stepLineDone]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

const EquipmentOption = ({ id, label, icon, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.equipOption, selected && styles.equipOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons name={icon} size={24} color={selected ? COLORS.maroon : COLORS.textPrimary} />
    <Text style={[styles.equipLabel, selected && styles.equipLabelSelected]}>{label}</Text>
    {selected && (
      <View style={styles.equipCheck}>
        <Ionicons name="checkmark-circle" size={18} color={COLORS.maroon} />
      </View>
    )}
  </TouchableOpacity>
);

const GoalOption = ({ id, label, icon, desc, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.goalOption, selected && styles.goalOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.goalLeft}>
      <Ionicons name={icon} size={28} color={selected ? COLORS.maroon : COLORS.textPrimary} />
      <View>
        <Text style={[styles.goalLabel, selected && styles.goalLabelSelected]}>{label}</Text>
        <Text style={styles.goalDesc}>{desc}</Text>
      </View>
    </View>
    <Ionicons
      name={selected ? 'radio-button-on' : 'chevron-forward'}
      size={20}
      color={selected ? COLORS.maroon : COLORS.textMuted}
    />
  </TouchableOpacity>
);

const EQUIPMENT_OPTIONS = [
  { id: 'no_equipment', label: 'No Equipment', icon: 'walk-outline' },
  { id: 'dumbbells', label: 'Dumbbells', icon: 'barbell-outline' },
  { id: 'barbell', label: 'Barbell', icon: 'fitness-outline' },
  { id: 'resistance_bands', label: 'Resistance Bands', icon: 'ellipse-outline' },
  { id: 'machines', label: 'Machines', icon: 'construct-outline' },
];

const GOAL_OPTIONS = [
  { id: 'build_muscle', label: 'Build Muscle', icon: 'barbell-outline', desc: 'Gain strength and size' },
  { id: 'lose_weight', label: 'Lose Weight', icon: 'flame-outline', desc: 'Burn fat and tone up' },
  { id: 'improve_endurance', label: 'Improve Endurance', icon: 'walk-outline', desc: 'Run longer, go harder' },
  { id: 'build_strength', label: 'Build Strength', icon: 'fitness-outline', desc: 'Lift heavier weights' },
];

export default function SetupFlowScreen({ navigation }) {
  const { user, setProfile, setWorkoutPlan } = useAuth();
  const [step, setStep] = useState(0); // 0=body details, 1=equipment, 2=goal
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const getBodyMetrics = () => ({
    heightCm: parseFloat(height),
    weightKg: parseFloat(weight),
  });

  const toggleEquipment = (id) => {
    if (id === 'no_equipment') {
      setSelectedEquipment(['no_equipment']);
      return;
    }
    const filtered = selectedEquipment.filter(e => e !== 'no_equipment');
    if (filtered.includes(id)) {
      setSelectedEquipment(filtered.filter(e => e !== id));
    } else {
      setSelectedEquipment([...filtered, id]);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      const { heightCm, weightKg } = getBodyMetrics();
      if (!height || !weight) return Alert.alert('Required', 'Please enter your height and weight.');
      if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
        return Alert.alert('Invalid', 'Please enter a valid height and weight.');
      }
    }
    if (step === 1) {
      if (selectedEquipment.length === 0) return Alert.alert('Required', 'Please select at least one option.');
    }
    if (step < 2) setStep(step + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    if (!selectedGoal) return Alert.alert('Required', 'Please select your fitness goal.');
    if (!user?.id) return Alert.alert('Session Required', 'Please sign in again before completing setup.');

    const { heightCm, weightKg } = getBodyMetrics();
    if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
      return Alert.alert('Invalid', 'Please enter a valid height and weight.');
    }

    setLoading(true);
    try {
      // 1. Generate AI workout plan
      const plan = generateWorkoutPlan({
        heightCm,
        weightKg,
        goal: selectedGoal,
        equipment: selectedEquipment,
        weekNumber: 1,
      });

      // 2. Save profile to Supabase
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: resolveDisplayName(user?.email, user?.user_metadata?.full_name),
        height_cm: heightCm,
        weight_kg: weightKg,
        goal: selectedGoal,
        equipment: selectedEquipment,
        bmi: plan.bmi,
        setup_complete: true,
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase.from('profiles').upsert(profileData);
      if (profileError) throw profileError;

      const { error: bmiError } = await logBmi({
        userId: user.id,
        heightCm,
        weightKg,
        bmi: plan.bmi,
      });
      if (bmiError) throw bmiError;

      // 3. Save workout plan to Supabase
      const { error: planError } = await replaceActiveWorkoutPlan(user.id, plan);
      if (planError) throw planError;

      // 4. Update local state
      setProfile(profileData);
      setWorkoutPlan(plan);

      // Navigation handled by RootNavigator via profile change
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const STEP_TITLES = ["Let's set you up.", "Let's set you up.", "Let's set you up."];
  const STEP_SUBTITLES = ['Your Basic Details', 'Equipment Availability', 'Your Fitness Goal'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.maroon} />
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
        <StepBar current={step} total={3} />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.maroon, COLORS.maroonLight]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
          <Text style={styles.headerSub}>{STEP_SUBTITLES[step]}</Text>
        </LinearGradient>

        <Reveal key={`setup-step-${step}`} delay={80}>
          {/* Step 0: Body Details */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Height</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    placeholder="e.g. 170"
                    placeholderTextColor={COLORS.textMuted}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitText}>cm</Text>
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Weight</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    placeholder="e.g. 65"
                    placeholderTextColor={COLORS.textMuted}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitText}>kg</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 1: Equipment */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHint}>Select all that you have access to:</Text>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <EquipmentOption
                  key={eq.id}
                  {...eq}
                  selected={selectedEquipment.includes(eq.id)}
                  onPress={() => toggleEquipment(eq.id)}
                />
              ))}
            </View>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHint}>What's your primary fitness goal?</Text>
              {GOAL_OPTIONS.map((goal) => (
                <GoalOption
                  key={goal.id}
                  {...goal}
                  selected={selectedGoal === goal.id}
                  onPress={() => setSelectedGoal(goal.id)}
                />
              ))}
            </View>
          )}
        </Reveal>

        <PrimaryButton
          title={step < 2 ? 'Next' : 'Generate My Plan'}
          onPress={handleNext}
          loading={loading}
          style={styles.nextBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { padding: 4 },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.cardBorder,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: COLORS.maroon, backgroundColor: COLORS.maroonSurface },
  stepDotDone: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  stepLine: { width: 32, height: 2, backgroundColor: COLORS.cardBorder },
  stepLineDone: { backgroundColor: COLORS.maroon },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  headerCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: FONTS.extraBold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    fontWeight: FONTS.medium,
  },
  stepContent: { gap: SPACING.sm, marginBottom: SPACING.lg },
  stepHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: FONTS.medium,
  },
  // Body details
  fieldGroup: { gap: 8, marginBottom: 4 },
  fieldLabel: { fontSize: 15, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  numInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    fontSize: 18,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  unitBadge: {
    backgroundColor: COLORS.maroonSurface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitText: { fontSize: 15, fontWeight: FONTS.semiBold, color: COLORS.maroon },
  // Equipment
  equipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    gap: 12,
    ...SHADOW.sm,
  },
  equipOptionSelected: {
    borderColor: COLORS.maroon,
    backgroundColor: COLORS.maroonSurface,
  },
  equipIcon: { fontSize: 24 },
  equipLabel: { fontSize: 15, fontWeight: FONTS.medium, color: COLORS.textPrimary, flex: 1 },
  equipLabelSelected: { color: COLORS.maroon, fontWeight: FONTS.semiBold },
  equipCheck: { marginLeft: 'auto' },
  // Goal
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    ...SHADOW.sm,
  },
  goalOptionSelected: { borderColor: COLORS.maroon, backgroundColor: COLORS.maroonSurface },
  goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalIcon: { fontSize: 28 },
  goalLabel: { fontSize: 15, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  goalLabelSelected: { color: COLORS.maroon },
  goalDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  nextBtn: { marginTop: SPACING.md },
});
