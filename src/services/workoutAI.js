// FitPAL workout generation engine.
// Generates personalized workout plans based on BMI, fitness goal,
// available equipment, and week number for progressive overload.

// Exercise database

const EXERCISES = {
  bodyweight: {
    warmup: [
      { name: 'Jumping Jacks', sets: 1, reps: '30 reps', duration: 60 },
      { name: 'Arm Circles', sets: 1, reps: '20 each direction', duration: 40 },
      { name: 'Hip Rotations', sets: 1, reps: '10 each side', duration: 40 },
      { name: 'Leg Swings', sets: 1, reps: '10 each leg', duration: 40 },
      { name: 'High Knees', sets: 1, reps: '30 seconds', duration: 30 },
    ],
    strength: [
      { name: 'Push-Ups', sets: 3, reps: '10-15 reps', muscle: 'chest' },
      { name: 'Bodyweight Squats', sets: 3, reps: '15-20 reps', muscle: 'legs' },
      { name: 'Lunges', sets: 3, reps: '10 each leg', muscle: 'legs' },
      { name: 'Plank', sets: 3, reps: '30-60 sec', muscle: 'core' },
      { name: 'Glute Bridges', sets: 3, reps: '15 reps', muscle: 'glutes' },
      { name: 'Tricep Dips (Chair)', sets: 3, reps: '10-12 reps', muscle: 'triceps' },
      { name: 'Mountain Climbers', sets: 3, reps: '20 reps', muscle: 'core' },
      { name: 'Superman Hold', sets: 3, reps: '10 reps', muscle: 'back' },
      { name: 'Calf Raises', sets: 3, reps: '20 reps', muscle: 'calves' },
      { name: 'Side Planks', sets: 2, reps: '30 sec each', muscle: 'obliques' },
    ],
    cardio: [
      { name: 'Burpees', sets: 3, reps: '10 reps', muscle: 'full body' },
      { name: 'Jump Squats', sets: 3, reps: '12 reps', muscle: 'legs' },
      { name: 'High Knees', sets: 3, reps: '40 reps', muscle: 'cardio' },
      { name: 'Box Step-Ups (Chair)', sets: 3, reps: '15 each leg', muscle: 'legs' },
      { name: 'Skaters', sets: 3, reps: '20 reps', muscle: 'cardio' },
    ],
    recovery: [
      { name: 'Child\'s Pose', sets: 1, reps: '60 seconds', muscle: 'back' },
      { name: 'Standing Quad Stretch', sets: 1, reps: '30 sec each', muscle: 'quads' },
      { name: 'Seated Hamstring Stretch', sets: 1, reps: '30 sec each', muscle: 'hamstrings' },
      { name: 'Cat-Cow Stretch', sets: 1, reps: '10 reps', muscle: 'spine' },
      { name: 'Pigeon Pose', sets: 1, reps: '45 sec each', muscle: 'hips' },
    ],
  },

  dumbbells: {
    strength: [
      { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12 reps', muscle: 'chest' },
      { name: 'Dumbbell Rows', sets: 3, reps: '10-12 reps', muscle: 'back' },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10 reps', muscle: 'shoulders' },
      { name: 'Dumbbell Lunges', sets: 3, reps: '10 each leg', muscle: 'legs' },
      { name: 'Dumbbell Bicep Curls', sets: 3, reps: '12 reps', muscle: 'biceps' },
      { name: 'Dumbbell Tricep Extension', sets: 3, reps: '12 reps', muscle: 'triceps' },
      { name: 'Goblet Squats', sets: 3, reps: '12-15 reps', muscle: 'legs' },
      { name: 'Dumbbell Romanian Deadlift', sets: 3, reps: '10 reps', muscle: 'hamstrings' },
      { name: 'Lateral Raises', sets: 3, reps: '12-15 reps', muscle: 'shoulders' },
      { name: 'Dumbbell Flyes', sets: 3, reps: '12 reps', muscle: 'chest' },
    ],
  },

  barbell: {
    strength: [
      { name: 'Barbell Back Squat', sets: 4, reps: '5-8 reps', muscle: 'legs' },
      { name: 'Barbell Deadlift', sets: 3, reps: '5 reps', muscle: 'back' },
      { name: 'Barbell Bench Press', sets: 4, reps: '6-10 reps', muscle: 'chest' },
      { name: 'Barbell Overhead Press', sets: 3, reps: '6-8 reps', muscle: 'shoulders' },
      { name: 'Barbell Row', sets: 3, reps: '8-10 reps', muscle: 'back' },
      { name: 'Barbell Hip Thrust', sets: 3, reps: '10-12 reps', muscle: 'glutes' },
      { name: 'Front Squat', sets: 3, reps: '6-8 reps', muscle: 'legs' },
      { name: 'Romanian Deadlift', sets: 3, reps: '8-10 reps', muscle: 'hamstrings' },
    ],
  },

  resistance_bands: {
    strength: [
      { name: 'Band Pull-Aparts', sets: 3, reps: '15-20 reps', muscle: 'back' },
      { name: 'Banded Squats', sets: 3, reps: '15 reps', muscle: 'legs' },
      { name: 'Band Bicep Curls', sets: 3, reps: '12-15 reps', muscle: 'biceps' },
      { name: 'Banded Glute Kickbacks', sets: 3, reps: '15 each leg', muscle: 'glutes' },
      { name: 'Band Chest Press', sets: 3, reps: '12 reps', muscle: 'chest' },
      { name: 'Band Face Pulls', sets: 3, reps: '15 reps', muscle: 'rear delts' },
      { name: 'Banded Lateral Walk', sets: 3, reps: '10 steps each', muscle: 'hips' },
    ],
  },

  machines: {
    strength: [
      { name: 'Leg Press', sets: 4, reps: '10-12 reps', muscle: 'legs' },
      { name: 'Lat Pulldown', sets: 3, reps: '10-12 reps', muscle: 'back' },
      { name: 'Cable Rows', sets: 3, reps: '10-12 reps', muscle: 'back' },
      { name: 'Chest Fly Machine', sets: 3, reps: '12-15 reps', muscle: 'chest' },
      { name: 'Leg Curl Machine', sets: 3, reps: '10-12 reps', muscle: 'hamstrings' },
      { name: 'Leg Extension Machine', sets: 3, reps: '12-15 reps', muscle: 'quads' },
      { name: 'Cable Tricep Pushdown', sets: 3, reps: '12-15 reps', muscle: 'triceps' },
      { name: 'Cable Bicep Curls', sets: 3, reps: '12-15 reps', muscle: 'biceps' },
      { name: 'Shoulder Press Machine', sets: 3, reps: '10-12 reps', muscle: 'shoulders' },
      { name: 'Hip Abductor Machine', sets: 3, reps: '15 reps', muscle: 'hips' },
    ],
  },
};

// BMI calculator

export const calculateBMI = (heightCm, weightKg) => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return parseFloat(bmi.toFixed(1));
};

