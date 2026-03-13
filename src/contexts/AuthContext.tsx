'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, Session, AuthError, Provider } from '@supabase/supabase-js';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithOAuth as authSignInWithOAuth,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getSession,
  getUser,
  onAuthStateChange,
  createUserProfile,
  getUserProfile,
} from '@/lib/supabase/auth';
import type { UserProfile } from '@/lib/supabase/auth';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { profile: userProfile, error: profileError } = await getUserProfile(userId);
      if (profileError) {
        if (profileError.message.includes('No rows found')) {
          const { profile: newProfile } = await createUserProfile(userId, {
            display_name: session?.user?.user_metadata?.display_name,
          });
          if (newProfile) {
            setProfile(newProfile);
          }
        }
      } else if (userProfile) {
        setProfile(userProfile);
      }
    },
    [session]
  );

  const initializeAuth = useCallback(async () => {
    try {
      setLoading(true);
      const { session: currentSession } = await getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    initializeAuth();

    const subscription = onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth, fetchProfile]);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setLoading(true);
      setError(null);

      const {
        user: newUser,
        session: newSession,
        error: signUpError,
      } = await authSignUp(email, password, displayName);

      if (signUpError) {
        setError(signUpError);
        setLoading(false);
        return { error: signUpError };
      }

      setUser(newUser);
      setSession(newSession);

      if (newUser) {
        await fetchProfile(newUser.id);
      }

      setLoading(false);
      return { error: null };
    },
    [fetchProfile]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      const {
        user: signInUser,
        session: signInSession,
        error: signInError,
      } = await authSignIn(email, password);

      if (signInError) {
        setError(signInError);
        setLoading(false);
        return { error: signInError };
      }

      setUser(signInUser);
      setSession(signInSession);

      if (signInUser) {
        await fetchProfile(signInUser.id);
      }

      setLoading(false);
      return { error: null };
    },
    [fetchProfile]
  );

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    setLoading(true);
    setError(null);

    const { error: oauthError } = await authSignInWithOAuth(provider);

    if (oauthError) {
      setError(oauthError);
      setLoading(false);
      return { error: oauthError };
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { error: signOutError } = await authSignOut();

    if (signOutError) {
      setError(signOutError);
      setLoading(false);
      return { error: signOutError };
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);

    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    const { error: resetError } = await authResetPassword(email);

    if (resetError) {
      setError(resetError);
      setLoading(false);
      return { error: resetError };
    }

    setLoading(false);
    return { error: null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useOptionalAuth(): AuthContextValue | null {
  const context = useContext(AuthContext);
  return context ?? null;
}

export { AuthContext };
