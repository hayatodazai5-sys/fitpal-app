import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getWorkoutSessions, subscribeToUserData } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { GOAL_LABELS } from '../../services/workoutAI';

const WeeklyBar = ({ data }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const max = Math.max(...data, 1);
  return (
    <View style={barStyles.wrap}>
      {days.map((d, i) => {
        const pct = (data[i] || 0) / max;
        const isToday = i === (new Date().getDay() + 6) % 7;
        return (
          <View key={d} style={barStyles.col}>
            <Text style={barStyles.val}>{data[i] ? `${data[i]}m` : ''}</Text>
            <View style={barStyles.barBg}>
              <View style={[barStyles.barFill, { height: `${Math.max(pct * 100, 3)}%` }, isToday && barStyles.today]} />
            </View>
            <Text style={[barStyles.day, isToday && barStyles.dayToday]}>{d}</Text>
          </View>
        );
      })}
    </View>
  );
};
const barStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', height: 110, alignItems: 'flex-end', gap: 6, paddingTop: 20 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  barBg: { flex: 1, width: '100%', backgroundColor: COLORS.maroonSurface, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { backgroundColor: COLORS.maroon, borderRadius: 4 },
  today: { backgroundColor: COLORS.maroonLight },
  day: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium },
  dayToday: { color: COLORS.maroon, fontWeight: FONTS.bold },
  val: { fontSize: 9, color: COLORS.textMuted, position: 'absolute', top: -16 },
});