export const getBMICategory = (bmi) => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#1976D2' };
  if (bmi < 25) return { label: 'Normal', color: '#2E7D32' };
  if (bmi < 30) return { label: 'Overweight', color: '#E65100' };
  return { label: 'Obese', color: '#C62828' };
};

// Helpers

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const pick = (arr, count) => shuffle(arr).slice(0, count);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDateKey = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseSessionNotes = (notes) => {
  if (!notes || typeof notes !== 'string') return {};

  try {
    return JSON.parse(notes);
  } catch (_err) {
    return {};
  }
};

const getExerciseCount = (day) =>
  day?.sections?.reduce((sum, section) => sum + (section.exercises?.length || 0), 0) || 0;

const getEquipmentExercises = (equipment) => {
  const exercises = [...EXERCISES.bodyweight.strength];

  if (equipment.includes('dumbbells')) {
    exercises.push(...EXERCISES.dumbbells.strength);
  }
  if (equipment.includes('barbell')) {
    exercises.push(...EXERCISES.barbell.strength);
  }
  if (equipment.includes('resistance_bands')) {
    exercises.push(...EXERCISES.resistance_bands.strength);
  }
  if (equipment.includes('machines')) {
    exercises.push(...EXERCISES.machines.strength);
  }

  return exercises;
};

