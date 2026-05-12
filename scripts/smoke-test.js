const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');

const rootDir = path.resolve(__dirname, '..');

const loadCommonJsModule = (relativePath) => {
  const filename = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require,
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Set,
  };

  vm.runInNewContext(code, sandbox, { filename });
  return module.exports;
};

const {
  GOAL_LABELS,
  analyzeCollectedWorkoutData,
  calculateBMI,
  generateWorkoutPlan,
} = loadCommonJsModule('src/services/workoutAI.js');

const requiredGoals = [
  'build_muscle',
  'lose_weight',
  'improve_endurance',
  'build_strength',
];

assert.strictEqual(calculateBMI(170, 65), 22.5, 'BMI calculation should be stable');
requiredGoals.forEach((goal) => assert.ok(GOAL_LABELS[goal], `Missing label for ${goal}`));

const assertPlanShape = (plan, goal) => {
  assert.strictEqual(plan.goal, goal, 'Plan should preserve the selected goal');
  assert.strictEqual(plan.totalDays, 5, 'Each generated plan should contain 5 days');
  assert.strictEqual(plan.workoutDays.length, plan.totalDays, 'totalDays should match workoutDays');
  assert.ok(plan.bmi > 0, 'Plan should include BMI');
  assert.ok(plan.bmiCategory?.label, 'Plan should include BMI category');
  assert.ok(plan.adaptation?.intensityLevel, 'Plan should include adaptive analysis');

  plan.workoutDays.forEach((day) => {
    assert.ok(day.dayNumber, 'Workout day should include a day number');
    assert.ok(day.label, 'Workout day should include a label');
    assert.ok(Array.isArray(day.sections), 'Workout day should include sections');
    assert.ok(day.targetMinutes > 0, 'Workout day should include target minutes');

    day.sections.forEach((section) => {
      assert.ok(section.title, 'Section should include a title');
      assert.ok(Array.isArray(section.exercises), 'Section should include exercises');
      assert.ok(section.exercises.length > 0, 'Section should not be empty');

      section.exercises.forEach((exercise) => {
        assert.ok(exercise.name, 'Exercise should include a name');
        assert.ok(exercise.sets >= 1 && exercise.sets <= 6, 'Exercise sets should stay in safe bounds');
        assert.ok(exercise.reps, 'Exercise should include reps or duration text');
      });
    });
  });
};

requiredGoals.forEach((goal) => {
  const plan = generateWorkoutPlan({
    heightCm: 170,
    weightKg: 76,
    goal,
    equipment: ['dumbbells', 'resistance_bands'],
    weekNumber: 1,
  });

  assertPlanShape(plan, goal);
});

const generatedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
const currentPlan = generateWorkoutPlan({
  heightCm: 170,
  weightKg: 76,
  goal: 'lose_weight',
  equipment: ['no_equipment'],
  weekNumber: 1,
});
currentPlan.generatedAt = generatedAt;

const sessions = [1, 2, 3, 4].map((dayNumber) => ({
  completed_at: new Date(Date.now() - (8 - dayNumber) * 24 * 60 * 60 * 1000).toISOString(),
  day_type: dayNumber % 2 === 0 ? 'cardio' : 'strength',
  duration_minutes: 42,
  calories_burned: 280,
  exercises_completed: 9,
  notes: JSON.stringify({ dayNumber }),
}));
const bmiLogs = [
  { bmi: 26.4, recorded_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
  { bmi: 25.9, recorded_at: new Date().toISOString() },
];

const analysis = analyzeCollectedWorkoutData({
  sessions,
  bmiLogs,
  currentPlan,
  profile: {
    goal: 'lose_weight',
    bmi: 25.9,
  },
});

assert.strictEqual(analysis.sourceSessions, sessions.length, 'Analysis should count workout logs');
assert.strictEqual(analysis.bmiLogCount, bmiLogs.length, 'Analysis should count BMI history');
assert.ok(analysis.dataSignals.includes('Workout logs'), 'Analysis should use workout logs');
assert.ok(analysis.dataSignals.includes('BMI history'), 'Analysis should use BMI history');
assert.ok(analysis.completionRate > 0, 'Analysis should compute completion rate');

const adaptedPlan = generateWorkoutPlan({
  heightCm: 170,
  weightKg: 74,
  goal: 'lose_weight',
  equipment: ['no_equipment'],
  weekNumber: 2,
  sessions,
  bmiLogs,
  currentPlan,
});

assertPlanShape(adaptedPlan, 'lose_weight');
assert.strictEqual(adaptedPlan.weekNumber, 2, 'Adapted plan should preserve the requested week');
assert.strictEqual(adaptedPlan.adaptation.sourceSessions, sessions.length, 'Adapted plan should use sessions');
assert.strictEqual(adaptedPlan.adaptation.bmiLogCount, bmiLogs.length, 'Adapted plan should use BMI logs');

console.log('Smoke tests passed: workout generation and adaptive analysis are working.');
