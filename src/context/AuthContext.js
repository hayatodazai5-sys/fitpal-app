import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getActiveWorkoutPlan,
  getProfile,
  normalizeWorkoutPlan,
  subscribeToUserData,
  supabase,
} from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const loadRequestIdRef = useRef(0);

  const clearUserData = useCallback(() => {
    setProfile(null);
    setWorkoutPlan(null);
  }, []);

  const loadUserData = useCallback(async (userId) => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      const [{ data: profileData }, { data: activePlan }] = await Promise.all([
        getProfile(userId),
        getActiveWorkoutPlan(userId),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      setProfile(profileData);
      setWorkoutPlan(normalizeWorkoutPlan(activePlan?.plan_data));
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;

      clearUserData();
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [clearUserData]);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else {
        loadRequestIdRef.current += 1;
        clearUserData();
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          loadUserData(session.user.id);
        }
        else {
          loadRequestIdRef.current += 1;
          clearUserData();
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      loadRequestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [clearUserData, loadUserData]);

  useEffect(() => {
    if (!user?.id) return undefined;

    return subscribeToUserData(user.id, {
      profile: ({ eventType, new: newProfile }) => {
        setProfile(eventType === 'DELETE' ? null : newProfile);
      },
      workoutPlan: ({ eventType, new: newPlan }) => {
        if (eventType === 'DELETE') {
          loadUserData(user.id);
          return;
        }

        if (newPlan?.is_active) setWorkoutPlan(normalizeWorkoutPlan(newPlan.plan_data));
      },
    });
  }, [loadUserData, user?.id]);

  const refreshProfile = async () => {
    if (user) await loadUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        setProfile,
        workoutPlan,
        setWorkoutPlan,
        loading,
        refreshProfile,
        isSetupComplete: !!profile?.setup_complete,
        isAdmin: profile?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