export const analyzeCollectedWorkoutData = ({
  sessions = [],
  bmiLogs = [],
  currentPlan = null,
  profile = {},
} = {}) => {
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const normalizedSessions = (sessions || []).filter((session) => session?.completed_at);
  const recentSessions = normalizedSessions.filter(
    (session) => new Date(session.completed_at).getTime() >= fourteenDaysAgo
  );
  const planSessions = currentPlan?.generatedAt
    ? normalizedSessions.filter(
        (session) => new Date(session.completed_at).getTime() >= new Date(currentPlan.generatedAt).getTime()
      )
    : normalizedSessions;

  const completedPlanDays = new Set(planSessions.map((session) => getDateKey(session.completed_at))).size;
  const totalPlanDays = currentPlan?.totalDays || currentPlan?.workoutDays?.length || 0;
  const completionRate = totalPlanDays > 0
    ? clamp(completedPlanDays / totalPlanDays, 0, 1)
    : normalizedSessions.length > 0
      ? 0.6
      : 0;

  const recentTrainingDays = new Set(recentSessions.map((session) => getDateKey(session.completed_at))).size;
  const recentStrengthDays = recentSessions.filter((session) => session.day_type === 'strength').length;
  const recentCardioDays = recentSessions.filter((session) => session.day_type === 'cardio').length;
  const avgDuration = recentSessions.length
    ? Math.round(recentSessions.reduce((sum, session) => sum + toNumber(session.duration_minutes), 0) / recentSessions.length)
    : 0;
  const avgExercises = recentSessions.length
    ? Math.round(recentSessions.reduce((sum, session) => sum + toNumber(session.exercises_completed), 0) / recentSessions.length)
    : 0;
  const avgCalories = recentSessions.length
    ? Math.round(recentSessions.reduce((sum, session) => sum + toNumber(session.calories_burned), 0) / recentSessions.length)
    : 0;

  const plannedExerciseCounts = planSessions
    .map((session) => {
      const notes = parseSessionNotes(session.notes);
      const matchingDay = currentPlan?.workoutDays?.find((day) => day.dayNumber === notes.dayNumber);
      return getExerciseCount(matchingDay);
    })
    .filter(Boolean);
  const fallbackPlanExerciseCounts = (currentPlan?.workoutDays || [])
    .filter((day) => day.type !== 'rest')
    .map(getExerciseCount)
    .filter(Boolean);
  const avgPlannedExercises = plannedExerciseCounts.length
    ? plannedExerciseCounts.reduce((sum, count) => sum + count, 0) / plannedExerciseCounts.length
    : fallbackPlanExerciseCounts.length
      ? fallbackPlanExerciseCounts.reduce((sum, count) => sum + count, 0) / fallbackPlanExerciseCounts.length
      : 0;
  const exerciseCompletionRatio = avgPlannedExercises > 0 && avgExercises > 0
    ? clamp(avgExercises / avgPlannedExercises, 0, 1.25)
    : normalizedSessions.length > 0
      ? 0.8
      : 0;

  const sortedBmiLogs = [...(bmiLogs || [])].sort(
    (a, b) => new Date(b.recorded_at || b.created_at).getTime() - new Date(a.recorded_at || a.created_at).getTime()
  );
  const latestBmi = toNumber(sortedBmiLogs[0]?.bmi, toNumber(profile?.bmi, toNumber(currentPlan?.bmi)));
  const oldestBmi = toNumber(
    sortedBmiLogs[sortedBmiLogs.length - 1]?.bmi,
    latestBmi
  );
  const bmiDelta = Number((latestBmi - oldestBmi).toFixed(1));

  let readinessScore = 0;
  if (completionRate >= 0.8) readinessScore += 2;
  else if (completionRate >= 0.55) readinessScore += 1;
  else if (completionRate > 0 && completionRate < 0.4) readinessScore -= 2;

  if (recentTrainingDays >= 4) readinessScore += 1;
  if (recentTrainingDays <= 1 && normalizedSessions.length > 0) readinessScore -= 1;
  if (avgDuration >= 40) readinessScore += 1;
  if (avgDuration > 0 && avgDuration < 25) readinessScore -= 1;
  if (exerciseCompletionRatio >= 0.95) readinessScore += 1;
  if (exerciseCompletionRatio > 0 && exerciseCompletionRatio < 0.65) readinessScore -= 1;

  const goal = profile?.goal || currentPlan?.goal;
  let cardioExerciseDelta = 0;
  let strengthExerciseDelta = 0;

  if (goal === 'lose_weight' && latestBmi >= 25) cardioExerciseDelta += 1;
  if (goal === 'lose_weight' && bmiDelta >= 0.2) cardioExerciseDelta += 1;
  if ((goal === 'lose_weight' || goal === 'improve_endurance') && recentCardioDays >= recentStrengthDays && recentCardioDays > 0) {
    cardioExerciseDelta += 1;
  }
  if ((goal === 'build_muscle' || goal === 'build_strength') && completionRate >= 0.75) {
    strengthExerciseDelta += 1;
  }
  if ((goal === 'build_muscle' || goal === 'build_strength') && recentStrengthDays >= 3) {
    strengthExerciseDelta += 1;
  }
  if (latestBmi > 0 && latestBmi < 18.5) {
    cardioExerciseDelta -= 1;
    strengthExerciseDelta += 1;
  }

  const intensityLevel = readinessScore >= 3
    ? 'Progressive'
    : readinessScore <= -2
      ? 'Foundation'
      : 'Balanced';
  const setAdjustment = intensityLevel === 'Progressive' ? 1 : intensityLevel === 'Foundation' ? -1 : 0;
  const exerciseDelta = intensityLevel === 'Progressive' ? 1 : intensityLevel === 'Foundation' ? -1 : 0;
  const targetMinutes = intensityLevel === 'Progressive' ? 55 : intensityLevel === 'Foundation' ? 35 : 45;
  const recoveryMinutes = intensityLevel === 'Progressive' ? 30 : intensityLevel === 'Foundation' ? 20 : 25;

  const summaryParts = [];
  const dataSignals = ['Baseline metrics'];
  if (normalizedSessions.length === 0) {
    summaryParts.push('Built from profile data until workout history is available.');
  } else {
    dataSignals.push('Workout logs');
    summaryParts.push(`Adjusted from ${normalizedSessions.length} logged session${normalizedSessions.length === 1 ? '' : 's'}.`);
    summaryParts.push(`${Math.round(completionRate * 100)}% plan completion set ${intensityLevel.toLowerCase()} intensity.`);
  }
  if (sortedBmiLogs.length) dataSignals.push('BMI history');
  if (recentTrainingDays) summaryParts.push(`${recentTrainingDays} recent training day${recentTrainingDays === 1 ? '' : 's'} counted.`);
  if (latestBmi) summaryParts.push(`Latest BMI: ${latestBmi}.`);

  return {
    intensityLevel,
    setAdjustment,
    exerciseDelta,
    cardioExerciseDelta: clamp(cardioExerciseDelta, -1, 2),
    strengthExerciseDelta: clamp(strengthExerciseDelta, -1, 1),
    targetMinutes,
    recoveryMinutes,
    avgDuration,
    avgExercises,
    avgCalories,
    exerciseCompletionRatio,
    completionRate,
    completedPlanDays,
    recentTrainingDays,
    recentStrengthDays,
    recentCardioDays,
    sourceSessions: normalizedSessions.length,
    bmiLogCount: sortedBmiLogs.length,
    dataSignals,
    latestBmi,
    bmiDelta,
    summary: summaryParts.join(' '),
  };
};

