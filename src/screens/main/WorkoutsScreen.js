import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { getWorkoutCompletionStatus, subscribeToUserData } from '../../services/supabase';
import useMidnightCountdown from '../../hooks/useMidnightCountdown';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const TABS = ['All', 'Strength', 'Cardio', 'Recovery'];

const WorkoutCard = ({ day, completed, locked, isNext, onPress }) => {
  const typeColors = {
    strength: COLORS.maroon,
    cardio: '#B85C00',
    rest: '#2E7D32',
  };
  const typeIcons = {
    strength: 'barbell-outline',
    cardio: 'walk-outline',
    rest: 'leaf-outline',
  };

  const exerciseCount = day.sections?.reduce((acc, s) => acc + s.exercises.length, 0) || 0;

  const statusText = completed ? 'COMPLETED' : locked ? 'LOCKED' : isNext ? 'NEXT' : null;

  return (
    <TouchableOpacity
      style={[styles.workoutCard, completed && styles.workoutCardCompleted, locked && styles.workoutCardLocked]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardColorBar, { backgroundColor: typeColors[day.type] || COLORS.maroon }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardDay}>Day {day.dayNumber}</Text>
            <Text style={styles.cardTitle}>{day.label}</Text>
            <Text style={styles.cardFocus} numberOfLines={1}>
              {day.intensity || 'Balanced'} pace
            </Text>
          </View>
          <View style={[styles.cardTypeBadge, { backgroundColor: typeColors[day.type] + '22' }]}>
            <Ionicons
              name={completed ? 'checkmark-circle' : locked ? 'lock-closed-outline' : typeIcons[day.type] || 'barbell-outline'}
              size={22}
              color={typeColors[day.type] || COLORS.maroon}
            />
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <Ionicons name="barbell-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.cardMetaText}>{exerciseCount} exercises</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.cardMetaText}>{day.targetMinutes || 45} min</Text>
          </View>
          <View style={[styles.cardTypePill, { backgroundColor: typeColors[day.type] }]}>
            <Text style={styles.cardTypePillText}>{day.type?.toUpperCase()}</Text>
          </View>
          {statusText && (
            <View style={[styles.cardStatusPill, completed && styles.cardStatusPillDone]}>
              <Text style={[styles.cardStatusText, completed && styles.cardStatusTextDone]}>
                {statusText}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function WorkoutsScreen({ navigation }) {
  const { user, workoutPlan } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [completionStatus, setCompletionStatus] = useState({
    completedDays: 0,
    completedToday: false,
    isPlanComplete: false,
    nextDayIndex: 0,
  });

  const allDays = (workoutPlan?.workoutDays || []).map((day, planIndex) => ({
    ...day,
    planIndex,
  }));
  const totalDays = workoutPlan?.totalDays || allDays.length || 0;
  const completedDays = Math.min(completionStatus.completedDays, totalDays);
  const progressPct = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  const nextWorkoutDay =
    completionStatus.nextWorkoutDay || allDays[completedDays] || null;
  const planIntensity = workoutPlan?.adaptation?.intensityLevel || 'Balanced';
  const targetMinutes = nextWorkoutDay?.targetMinutes || workoutPlan?.adaptation?.targetMinutes || 45;

  useEffect(() => {
    loadCompletionStatus();
    if (!user?.id) return undefined;

    return subscribeToUserData(user.id, {
      workoutSession: loadCompletionStatus,
    });
  }, [user?.id, workoutPlan?.generatedAt, workoutPlan?.totalDays]);

  const loadCompletionStatus = async () => {
    if (!user?.id || !workoutPlan) return;

    const { data } = await getWorkoutCompletionStatus(user.id, workoutPlan);
    if (data) setCompletionStatus(data);
  };

  const midnightCountdown = useMidnightCountdown(
    completionStatus.completedToday,
    loadCompletionStatus
  );

  const handleOpenWorkout = (day) => {
    const completed = day.planIndex < completionStatus.completedDays;
    const isNext = day.planIndex === completionStatus.completedDays;

    if (completionStatus.completedToday) {
      Alert.alert(
        'Workout Done Today',
        completionStatus.isPlanComplete
          ? `Your next plan unlocks in ${midnightCountdown.label}.`
          : `Come back tomorrow for the next workout.\n\nUnlocks in ${midnightCountdown.label}.`
      );
      return;
    }

    if (completionStatus.isPlanComplete) {
      Alert.alert('Plan Complete', 'Generate your next adaptive week from Home.');
      return;
    }

    if (completed) {
      Alert.alert('Already Completed', 'This workout day is already logged.');
      return;
    }

    if (!isNext) {
      Alert.alert('Locked', 'Finish the earlier workout days first.');
      return;
    }

    navigation.navigate('WorkoutDay', { dayData: day });
  };

  const showNotifications = () => {
    Alert.alert('Notifications', 'Workout reminders will appear here when reminders are enabled.');
  };

  const filtered = allDays.filter((d) => {
    const matchTab =
      activeTab === 'All' ||
      (activeTab === 'Strength' && d.type === 'strength') ||
      (activeTab === 'Cardio' && d.type === 'cardio') ||
      (activeTab === 'Recovery' && d.type === 'rest');
    const matchSearch =
      !search ||
      d.label?.toLowerCase().includes(search.toLowerCase()) ||
      d.type?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient colors={[COLORS.maroon, COLORS.maroonDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Workouts</Text>
          <TouchableOpacity style={styles.headerIcon} onPress={showNotifications} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workouts..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Plan info */}
      {workoutPlan && (
        <View style={styles.planInfoWrap}>
          <View style={styles.planInfoBar}>
            <Text style={styles.planInfoText}>
              Week {workoutPlan.weekNumber} | {workoutPlan.totalDays} days | {workoutPlan.bmi} BMI
            </Text>
            <View style={[styles.planInfoBadge, { backgroundColor: workoutPlan.bmiCategory?.color + '22' }]}>
              <Text style={[styles.planInfoBadgeText, { color: workoutPlan.bmiCategory?.color }]}>
                {workoutPlan.bmiCategory?.label}
              </Text>
            </View>
          </View>
          {!!workoutPlan.adaptation && (
            <View style={styles.adaptiveStrip}>
              <Ionicons name="analytics-outline" size={15} color={COLORS.maroon} />
              <Text style={styles.adaptiveStripText}>
                {workoutPlan.adaptation.intensityLevel} plan | {workoutPlan.adaptation.sourceSessions || 0} logged sessions used
              </Text>
            </View>
          )}
          <View style={styles.planSummaryPanel}>
            <View style={styles.planSummaryTop}>
              <View>
                <Text style={styles.planSummaryTitle}>
                  {completionStatus.isPlanComplete ? 'Plan complete' : nextWorkoutDay?.label || 'Next workout'}
                </Text>
                <Text style={styles.planSummarySub}>
                  {completedDays}/{totalDays} days complete
                </Text>
              </View>
              <View style={styles.planSummaryBadge}>
                <Text style={styles.planSummaryBadgeText}>{planIntensity}</Text>
              </View>
            </View>
            <View style={styles.planProgressTrack}>
              <View style={[styles.planProgressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.planMetricRow}>
              <View style={styles.planMetric}>
                <Ionicons name="timer-outline" size={14} color={COLORS.maroon} />
                <Text style={styles.planMetricText}>{targetMinutes} min</Text>
              </View>
              <View style={styles.planMetric}>
                <Ionicons name="barbell-outline" size={14} color={COLORS.maroon} />
                <Text style={styles.planMetricText}>{allDays.length} days</Text>
              </View>
              <View style={styles.planMetric}>
                <Ionicons name="scale-outline" size={14} color={COLORS.maroon} />
                <Text style={styles.planMetricText}>{workoutPlan.adaptation?.bmiLogCount || 0} BMI logs</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {completionStatus.completedToday && (
        <View style={styles.timerBanner}>
          <Ionicons name="timer-outline" size={17} color={COLORS.maroon} />
          <Text style={styles.timerBannerText}>
            {completionStatus.isPlanComplete ? 'Next plan' : 'Next workout'} unlocks in <Text style={styles.timerValue}>{midnightCountdown.label}</Text>
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => `day-${i}`}
        renderItem={({ item }) => (
          <WorkoutCard
            day={item}
            completed={item.planIndex < completionStatus.completedDays}
            locked={
              completionStatus.completedToday ||
              completionStatus.isPlanComplete ||
              item.planIndex > completionStatus.completedDays
            }
            isNext={item.planIndex === completionStatus.completedDays}
            onPress={() => handleOpenWorkout(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={COLORS.maroon} />
            <Text style={styles.emptyTitle}>No Workouts Found</Text>
            <Text style={styles.emptySubtitle}>
              {workoutPlan
                ? 'Try a different filter or search term.'
                : 'Complete your setup to generate your personalized plan!'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: FONTS.extraBold, color: COLORS.white },
  headerIcon: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    gap: 8,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  tabsRow: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  tabsScroll: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.maroonSurface,
  },
  tabActive: { backgroundColor: COLORS.maroon },
  tabText: { fontSize: 13, fontWeight: FONTS.medium, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white, fontWeight: FONTS.semiBold },
  planInfoWrap: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  planInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  planInfoText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  planInfoBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  planInfoBadgeText: { fontSize: 12, fontWeight: FONTS.semiBold },
  adaptiveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
  },
  adaptiveStripText: { fontSize: 12, color: COLORS.textMuted, fontWeight: FONTS.medium },
  planSummaryPanel: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  planSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planSummaryTitle: { fontSize: 15, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  planSummarySub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: FONTS.medium },
  planSummaryBadge: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planSummaryBadgeText: { fontSize: 10, color: COLORS.maroon, fontWeight: FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  planProgressTrack: { height: 7, backgroundColor: COLORS.white, borderRadius: 4, overflow: 'hidden' },
  planProgressFill: { height: '100%', backgroundColor: COLORS.maroon, borderRadius: 4 },
  planMetricRow: { flexDirection: 'row', gap: 8 },
  planMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
  },
  planMetricText: { fontSize: 11, color: COLORS.maroon, fontWeight: FONTS.semiBold },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.maroonSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  timerBannerText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  timerValue: { color: COLORS.maroon, fontWeight: FONTS.bold },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 100 },
  workoutCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  workoutCardCompleted: { opacity: 0.82 },
  workoutCardLocked: { opacity: 0.72 },
  cardColorBar: { width: 5 },
  cardContent: { flex: 1, padding: SPACING.md, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDay: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONTS.medium, textTransform: 'uppercase', letterSpacing: 1 },
  cardTitle: { fontSize: 17, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: 2 },
  cardFocus: { fontSize: 12, color: COLORS.textMuted, fontWeight: FONTS.medium, marginTop: 3 },
  cardTypeBadge: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: COLORS.textMuted },
  cardTypePill: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  cardTypePillText: { fontSize: 10, color: COLORS.white, fontWeight: FONTS.bold, letterSpacing: 0.5 },
  cardStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.maroonSurface,
  },
  cardStatusPillDone: { backgroundColor: COLORS.successLight },
  cardStatusText: { fontSize: 10, color: COLORS.maroon, fontWeight: FONTS.bold, letterSpacing: 0.4 },
  cardStatusTextDone: { color: COLORS.success },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.xl },
});
