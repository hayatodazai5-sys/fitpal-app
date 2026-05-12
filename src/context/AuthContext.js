import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getActiveWorkoutPlan,
  getProfile,
  subscribeToUserData,
  supabase,
} from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState(null);

  const loadUserData = async (userId) => {
    try {
      const [{ data: profileData }, { data: activePlan }] = await Promise.all([
        getProfile(userId),
        getActiveWorkoutPlan(userId),
      ]);

      setProfile(profileData);
      setWorkoutPlan(activePlan?.plan_data ?? null);
    } catch (err) {
      setProfile(null);
      setWorkoutPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          loadUserData(session.user.id);
        }
        else {
          setProfile(null);
          setWorkoutPlan(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

        if (newPlan?.is_active) setWorkoutPlan(newPlan.plan_data);
      },
    });
  }, [user?.id]);

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