// Main generator

export const generateWorkoutPlan = ({
  heightCm,
  weightKg,
  goal,
  equipment = [],
  weekNumber = 1,
  sessions = [],
  bmiLogs = [],
  currentPlan = null,
  collectedData = null,
}) => {
  const bmi = calculateBMI(heightCm, weightKg);
  const selectedEquipment = Array.isArray(equipment) ? equipment : [];
  const isNoEquipment = selectedEquipment.includes('no_equipment') || selectedEquipment.length === 0;
  const availableExercises = isNoEquipment
    ? EXERCISES.bodyweight.strength
    : getEquipmentExercises(selectedEquipment);
  const adjustment = collectedData || analyzeCollectedWorkoutData({
    sessions,
    bmiLogs,
    currentPlan,
    profile: { heightCm, weightKg, goal, equipment: selectedEquipment, bmi },
  });

  // Progressive overload: increase sets/volume as weeks progress
  const volumeMultiplier = 1 + (weekNumber - 1) * 0.1;
  const adjustSets = (sets) => clamp(Math.round(sets * volumeMultiplier) + adjustment.setAdjustment, 1, 6);
  const adaptExercises = (pool, count, mode = 'strength') => {
    const safePool = pool?.length ? pool : EXERCISES.bodyweight.strength;
    const modeDelta = mode === 'cardio' ? adjustment.cardioExerciseDelta : adjustment.strengthExerciseDelta;
    const tunedCount = clamp(count + adjustment.exerciseDelta + modeDelta, 3, 7);
    return pick(safePool, tunedCount).map(e => ({ ...e, sets: adjustSets(e.sets) }));
  };
  const addDayData = (day) => ({
    ...day,
    targetMinutes: day.type === 'rest' ? adjustment.recoveryMinutes : adjustment.targetMinutes,
    intensity: adjustment.intensityLevel,
    focusNote: adjustment.summary,
  });

  const warmupExercises = pick(EXERCISES.bodyweight.warmup, 3);
  const recoveryExercises = pick(EXERCISES.bodyweight.recovery, 4);
  const cardioExercises = EXERCISES.bodyweight.cardio;

  // Determine workout split based on goal
  let workoutDays;

  if (goal === 'lose_weight') {
    // 4 days: 2 full body strength + 2 cardio
    workoutDays = [
      {
        dayNumber: 1,
        label: 'Full Body Strength',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 5, 'strength') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 2,
        label: 'Cardio Burn',
        type: 'cardio',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(cardioExercises, 4, 'cardio') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 3,
        label: 'Rest Day',
        type: 'rest',
        sections: [{ title: 'Active Recovery', exercises: pick(EXERCISES.bodyweight.recovery, 5) }],
      },
      {
        dayNumber: 4,
        label: 'Full Body Strength',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 5, 'strength') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 5,
        label: 'Cardio Burn',
        type: 'cardio',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(cardioExercises, 5, 'cardio') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
    ];
  } else if (goal === 'build_muscle') {
    // 4 days: Push / Pull / Legs / Upper
    const pushExercises = availableExercises.filter(e =>
      ['chest', 'shoulders', 'triceps'].includes(e.muscle)
    );
    const pullExercises = availableExercises.filter(e =>
      ['back', 'biceps'].includes(e.muscle)
    );
    const legExercises = availableExercises.filter(e =>
      ['legs', 'glutes', 'hamstrings', 'quads', 'calves'].includes(e.muscle)
    );

    workoutDays = [
      {
        dayNumber: 1,
        label: 'Push Day',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(pushExercises.length >= 4 ? pushExercises : availableExercises, 5, 'strength') },
          { title: 'Recovery', exercises: pick(recoveryExercises, 3) },
        ],
      },
      {
        dayNumber: 2,
        label: 'Pull Day',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(pullExercises.length >= 4 ? pullExercises : availableExercises, 5, 'strength') },
          { title: 'Recovery', exercises: pick(recoveryExercises, 3) },
        ],
      },
      {
        dayNumber: 3,
        label: 'Leg Day',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(legExercises.length >= 4 ? legExercises : availableExercises, 5, 'strength') },
          { title: 'Recovery', exercises: pick(recoveryExercises, 4) },
        ],
      },
      {
        dayNumber: 4,
        label: 'Rest Day',
        type: 'rest',
        sections: [{ title: 'Active Recovery', exercises: pick(EXERCISES.bodyweight.recovery, 5) }],
      },
      {
        dayNumber: 5,
        label: 'Upper Body',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 6, 'strength') },
          { title: 'Recovery', exercises: pick(recoveryExercises, 3) },
        ],
      },
    ];
  } else if (goal === 'improve_endurance') {
    workoutDays = [
      {
        dayNumber: 1,
        label: 'Endurance Cardio',
        type: 'cardio',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises([...cardioExercises, ...availableExercises], 6, 'cardio') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 2,
        label: 'Functional Strength',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 5, 'strength') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 3,
        label: 'Rest Day',
        type: 'rest',
        sections: [{ title: 'Active Recovery', exercises: pick(EXERCISES.bodyweight.recovery, 5) }],
      },
      {
        dayNumber: 4,
        label: 'HIIT Circuit',
        type: 'cardio',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises([...cardioExercises, ...EXERCISES.bodyweight.strength], 7, 'cardio') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 5,
        label: 'Core & Stability',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises.filter(e => ['core', 'obliques', 'back'].includes(e.muscle)), 5, 'strength') },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
    ];
  } else {
    // build_strength uses a heavy compound focus.
    workoutDays = [
      {
        dayNumber: 1,
        label: 'Strength A',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 5, 'strength').map(e => ({ ...e, sets: clamp(e.sets + 1, 1, 6) })) },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 2,
        label: 'Rest Day',
        type: 'rest',
        sections: [{ title: 'Active Recovery', exercises: pick(EXERCISES.bodyweight.recovery, 5) }],
      },
      {
        dayNumber: 3,
        label: 'Strength B',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 5, 'strength').map(e => ({ ...e, sets: clamp(e.sets + 1, 1, 6) })) },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
      {
        dayNumber: 4,
        label: 'Rest Day',
        type: 'rest',
        sections: [{ title: 'Active Recovery', exercises: pick(EXERCISES.bodyweight.recovery, 5) }],
      },
      {
        dayNumber: 5,
        label: 'Strength C',
        type: 'strength',
        sections: [
          { title: 'Warm-Up', exercises: warmupExercises },
          { title: 'Exercises', exercises: adaptExercises(availableExercises, 6, 'strength').map(e => ({ ...e, sets: clamp(e.sets + 1, 1, 6) })) },
          { title: 'Recovery', exercises: recoveryExercises },
        ],
      },
    ];
  }

  return {
    heightCm,
    weightKg,
    bmi,
    bmiCategory: getBMICategory(bmi),
    goal,
    equipment: selectedEquipment,
    weekNumber,
    totalDays: workoutDays.length,
    workoutDays: workoutDays.map(addDayData),
    adaptation: adjustment,
    generatedAt: new Date().toISOString(),
  };
};

// Weekly adaptation

export const adaptWorkoutPlan = (currentPlan, feedback) => {
  const { weekNumber, goal, equipment, heightCm, weightKg } = currentPlan;
  const newWeek = weekNumber + 1;

  // Regenerate with increased week number for progressive overload
  return generateWorkoutPlan({
    heightCm,
    weightKg,
    goal,
    equipment,
    weekNumber: newWeek,
    sessions: feedback?.sessions || [],
    bmiLogs: feedback?.bmiLogs || [],
    currentPlan,
  });
};

// Goal labels

export const GOAL_LABELS = {
  build_muscle: 'Build Muscle',
  lose_weight: 'Lose Weight',
  improve_endurance: 'Improve Endurance',
  build_strength: 'Build Strength',
};

export const EQUIPMENT_LABELS = {
  no_equipment: 'No Equipment',
  dumbbells: 'Dumbbells',
  barbell: 'Barbell',
  resistance_bands: 'Resistance Bands',
  machines: 'Machines',
};