export default function ProgressScreen() {
  const { user, profile, workoutPlan } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [weekData, setWeekData] = useState([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    loadSessions();
    if (!user?.id) return undefined;

    return subscribeToUserData(user.id, {
      workoutSession: loadSessions,
    });
  }, [user?.id]);

  const loadSessions = async () => {
    if (!user) return;
    const { data } = await getWorkoutSessions(user.id, 20);
    if (data) {
      setSessions(data);
      const chart = [0, 0, 0, 0, 0, 0, 0];
      data.slice(0, 7).forEach((s) => {
        const d = new Date(s.completed_at).getDay();
        const idx = d === 0 ? 6 : d - 1;
        chart[idx] = (chart[idx] || 0) + (s.duration_minutes || 0);
      });
      setWeekData(chart);
    }
  };

  const totalCalories = sessions.reduce((a, s) => a + (s.calories_burned || 0), 0);
  const totalDuration = sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const weekMinutes = weekData.reduce((a, m) => a + m, 0);
  const planAdaptation = workoutPlan?.adaptation;
  const completionPct = Math.round((planAdaptation?.completionRate || 0) * 100);
  const exerciseRatioPct = Math.min(100, Math.round((planAdaptation?.exerciseCompletionRatio || 0) * 100));
  const adaptationSignals = (planAdaptation?.dataSignals || ['Baseline metrics'])
    .map((signal) => signal === 'Profile' ? 'Baseline metrics' : signal)
    .map((signal) => signal === 'Sessions' ? 'Workout logs' : signal)
    .filter((signal, index, list) => list.indexOf(signal) === index);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[COLORS.maroon, COLORS.maroonDark]} style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSub}>Track your fitness journey</Text>
        </LinearGradient>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          {[
            { icon: <Ionicons name="barbell-outline" size={26} color={COLORS.maroon} />, value: sessions.length, label: 'Total\nWorkouts' },
            { icon: <Ionicons name="flame-outline" size={26} color={COLORS.maroon} />, value: totalCalories, label: 'Total\nCalories' },
            { icon: <Ionicons name="time-outline" size={26} color={COLORS.maroon} />, value: `${totalDuration}m`, label: 'Total\nTime' },
            { icon: <Ionicons name="calendar-outline" size={26} color={COLORS.maroon} />, value: `Wk ${workoutPlan?.weekNumber || 1}`, label: 'Current\nWeek' },
          ].map((s, i) => (
            <View key={i} style={styles.statBox}>
              {s.icon}
              <Text style={styles.statBoxValue}>{s.value}</Text>
              <Text style={styles.statBoxLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {!!planAdaptation && (
          <Card style={styles.adaptiveCard}>
            <View style={styles.adaptiveHeader}>
              <View>
                <Text style={styles.sectionTitle}>Adaptive Plan</Text>
                <Text style={styles.adaptiveSub}>Based on your logged training data</Text>
              </View>
              <View style={styles.adaptiveBadge}>
                <Text style={styles.adaptiveBadgeText}>{planAdaptation.intensityLevel}</Text>
              </View>
            </View>
            <View style={styles.adaptiveStats}>
              <View style={styles.adaptiveStat}>
                <Text style={styles.adaptiveStatValue}>{planAdaptation.sourceSessions || 0}</Text>
                <Text style={styles.adaptiveStatLabel}>Sessions</Text>
              </View>
              <View style={styles.adaptiveStat}>
                <Text style={styles.adaptiveStatValue}>{completionPct}%</Text>
                <Text style={styles.adaptiveStatLabel}>Completion</Text>
              </View>
              <View style={styles.adaptiveStat}>
                <Text style={styles.adaptiveStatValue}>{planAdaptation.targetMinutes || 45}m</Text>
                <Text style={styles.adaptiveStatLabel}>Target</Text>
              </View>
            </View>
            <View style={styles.adaptiveInsightGrid}>
              <View style={styles.adaptiveInsight}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.maroon} />
                <Text style={styles.adaptiveInsightValue}>{planAdaptation.recentTrainingDays || 0}</Text>
                <Text style={styles.adaptiveInsightLabel}>Recent Days</Text>
              </View>
              <View style={styles.adaptiveInsight}>
                <Ionicons name="time-outline" size={16} color={COLORS.maroon} />
                <Text style={styles.adaptiveInsightValue}>{planAdaptation.avgDuration || 0}m</Text>
                <Text style={styles.adaptiveInsightLabel}>Avg Time</Text>
              </View>
              <View style={styles.adaptiveInsight}>
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.maroon} />
                <Text style={styles.adaptiveInsightValue}>{exerciseRatioPct}%</Text>
                <Text style={styles.adaptiveInsightLabel}>Exercise Load</Text>
              </View>
            </View>
            <View style={styles.signalRow}>
              {adaptationSignals.map((signal) => (
                <View key={signal} style={styles.signalPill}>
                  <Text style={styles.signalPillText}>{signal}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.adaptiveText}>{planAdaptation.summary}</Text>
          </Card>
        )}

        {/* BMI Info */}
        {profile?.bmi && (
          <Card style={styles.bmiCard}>
            <Text style={styles.sectionTitle}>BMI Overview</Text>
            <View style={styles.bmiRow}>
              <View style={styles.bmiLeft}>
                <Text style={styles.bmiValue}>{profile.bmi}</Text>
                <View style={[styles.bmiCategoryPill, { backgroundColor: COLORS.maroon }]}>
                  <Text style={styles.bmiCategoryText}>
                    {profile.bmi < 18.5 ? 'Underweight' : profile.bmi < 25 ? 'Normal' : profile.bmi < 30 ? 'Overweight' : 'Obese'}
                  </Text>
                </View>
              </View>
              <View style={styles.bmiRight}>
                <Text style={styles.bmiDetail}>Height: {profile.height_cm} cm</Text>
                <Text style={styles.bmiDetail}>Weight: {profile.weight_kg} kg</Text>
                <Text style={styles.bmiDetail}>Goal: {GOAL_LABELS[profile.goal] || '-'}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Weekly Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>This Week's Workouts</Text>
            <View style={styles.weekPill}>
              <Text style={styles.weekPillText}>{weekMinutes} min</Text>
            </View>
          </View>
          <WeeklyBar data={weekData} />
        </Card>

        {/* Recent Sessions */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <Text style={styles.recentCount}>{sessions.length} logged</Text>
          </View>
          {sessions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="barbell-outline" size={26} color={COLORS.maroon} />
              <Text style={styles.emptyText}>No sessions yet. Start your first workout!</Text>
            </View>
          ) : (
            sessions.slice(0, 5).map((s, i) => (
              <View key={i} style={styles.sessionRow}>
                <View style={styles.sessionIcon}>
                  <Ionicons
                    name={s.day_type === 'cardio' ? 'walk-outline' : s.day_type === 'rest' ? 'leaf-outline' : 'barbell-outline'}
                    size={20}
                    color={COLORS.maroon}
                  />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{s.day_label || 'Workout'}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.completed_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.sessionStats}>
                  <Text style={styles.sessionStat}>{s.duration_minutes || 0}m</Text>
                  <Text style={styles.sessionCalories}>{s.calories_burned || 0} cal</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { paddingBottom: 100, gap: SPACING.md },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: FONTS.extraBold, color: COLORS.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  statBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: 'center',
    width: '47%',
    gap: 4,
    ...SHADOW.sm,
  },
  statBoxIcon: { fontSize: 26 },
  statBoxValue: { fontSize: 22, fontWeight: FONTS.extraBold, color: COLORS.maroon },
  statBoxLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16 },
  adaptiveCard: { marginHorizontal: SPACING.md, gap: 12 },
  adaptiveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  adaptiveSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  adaptiveBadge: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adaptiveBadgeText: { color: COLORS.maroon, fontSize: 11, fontWeight: FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  adaptiveStats: { flexDirection: 'row', gap: 8 },
  adaptiveStat: {
    flex: 1,
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  adaptiveStatValue: { fontSize: 17, color: COLORS.maroon, fontWeight: FONTS.bold },
  adaptiveStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  adaptiveInsightGrid: { flexDirection: 'row', gap: 8 },
  adaptiveInsight: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  adaptiveInsightValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  adaptiveInsightLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signalPill: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  signalPillText: { fontSize: 10, color: COLORS.maroon, fontWeight: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  adaptiveText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  bmiCard: { marginHorizontal: SPACING.md, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  bmiLeft: { alignItems: 'center', gap: 8 },
  bmiValue: { fontSize: 42, fontWeight: FONTS.extraBold, color: COLORS.maroon },
  bmiCategoryPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  bmiCategoryText: { color: COLORS.white, fontSize: 12, fontWeight: FONTS.semiBold },
  bmiRight: { gap: 6 },
  bmiDetail: { fontSize: 14, color: COLORS.textSecondary },
  chartCard: { marginHorizontal: SPACING.md },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  weekPill: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekPillText: { fontSize: 11, color: COLORS.maroon, fontWeight: FONTS.bold },
  recentSection: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  recentCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 8,
    ...SHADOW.sm,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 12,
    ...SHADOW.sm,
  },
  sessionIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.maroonSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1, gap: 2 },
  sessionTitle: { fontSize: 14, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  sessionDate: { fontSize: 12, color: COLORS.textMuted },
  sessionStats: { alignItems: 'flex-end', gap: 2 },
  sessionStat: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.maroon },
  sessionCalories: { fontSize: 11, color: COLORS.textMuted },
});
