import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getTodayWorkoutSession, logWorkoutSession } from '../../services/supabase';
import useMidnightCountdown from '../../hooks/useMidnightCountdown';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const SectionTab = ({ title, active, done, onPress }) => (
  <TouchableOpacity
    style={[styles.sectionTab, active && styles.sectionTabActive, done && styles.sectionTabDone]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {done && <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />}
    <Text style={[styles.sectionTabText, active && styles.sectionTabTextActive]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const ExerciseRow = ({ exercise, index, completed, onToggle }) => (
  <TouchableOpacity
    style={[styles.exerciseRow, completed && styles.exerciseRowDone]}
    onPress={onToggle}
    activeOpacity={0.8}
  >
    <View style={[styles.exerciseNum, completed && styles.exerciseNumDone]}>
      {completed
        ? <Ionicons name="checkmark" size={14} color={COLORS.white} />
        : <Text style={styles.exerciseNumText}>{index + 1}</Text>
      }
    </View>
    <View style={styles.exerciseInfo}>
      <Text style={[styles.exerciseName, completed && styles.exerciseNameDone]}>
        {exercise.name}
      </Text>
      <Text style={styles.exerciseSetsReps}>
        {exercise.sets} sets x {exercise.reps}
        {exercise.muscle ? ` | ${exercise.muscle}` : ''}
      </Text>
    </View>
    <View style={[styles.exerciseThumb, completed && styles.exerciseThumbDone]}>
      <Ionicons name="barbell-outline" size={22} color={COLORS.maroon} />
    </View>
  </TouchableOpacity>
);

const confirmAction = (title, message, confirmText = 'Yes') => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Not yet', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ]
    );
  });
};

