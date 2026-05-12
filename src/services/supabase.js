import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_PROJECT_ID = 'njowabhlydrzezleahwx';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const AUTH_CALLBACK_PATH = 'auth/callback';

const configuredAuthRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();

export const getAuthRedirectUrl = () => {
  if (configuredAuthRedirectUrl) return configuredAuthRedirectUrl;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
    const hasProjectBasePath = pathParts[0] && pathParts[0] !== AUTH_CALLBACK_PATH.split('/')[0];
    const basePath = hasProjectBasePath ? `/${pathParts[0]}` : '';

    return `${window.location.origin}${basePath}/${AUTH_CALLBACK_PATH}`;
  }

  return makeRedirectUri({
    scheme: 'fitpal',
    native: `fitpal://${AUTH_CALLBACK_PATH}`,
    path: AUTH_CALLBACK_PATH,
  });
};

export const AUTH_REDIRECT_URL = getAuthRedirectUrl();

const missingConfigMessage =
  'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Add it to .env from your Supabase project settings.';

const webFallbackStorage = new Map();

const authStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
      return webFallbackStorage.get(key) ?? null;
    }

    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      else webFallbackStorage.set(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      else webFallbackStorage.delete(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

if (!hasSupabaseConfig) {
  console.warn(missingConfigMessage);
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || 'missing-anon-key',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

const missingConfigResponse = () =>
  hasSupabaseConfig
    ? null
    : { data: null, error: { message: missingConfigMessage } };

const isPlaceholderName = (name) =>
  String(name || '').trim().toLowerCase() === 'fitpal user';

const fallbackNameFromEmail = (email) => {
  const localPart = String(email || '').split('@')[0];
  const normalized = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return 'Athlete';

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const resolveDisplayName = (email, fullName) => {
  const normalizedFullName = String(fullName || '').trim();
  if (normalizedFullName && !isPlaceholderName(normalizedFullName)) {
    return normalizedFullName;
  }

  return fallbackNameFromEmail(email);
};

export const signUp = async (email, password, fullName) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        full_name: resolveDisplayName(email, fullName),
      },
    },
  });
};

export const resendSignupOtp = async (email) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
};

export const verifySignupOtp = async (email, token) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
};

export const signIn = async (email, password) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.signInWithPassword({ email, password });
};

const createSessionFromUrl = async (url) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode || params.error || params.error_code || params.error_description) {
    return {
      data: null,
      error: {
        message:
          params.error_description ||
          params.error ||
          params.error_code ||
          `OAuth failed: ${errorCode}`,
      },
    };
  }

  const { access_token, refresh_token, code } = params;

  if (code) {
    return supabase.auth.exchangeCodeForSession(code);
  }

  if (!access_token || !refresh_token) {
    return {
      data: null,
      error: { message: 'Google sign-in did not return a Supabase session.' },
    };
  }

  return supabase.auth.setSession({
    access_token,
    refresh_token,
  });
};

const getOAuthSetupError = async (url) => {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    const contentType = response.headers?.get?.('content-type') || '';

    if (!contentType.includes('application/json')) return null;

    const body = await response.json();
    if (body?.error_code === 'validation_failed' && body?.msg?.includes('provider')) {
      return 'Google sign-in is not enabled in Supabase yet. Enable the Google provider with a Google OAuth Web Client ID and Secret.';
    }

    return body?.msg || body?.error_description || body?.error || null;
  } catch (_err) {
    return null;
  }
};

export const signInWithGoogle = async () => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  const redirectUrl = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) return { data: null, error };
  if (!data?.url) {
    return { data: null, error: { message: 'Google sign-in URL was not returned.' } };
  }

  const setupError = await getOAuthSetupError(data.url);
  if (setupError) {
    return { data: null, error: { message: setupError } };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success') {
    return createSessionFromUrl(result.url);
  }

  if (result.type === 'cancel') {
    return { data: null, error: { message: 'Google sign-in was cancelled.' } };
  }

  return { data: null, error: { message: 'Google sign-in did not complete.' } };
};

export const signOut = async () => supabase.auth.signOut();

export const resetPassword = async (email) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.resetPasswordForEmail(email);
};

export const verifyRecoveryOtp = async (email, token) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
};

export const updatePassword = async (password) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  return supabase.auth.updateUser({ password });
};

export const getProfile = async (userId) =>
  supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

export const upsertProfile = async (profile) =>
  supabase.from('profiles').upsert(profile).select().single();

export const getActiveWorkoutPlan = async (userId) =>
  supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

export const getWorkoutPlan = getActiveWorkoutPlan;

export const saveWorkoutPlan = async (plan) =>
  supabase.from('workout_plans').insert(plan).select().single();

