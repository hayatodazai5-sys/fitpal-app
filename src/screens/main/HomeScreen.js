import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import {
  getBmiLogs,
  getWorkoutSessions,
  getWeeklyProgress,
  getWorkoutCompletionStatus,
  replaceActiveWorkoutPlan,
  resolveDisplayName,
  subscribeToUserData,
} from '../../services/supabase';
import useMidnightCountdown from '../../hooks/useMidnightCountdown';
import { generateWorkoutPlan, GOAL_LABELS } from '../../services/workoutAI';
import { Card, SectionHeader, StatCard } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const WeeklyChart = ({ data }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxVal = Math.max(...data, 1);

  return (
    <View style={chartStyles.wrapper}>
      {days.map((day, i) => {
        const val = data[i] || 0;
        const pct = val / maxVal;
        const isToday = i === (new Date().getDay() + 6) % 7;
        return (
          <View key={day} style={chartStyles.colWrap}>
            <View style={chartStyles.barBg}>
              <View
                style={[
                  chartStyles.barFill,
                  { height: `${Math.max(pct * 100, 4)}%` },
                  isToday && chartStyles.barToday,
                ]}
              />
            </View>
            <Text style={[chartStyles.dayLabel, isToday && chartStyles.dayLabelToday]}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
};

const chartStyles = StyleSheet.create({
  wrapper: { flexDirection: 'row', height: 90, alignItems: 'flex-end', gap: 6, marginTop: 8 },
  colWrap: { flex: 1, alignItems: 'center', gap: 4 },
  barBg: { flex: 1, width: '100%', backgroundColor: COLORS.maroonSurface, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { backgroundColor: COLORS.maroon, borderRadius: 4 },
  barToday: { backgroundColor: COLORS.maroonLight },
  dayLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium },
  dayLabelToday: { color: COLORS.maroon, fontWeight: FONTS.bold },
});

const DataChip = ({ icon, label, value }) => (
  <View style={chipStyles.chip}>
    <Ionicons name={icon} size={15} color={COLORS.maroon} />
    <View style={chipStyles.chipCopy}>
      <Text style={chipStyles.chipLabel}>{label}</Text>
      <Text style={chipStyles.chipValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flex: 1,
    minWidth: 132,
  },
  chipCopy: { flex: 1 },
  chipLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: FONTS.bold },
});

const CategoryCard = ({ iconName, label, meta, onPress }) => (
  <TouchableOpacity style={catStyles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={catStyles.iconWrap}>
      <Ionicons name={iconName} size={24} color={COLORS.maroon} />
    </View>
    <View style={catStyles.copy}>
      <Text style={catStyles.label} numberOfLines={1}>{label}</Text>
      <Text style={catStyles.meta} numberOfLines={1}>{meta}</Text>
    </View>
  </TouchableOpacity>
);

const catStyles = StyleSheet.create({
  card: {
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 9,
    flex: 1,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.maroonSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { width: '100%', alignItems: 'center', gap: 2 },
  label: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center' },
  meta: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONTS.medium, textAlign: 'center' },
});

export default function HomeScreen({ navigation }) {
  const { user, profile, workoutPlan, setWorkoutPlan } = useAuth();
  const [weekData, setWeekData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [todayStats, setTodayStats] = useState({ calories: 0, duration: 0, steps: 0, workouts: 0 });
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [completionStatus, setCompletionStatus] = useState({
    completedDays: 0,
    completedToday: false,
    isPlanComplete: false,
    nextWorkoutDay: null,
  });

  const firstName = resolveDisplayName(
    user?.email,
    profile?.full_name || user?.user_metadata?.full_name
  ).split(' ')[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    loadProgress();
    if (!user?.id) return undefined;

    return subscribeToUserData(user.id, {
      workoutSession: loadProgress,
    });
  }, [user?.id, workoutPlan?.generatedAt, workoutPlan?.totalDays]);

  const loadProgress = async () => {
    if (!user?.id) return;

    try {
      const [
        { data, error: progressError },
        { data: status, error: statusError },
      ] = await Promise.all([
        getWeeklyProgress(user.id),
        getWorkoutCompletionStatus(user.id, workoutPlan),
      ]);

      if (progressError) throw progressError;
      if (statusError) throw statusError;

      if (status) {
        setCompletionStatus(status);
      }

      if (data) {
        const chart = [0, 0, 0, 0, 0, 0, 0];
        let calories = 0, duration = 0, workouts = 0;
        const todayKey = new Date().toDateString();

        data.forEach((s) => {
          const d = new Date(s.completed_at).getDay();
          const idx = d === 0 ? 6 : d - 1;
          chart[idx] = (chart[idx] || 0) + (s.duration_minutes || 0);

          if (new Date(s.completed_at).toDateString() === todayKey) {
            calories += s.calories_burned || 0;
            duration += s.duration_minutes || 0;
            workouts++;
          }
        });
        setWeekData(chart);
        setTodayStats({ calories, duration, workouts, steps: workouts * 1200 });
      }
    } catch (err) {
      console.warn('FitPAL home progress load failed:', err);
    }
  };

  const midnightCountdown = useMidnightCountdown(
    completionStatus.completedToday,
    loadProgress
  );

  const plan = workoutPlan;
  const totalPlanDays = plan?.totalDays || plan?.workoutDays?.length || 0;
  const completedDays = plan ? Math.min(completionStatus.completedDays, totalPlanDays) : 0;
  const progressPct = totalPlanDays > 0 ? (completedDays / totalPlanDays) * 100 : 0;
  const nextWorkoutDay =
    completionStatus.nextWorkoutDay || plan?.workoutDays?.[completedDays] || null;
  const canGenerateNextPlan = completionStatus.isPlanComplete && !completionStatus.completedToday;
  const workoutLocked =
    generatingPlan ||
    completionStatus.completedToday ||
    (!canGenerateNextPlan && (completionStatus.isPlanComplete || !nextWorkoutDay));
  const nextExerciseCount = nextWorkoutDay?.sections?.reduce((sum, section) => {
    return sum + (section.exercises?.length || 0);
  }, 0) || 0;
  const planIntensity = plan?.adaptation?.intensityLevel || 'Balanced';
  const planSourceSessions = plan?.adaptation?.sourceSessions || 0;
  const planBmiLogs = plan?.adaptation?.bmiLogCount || 0;
  const planSignals = plan?.adaptation?.dataSignals || ['Baseline metrics'];
  const visiblePlanSignals = planSignals
    .map((signal) => signal === 'Profile' ? 'Baseline metrics' : signal)
    .map((signal) => signal === 'Sessions' ? 'Workout logs' : signal)
    .filter((signal, index, list) => list.indexOf(signal) === index);
  const planSignalPills = visiblePlanSignals.filter((signal) => signal !== 'Baseline metrics');
  const planSignalText = planSignalPills.length ? planSignalPills.join(' + ') : 'Baseline metrics';
  const weeklyMinutes = weekData.reduce((sum, minutes) => sum + minutes, 0);
  const strengthDays = plan?.workoutDays?.filter(d => d.type === 'strength').length || 0;
  const cardioDays = plan?.workoutDays?.filter(d => d.type === 'cardio').length || 0;
  const recoveryDays = plan?.workoutDays?.filter(d => d.type === 'rest').length || 0;
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const todayStatus = completionStatus.completedToday
    ? 'Done'
    : canGenerateNextPlan
      ? 'Plan ready'
      : nextWorkoutDay
        ? `Day ${nextWorkoutDay.dayNumber}`
        : 'Rest';
  const workoutButtonLabel = generatingPlan
    ? 'Generating Plan...'
    : completionStatus.completedToday && completionStatus.isPlanComplete
      ? 'Next Plan Tomorrow'
      : completionStatus.isPlanComplete
        ? 'Generate Next Week'
        : completionStatus.completedToday
          ? 'Workout Done Today'
          : nextWorkoutDay
            ? `Start Day ${nextWorkoutDay.dayNumber}`
            : 'No Workout Available';
  const unlockLabel = completionStatus.isPlanComplete ? 'Next plan' : 'Next workout';

  const handlePlanAction = async () => {
    if (!user?.id || !plan) return;

    if (canGenerateNextPlan) {
      const heightCm = Number(profile?.height_cm || plan.heightCm);
      const weightKg = Number(profile?.weight_kg || plan.weightKg);
      const goal = profile?.goal || plan.goal;
      const equipment = profile?.equipment || plan.equipment || [];

      if (!heightCm || !weightKg || !goal) {
        Alert.alert('Missing Profile Data', 'Update your fitness profile before generating the next plan.');
        return;
      }

      setGeneratingPlan(true);
      try {
        const [{ data: sessions }, { data: bmiLogs }] = await Promise.all([
          getWorkoutSessions(user.id, 30),
          getBmiLogs(user.id, 8),
        ]);
        const nextPlan = generateWorkoutPlan({
          heightCm,
          weightKg,
          goal,
          equipment,
          weekNumber: (plan.weekNumber || 1) + 1,
          sessions: sessions || [],
          bmiLogs: bmiLogs || [],
          currentPlan: plan,
        });

        const { error } = await replaceActiveWorkoutPlan(user.id, nextPlan);
        if (error) throw error;

        setWorkoutPlan(nextPlan);
        setCompletionStatus({
          completedDays: 0,
          completedToday: false,
          isPlanComplete: false,
          nextWorkoutDay: nextPlan.workoutDays?.[0] || null,
        });
        Alert.alert('Adaptive Plan Ready', 'Your next week was generated from your logged workouts and BMI history.');
      } catch (err) {
        Alert.alert('Plan Failed', err.message || 'Could not generate your next plan.');
      } finally {
        setGeneratingPlan(false);
      }
      return;
    }

    if (nextWorkoutDay) {
      navigation.navigate('WorkoutDay', { dayData: nextWorkoutDay });
    }
  };

  const showNotifications = () => {
    Alert.alert('Notifications', 'Workout reminders will appear here when reminders are enabled.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greetingSmall}>{greeting()},</Text>
            <Text style={styles.greetingName}>{firstName}</Text>
          </View>
          <View style={styles.topIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={showNotifications} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.maroon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.avatarText}>{firstName[0]}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Overview */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewTitle}>Today's Overview</Text>
              <Text style={styles.overviewDate}>{todayLabel}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{todayStatus}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <StatCard icon={<Ionicons name="flame-outline" size={22} color={COLORS.maroon} />} value={todayStats.calories || '-'} label="Calories" />
            <StatCard icon={<Ionicons name="time-outline" size={22} color={COLORS.maroon} />} value={todayStats.duration ? `${todayStats.duration}m` : '-'} label="Workout Time" />
            <StatCard icon={<Ionicons name="walk-outline" size={22} color={COLORS.maroon} />} value={todayStats.steps || '-'} label="Steps" />
            <StatCard icon={<Ionicons name="checkmark-circle-outline" size={22} color={COLORS.maroon} />} value={todayStats.workouts || '-'} label="Workouts" />
          </View>
          <View style={styles.overviewDataRow}>
            <DataChip icon="calendar-outline" label="This Week" value={`${weeklyMinutes} min`} />
            <DataChip icon="flag-outline" label="Goal" value={plan?.goal ? GOAL_LABELS[plan.goal] : 'Setup'} />
          </View>
        </Card>

        {/* Current Plan Progress */}
        {plan && (
          <Card style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>Active Plan</Text>
              </View>
              <Text style={styles.planWeek}>Week {plan.weekNumber}</Text>
            </View>
            <Text style={styles.planTitle}>
              {plan.goal ? GOAL_LABELS[plan.goal] : 'My Plan'}
            </Text>
            <Text style={styles.planSubtitle}>
              {plan.workoutDays?.filter(d => d.type !== 'rest').length || 0} workouts/week
            </Text>

            <View style={styles.planDataGrid}>
              <DataChip icon="pulse-outline" label="Intensity" value={planIntensity} />
              <DataChip icon="timer-outline" label="Target" value={`${nextWorkoutDay?.targetMinutes || plan?.adaptation?.targetMinutes || 45} min`} />
              <DataChip icon="bar-chart-outline" label="Based on" value={planSignalText} />
              <DataChip icon="scale-outline" label="BMI Logs" value={`${planBmiLogs}`} />
            </View>

            {!!plan?.adaptation?.summary && (
              <View style={styles.adaptiveNote}>
                <Ionicons name="analytics-outline" size={16} color={COLORS.maroon} />
                <Text style={styles.adaptiveNoteText}>{plan.adaptation.summary}</Text>
              </View>
            )}
            {planSignalPills.length > 0 && (
              <View style={styles.signalRow}>
                {planSignalPills.map((signal) => (
                  <View key={signal} style={styles.signalPill}>
                    <Text style={styles.signalPillText}>{signal}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Progress ring substitute */}
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{completedDays}/{totalPlanDays} days</Text>
            </View>

            {nextWorkoutDay && !completionStatus.isPlanComplete && (
              <View style={styles.nextWorkoutPreview}>
                <View style={styles.nextWorkoutIcon}>
                  <Ionicons
                    name={nextWorkoutDay.type === 'cardio' ? 'walk-outline' : nextWorkoutDay.type === 'rest' ? 'leaf-outline' : 'barbell-outline'}
                    size={20}
                    color={COLORS.maroon}
                  />
                </View>
                <View style={styles.nextWorkoutInfo}>
                  <Text style={styles.nextWorkoutTitle}>{nextWorkoutDay.label}</Text>
                  <Text style={styles.nextWorkoutMeta}>
                    {nextExerciseCount} exercises | {nextWorkoutDay.targetMinutes || 45} min | {planSourceSessions} sessions
                  </Text>
                </View>
              </View>
            )}

            {/* Today's workout */}
            {plan && (
              <TouchableOpacity
                style={[styles.todayWorkoutBtn, workoutLocked && styles.todayWorkoutBtnDisabled]}
                disabled={workoutLocked}
                onPress={handlePlanAction}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    workoutLocked
                      ? [COLORS.textMuted, COLORS.textMuted]
                      : [COLORS.maroon, COLORS.maroonLight]
                  }
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.todayWorkoutGrad}
                >
                  <Text style={styles.todayWorkoutLabel}>{workoutButtonLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {completionStatus.completedToday && (
              <Text style={styles.nextWorkoutHint}>
                {unlockLabel} unlocks in {midnightCountdown.label}.
              </Text>
            )}
          </Card>
        )}

        <SectionHeader title="Explore Categories" style={styles.sectionGap} />
        <View style={styles.categoriesWrap}>
          <View style={styles.categoriesGrid}>
            <CategoryCard iconName="barbell-outline" label="Strength" meta={`${strengthDays} days`} onPress={() => navigation.navigate('Workouts')} />
            <CategoryCard iconName="heart-outline" label="Cardio" meta={`${cardioDays} days`} onPress={() => navigation.navigate('Workouts')} />
          </View>
          <View style={styles.categoriesGrid}>
            <CategoryCard iconName="body-outline" label="Bodyweight" meta={plan?.equipment?.includes('no_equipment') ? 'Primary' : 'Included'} onPress={() => navigation.navigate('Workouts')} />
            <CategoryCard iconName="leaf-outline" label="Recovery" meta={`${recoveryDays} days`} onPress={() => navigation.navigate('Workouts')} />
          </View>
        </View>

        <Card style={[styles.chartCard, { marginTop: SPACING.md }]}>
          <Text style={styles.chartTitle}>Your Progress This Week</Text>
          <WeeklyChart data={weekData} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingHorizontal: SPACING.md, paddingBottom: 100, gap: SPACING.md, paddingTop: SPACING.sm },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  greetingSmall: { fontSize: 13, color: COLORS.textMuted, fontWeight: FONTS.medium },
  greetingName: { fontSize: 22, fontWeight: FONTS.extraBold, color: COLORS.textPrimary },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    padding: 8,
    ...SHADOW.sm,
  },
  avatarBtn: {
    backgroundColor: COLORS.maroon,
    borderRadius: RADIUS.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: FONTS.bold, fontSize: 15 },
  overviewCard: { gap: SPACING.sm },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  overviewTitle: { fontSize: 16, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  overviewDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: FONTS.medium },
  statusPill: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statusPillText: { color: COLORS.maroon, fontSize: 11, fontWeight: FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  overviewDataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planCard: { gap: 10 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planBadge: {
    backgroundColor: COLORS.maroon,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  planBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: FONTS.semiBold },
  planWeek: { fontSize: 13, color: COLORS.textMuted, fontWeight: FONTS.medium },
  planTitle: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  planSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  planDataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planMetaGrid: { flexDirection: 'row', gap: 8 },
  planMetaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  planMetaLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  planMetaValue: { fontSize: 13, color: COLORS.maroon, fontWeight: FONTS.bold },
  adaptiveNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
  },
  adaptiveNoteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -2 },
  signalPill: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  signalPillText: { fontSize: 10, color: COLORS.maroon, fontWeight: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: COLORS.maroonSurface, borderRadius: 4 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.maroon, borderRadius: 4 },
  progressLabel: { fontSize: 12, fontWeight: FONTS.semiBold, color: COLORS.maroon },
  nextWorkoutPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  nextWorkoutIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.maroonSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextWorkoutInfo: { flex: 1, gap: 2 },
  nextWorkoutTitle: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  nextWorkoutMeta: { fontSize: 12, color: COLORS.textMuted },
  todayWorkoutBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: 4 },
  todayWorkoutBtnDisabled: { opacity: 0.85 },
  todayWorkoutGrad: { paddingVertical: 14, alignItems: 'center' },
  todayWorkoutLabel: { color: COLORS.white, fontWeight: FONTS.bold, fontSize: 15, letterSpacing: 0.5 },
  nextWorkoutHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  sectionGap: { marginTop: 2, marginBottom: -4 },
  categoriesWrap: { gap: SPACING.sm, marginTop: -6 },
  categoriesGrid: { flexDirection: 'row', gap: SPACING.sm },
  chartCard: {},
  chartTitle: { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.textPrimary },
});