export default function WorkoutDayScreen({ route, navigation }) {
  const { dayData } = route.params || {};
  const { user, workoutPlan } = useAuth();

  const sections = Array.isArray(dayData?.sections) ? dayData.sections : [];
  const hasValidDayData = Boolean(dayData?.label && sections.length);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [completedExercises, setCompletedExercises] = useState({});
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [saving, setSaving] = useState(false);
  const activeSection = sections[activeSectionIdx];
  const allExercisesInSection = activeSection?.exercises || [];

  useEffect(() => {
    let isMounted = true;

    const checkToday = async () => {
      if (!user?.id) return;

      const { data } = await getTodayWorkoutSession(user.id);
      if (isMounted) setAlreadyCompletedToday(Boolean(data));
    };

    checkToday();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const toggleExercise = (sectionIdx, exIdx) => {
    const key = `${sectionIdx}-${exIdx}`;
    setCompletedExercises(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isExerciseDone = (sectionIdx, exIdx) => !!completedExercises[`${sectionIdx}-${exIdx}`];

  const isSectionComplete = (sectionIdx) => {
    const section = sections[sectionIdx];
    if (!section) return false;
    return (section.exercises || []).every((_, i) => isExerciseDone(sectionIdx, i));
  };

  const totalExercises = sections.reduce((acc, s) => acc + (s.exercises?.length || 0), 0);
  const totalDone = Object.values(completedExercises).filter(Boolean).length;
  const progressPct = totalExercises > 0 ? (totalDone / totalExercises) * 100 : 0;
  const targetMinutes = dayData?.targetMinutes || 45;
  const estimatedCalories = dayData?.type === 'cardio'
    ? targetMinutes * 8
    : dayData?.type === 'rest'
      ? targetMinutes * 3
      : targetMinutes * 6;
  const midnightCountdown = useMidnightCountdown(
    alreadyCompletedToday,
    () => setAlreadyCompletedToday(false)
  );

  const saveWorkoutSession = async () => {
    if (saving) return;

    setSaving(true);

    if (user) {
      const { data: existingSession, error: existingError } = await getTodayWorkoutSession(user.id);
      if (existingError) {
        setSaving(false);
        Alert.alert('Save Failed', existingError.message);
        return;
      }

      if (existingSession) {
        setSaving(false);
        setAlreadyCompletedToday(true);
        Alert.alert(
          'Workout Already Logged',
          `You already finished a workout today. Next one unlocks in ${midnightCountdown.label}.`
        );
        return;
      }

      const { error } = await logWorkoutSession({
        user_id: user.id,
        day_label: dayData.label,
        day_type: dayData.type,
        completed_at: new Date().toISOString(),
        duration_minutes: targetMinutes,
        calories_burned: estimatedCalories,
        exercises_completed: totalDone,
        notes: JSON.stringify({
          dayNumber: dayData.dayNumber,
          planGeneratedAt: workoutPlan?.generatedAt,
        }),
      });
      if (error) {
        setSaving(false);
        Alert.alert('Save Failed', error.message);
        return;
      }
    }

    setSaving(false);
    setAlreadyCompletedToday(true);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Session saved. Keep up the momentum.');
      navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }

    Alert.alert('Session Saved', 'Session logged. Keep up the momentum.', [
      { text: 'Back to Home', onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }) },
    ]);
  };

  const handleFinishWorkout = async () => {
    if (!hasValidDayData) {
      Alert.alert('Workout Unavailable', 'This workout could not be loaded. Go back and try opening it again.');
      return;
    }

    if (alreadyCompletedToday) {
      Alert.alert(
        'Workout Already Logged',
        `You already finished a workout today. Next one unlocks in ${midnightCountdown.label}.`
      );
      return;
    }

    if (totalExercises > 0 && totalDone < totalExercises) {
      const shouldLogPartial = await confirmAction(
        'Log Workout?',
        `You checked ${totalDone} of ${totalExercises} exercises. Log this session now?`,
        'Log Workout'
      );

      if (!shouldLogPartial) return;
    } else {
      const confirmed = await confirmAction(
        'Workout Complete',
        'Are you done with the workout?',
        'Yes!'
      );

      if (!confirmed) return;
    }

    await saveWorkoutSession();
  };

  const TYPE_COLORS = {
    strength: COLORS.maroon,
    cardio: '#B85C00',
    rest: '#2E7D32',
  };

  if (!hasValidDayData) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.invalidState}>
          <Ionicons name="alert-circle-outline" size={42} color={COLORS.maroon} />
          <Text style={styles.invalidTitle}>Workout Unavailable</Text>
          <Text style={styles.invalidText}>
            This workout could not be loaded. Please return to your plan and open it again.
          </Text>
          <TouchableOpacity
            style={styles.invalidButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Workouts' })}
            activeOpacity={0.85}
          >
            <Text style={styles.invalidButtonText}>Back to Workouts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.maroon, COLORS.maroonDark]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.dayLabel}>Day {dayData?.dayNumber}</Text>
          <Text style={styles.dayTitle}>{dayData?.label}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[dayData?.type] || COLORS.maroon }]}>
          <Text style={styles.typeBadgeText}>{dayData?.type?.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.workoutSummaryBar}>
        <View style={styles.summaryItem}>
          <Ionicons name="timer-outline" size={15} color={COLORS.maroon} />
          <Text style={styles.summaryText}>{targetMinutes} min</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="list-outline" size={15} color={COLORS.maroon} />
          <Text style={styles.summaryText}>{totalExercises} moves</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="pulse-outline" size={15} color={COLORS.maroon} />
          <Text style={styles.summaryText}>{dayData?.intensity || 'Balanced'}</Text>
        </View>
      </View>

      {!!dayData?.focusNote && (
        <View style={styles.adaptedBanner}>
          <Ionicons name="analytics-outline" size={17} color={COLORS.maroon} />
          <Text style={styles.adaptedBannerText}>{dayData.focusNote}</Text>
        </View>
      )}

      {alreadyCompletedToday && (
        <View style={styles.lockedBanner}>
          <Ionicons name="timer-outline" size={18} color={COLORS.success} />
          <Text style={styles.lockedBannerText}>
            Today's workout is complete. Next one unlocks in {midnightCountdown.label}.
          </Text>
        </View>
      )}

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabsScroll}>
          {sections.map((sec, i) => (
            <SectionTab
              key={i}
              title={sec.title}
              active={activeSectionIdx === i}
              done={isSectionComplete(i)}
              onPress={() => setActiveSectionIdx(i)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Exercises */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{activeSection?.title}</Text>
        <Text style={styles.sectionCount}>
          {activeSection?.exercises?.length} exercise{activeSection?.exercises?.length !== 1 ? 's' : ''}
        </Text>

        {allExercisesInSection.map((exercise, exIdx) => (
          <ExerciseRow
            key={exIdx}
            exercise={exercise}
            index={exIdx}
            completed={isExerciseDone(activeSectionIdx, exIdx)}
            onToggle={() => toggleExercise(activeSectionIdx, exIdx)}
          />
        ))}

        {/* Done Section Button */}
        {isSectionComplete(activeSectionIdx) && activeSectionIdx < sections.length - 1 && (
          <TouchableOpacity
            style={styles.nextSectionBtn}
            onPress={() => setActiveSectionIdx(activeSectionIdx + 1)}
            activeOpacity={0.9}
          >
            <Text style={styles.nextSectionText}>Next Section</Text>
          </TouchableOpacity>
        )}

        {/* Finish Workout */}
        <View style={styles.finishBox}>
          <Text style={styles.finishPrompt}>Are you done with the workout?</Text>
          <TouchableOpacity
            style={[styles.finishBtn, (alreadyCompletedToday || saving) && styles.finishBtnDisabled]}
            onPress={handleFinishWorkout}
            disabled={alreadyCompletedToday || saving}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                alreadyCompletedToday || saving
                  ? [COLORS.textMuted, COLORS.textMuted]
                  : [COLORS.maroon, COLORS.maroonLight]
              }
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.finishBtnGrad}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.finishBtnText}>
                {alreadyCompletedToday ? 'Done For Today' : saving ? 'Saving...' : "Yes, I'm Done!"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  dayLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: FONTS.medium, textTransform: 'uppercase', letterSpacing: 1 },
  dayTitle: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.white },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    opacity: 0.9,
  },
  typeBadgeText: { fontSize: 10, fontWeight: FONTS.bold, color: COLORS.white, letterSpacing: 0.5 },
  progressBarBg: { height: 4, backgroundColor: COLORS.maroonSurface },
  progressBarFill: { height: '100%', backgroundColor: COLORS.maroon },
  workoutSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
  },
  summaryText: { fontSize: 12, color: COLORS.maroon, fontWeight: FONTS.semiBold },
  adaptedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.maroonSurface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  adaptedBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    fontWeight: FONTS.medium,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.success,
    fontWeight: FONTS.medium,
  },
  sectionTabs: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  sectionTabsScroll: { paddingHorizontal: SPACING.md, paddingVertical: 12, gap: 8 },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.maroonSurface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sectionTabActive: { borderColor: COLORS.maroon, backgroundColor: COLORS.white },
  sectionTabDone: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  sectionTabText: { fontSize: 13, fontWeight: FONTS.medium, color: COLORS.textSecondary },
  sectionTabTextActive: { color: COLORS.maroon, fontWeight: FONTS.semiBold },
  scroll: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 100, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sectionCount: { fontSize: 13, color: COLORS.textMuted, marginTop: -4 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    ...SHADOW.sm,
  },
  exerciseRowDone: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  exerciseNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.maroonSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumDone: { backgroundColor: COLORS.success },
  exerciseNumText: { fontSize: 13, fontWeight: FONTS.bold, color: COLORS.maroon },
  exerciseInfo: { flex: 1, gap: 3 },
  exerciseName: { fontSize: 15, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  exerciseNameDone: { color: COLORS.success, textDecorationLine: 'line-through' },
  exerciseSetsReps: { fontSize: 12, color: COLORS.textMuted },
  exerciseThumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.maroonSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseThumbDone: { backgroundColor: COLORS.successLight },
  exerciseThumbEmoji: { fontSize: 22 },
  nextSectionBtn: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.maroon,
    borderStyle: 'dashed',
  },
  nextSectionText: { color: COLORS.maroon, fontWeight: FONTS.semiBold, fontSize: 14 },
  finishBox: {
    marginTop: SPACING.md,
    gap: 10,
  },
  finishPrompt: { fontSize: 16, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, textAlign: 'center' },
  finishBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  finishBtnDisabled: { opacity: 0.86 },
  finishBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  finishBtnText: { color: COLORS.white, fontWeight: FONTS.bold, fontSize: 16 },
  invalidState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 12,
  },
  invalidTitle: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  invalidText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  invalidButton: {
    marginTop: 8,
    backgroundColor: COLORS.maroon,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  invalidButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: FONTS.semiBold,
  },
});