export const replaceActiveWorkoutPlan = async (userId, plan) => {
  const configError = missingConfigResponse();
  if (configError) return configError;
  if (!userId || !plan) {
    return { data: null, error: { message: 'Missing user or workout plan.' } };
  }

  const { data: insertedPlan, error: insertError } = await saveWorkoutPlan({
    user_id: userId,
    plan_data: plan,
    is_active: false,
    week_number: plan.weekNumber || 1,
    created_at: plan.generatedAt || new Date().toISOString(),
  });

  if (insertError) return { data: null, error: insertError };

  const { error: deactivateError } = await supabase
    .from('workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (deactivateError) return { data: null, error: deactivateError };

  return supabase
    .from('workout_plans')
    .update({ is_active: true })
    .eq('id', insertedPlan.id)
    .eq('user_id', userId)
    .select()
    .single();
};

export const logWorkoutSession = async (session) =>
  supabase.from('workout_sessions').insert(session).select().single();

export const getWorkoutSessions = async (userId, limit = 20) =>
  supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

const getLocalDateKey = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDayBounds = (dateValue = new Date()) => {
  const start = new Date(dateValue);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

export const getTodayWorkoutSession = async (userId) => {
  const configError = missingConfigResponse();
  if (configError) return configError;
  if (!userId) {
    return { data: null, error: { message: 'Missing user id.' } };
  }

  const { start, end } = getLocalDayBounds();

  return supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString())
    .lt('completed_at', end.toISOString())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
};

export const getWorkoutCompletionStatus = async (userId, plan) => {
  const configError = missingConfigResponse();
  if (configError) return configError;

  const workoutDays = plan?.workoutDays || [];
  const totalDays = plan?.totalDays || workoutDays.length || 0;
  const emptyStatus = {
    sessions: [],
    completedDays: 0,
    completedToday: false,
    isPlanComplete: false,
    nextDayIndex: 0,
    nextWorkoutDay: workoutDays[0] || null,
  };

  if (!userId || !plan) {
    return { data: emptyStatus, error: null };
  }

  let query = supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: true });

  if (plan.generatedAt) {
    query = query.gte('completed_at', plan.generatedAt);
  }

  const { data, error } = await query;
  if (error) return { data: emptyStatus, error };

  const sessions = data || [];
  const completedDateKeys = [...new Set(sessions.map((session) => getLocalDateKey(session.completed_at)))];
  const completedDays = Math.min(completedDateKeys.length, totalDays);
  const nextDayIndex = Math.min(completedDays, Math.max(workoutDays.length - 1, 0));

  return {
    data: {
      sessions,
      completedDays,
      completedToday: completedDateKeys.includes(getLocalDateKey()),
      isPlanComplete: totalDays > 0 && completedDays >= totalDays,
      nextDayIndex,
      nextWorkoutDay: workoutDays[completedDays] || null,
    },
    error: null,
  };
};

export const getWeeklyProgress = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return supabase
    .from('workout_sessions')
    .select('completed_at, duration_minutes, calories_burned, exercises_completed')
    .eq('user_id', userId)
    .gte('completed_at', sevenDaysAgo.toISOString())
    .order('completed_at', { ascending: true });
};

export const logBmi = async ({ userId, heightCm, weightKg, bmi, recordedAt }) =>
  supabase.from('bmi_logs').insert({
    user_id: userId,
    height_cm: heightCm,
    weight_kg: weightKg,
    bmi,
    recorded_at: recordedAt || new Date().toISOString(),
  });

export const getBmiLogs = async (userId, limit = 30) =>
  supabase
    .from('bmi_logs')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

export const getProgressDaily = async (userId, limit = 30) =>
  supabase
    .from('progress_daily')
    .select('*')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .limit(limit);

let userDataSubscriptionId = 0;

const addPostgresChangeHandler = (channel, table, filter, handler) => {
  if (typeof handler !== 'function') return channel;

  return channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table, filter },
    handler
  );
};

export const subscribeToUserData = (userId, handlers = {}) => {
  if (!userId || !hasSupabaseConfig) return () => {};

  const hasHandlers = ['profile', 'workoutPlan', 'workoutSession', 'bmiLog'].some(
    (key) => typeof handlers[key] === 'function'
  );

  if (!hasHandlers) return () => {};

  userDataSubscriptionId += 1;
  const channelName = `fitpal-user-${userId}-${Date.now()}-${userDataSubscriptionId}`;

  const channel = [
    (current) => addPostgresChangeHandler(
      current,
      'profiles',
      `id=eq.${userId}`,
      handlers.profile
    ),
    (current) => addPostgresChangeHandler(
      current,
      'workout_plans',
      `user_id=eq.${userId}`,
      handlers.workoutPlan
    ),
    (current) => addPostgresChangeHandler(
      current,
      'workout_sessions',
      `user_id=eq.${userId}`,
      handlers.workoutSession
    ),
    (current) => addPostgresChangeHandler(
      current,
      'bmi_logs',
      `user_id=eq.${userId}`,
      handlers.bmiLog
    ),
  ].reduce((current, addHandler) => addHandler(current), supabase.channel(channelName));

  channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR') {
      console.warn('FitPAL realtime subscription failed:', err);
    }
  });

  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
};

export const getAdminProfiles = async () =>
  supabase.from('profiles').select('*').order('created_at', { ascending: false });

export const getAdminWorkoutSessions = async () =>
  supabase
    .from('workout_sessions')
    .select('*, profiles(full_name, email)')
    .order('completed_at', { ascending: false });

export const setUserRole = async (userId, role) =>
  supabase.rpc('set_user_role', { target_user_id: userId, new_role: role });
