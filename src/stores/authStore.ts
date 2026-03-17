import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useMemo } from 'react';
import type { User, Session, AuthError, Provider, Subscription } from '@supabase/supabase-js';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithOAuth as authSignInWithOAuth,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getSession,
  onAuthStateChange,
  createUserProfile,
  getUserProfile,
} from '@/lib/supabase/auth';
import type { UserProfile } from '@/lib/supabase/auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  initialized: boolean;
  subscription: Subscription | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  cleanup: () => void;
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
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AuthError | Error | null) => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const fetchUserProfile = async (userId: string, session: Session | null) => {
  const { profile: userProfile, error: profileError } = await getUserProfile(userId);
  if (profileError) {
    if (profileError.message.includes('No rows found')) {
      const { profile: newProfile } = await createUserProfile(userId, {
        display_name: session?.user?.user_metadata?.display_name,
      });
      return newProfile;
    }
    return null;
  }
  return userProfile;
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      loading: true,
      error: null,
      initialized: false,
      subscription: null,

      initialize: async () => {
        try {
          set({ loading: true, error: null });
          const { session: currentSession } = await getSession();
          const currentUser = currentSession?.user ?? null;

          set({
            session: currentSession,
            user: currentUser,
          });

          if (currentSession?.user) {
            const profile = await fetchUserProfile(currentSession.user.id, currentSession);
            set({ profile });
          }

          const existingSubscription = get().subscription;
          if (existingSubscription) {
            existingSubscription.unsubscribe();
          }

          const subscription = onAuthStateChange(async (event, newSession) => {
            set({
              session: newSession,
              user: newSession?.user ?? null,
            });

            if (event === 'SIGNED_IN' && newSession?.user) {
              const profile = await fetchUserProfile(newSession.user.id, newSession);
              set({ profile });
            } else if (event === 'SIGNED_OUT') {
              set({ profile: null });
            }
          });

          set({ subscription, initialized: true, loading: false });
        } catch (err) {
          set({ error: err as Error, loading: false, initialized: true });
        }
      },

      cleanup: () => {
        const { subscription } = get();
        if (subscription) {
          subscription.unsubscribe();
          set({ subscription: null });
        }
      },

      signUp: async (email: string, password: string, displayName?: string) => {
        set({ loading: true, error: null });

        const {
          user: newUser,
          session: newSession,
          error: signUpError,
        } = await authSignUp(email, password, displayName);

        if (signUpError) {
          set({ error: signUpError, loading: false });
          return { error: signUpError };
        }

        set({
          user: newUser,
          session: newSession,
        });

        if (newUser) {
          const profile = await fetchUserProfile(newUser.id, newSession);
          set({ profile });
        }

        set({ loading: false });
        return { error: null };
      },

      signIn: async (email: string, password: string) => {
        set({ loading: true, error: null });

        const {
          user: signInUser,
          session: signInSession,
          error: signInError,
        } = await authSignIn(email, password);

        if (signInError) {
          set({ error: signInError, loading: false });
          return { error: signInError };
        }

        set({
          user: signInUser,
          session: signInSession,
        });

        if (signInUser) {
          const profile = await fetchUserProfile(signInUser.id, signInSession);
          set({ profile });
        }

        set({ loading: false });
        return { error: null };
      },

      signInWithOAuth: async (provider: Provider) => {
        set({ loading: true, error: null });

        const { error: oauthError } = await authSignInWithOAuth(provider);

        if (oauthError) {
          set({ error: oauthError, loading: false });
          return { error: oauthError };
        }

        return { error: null };
      },

      signOut: async () => {
        set({ loading: true, error: null });

        const { error: signOutError } = await authSignOut();

        if (signOutError) {
          set({ error: signOutError, loading: false });
          return { error: signOutError };
        }

        set({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });

        return { error: null };
      },

      resetPassword: async (email: string) => {
        set({ loading: true, error: null });

        const { error: resetError } = await authResetPassword(email);

        if (resetError) {
          set({ error: resetError, loading: false });
          return { error: resetError };
        }

        set({ loading: false });
        return { error: null };
      },

      refreshProfile: async () => {
        const { user, session } = get();
        if (user) {
          const profile = await fetchUserProfile(user.id, session);
          set({ profile });
        }
      },

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    { name: 'AuthStore' }
  )
);

export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthInitialized = () => useAuthStore((state) => state.initialized);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);

export const useAuthActions = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const cleanup = useAuthStore((state) => state.cleanup);
  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithOAuth = useAuthStore((state) => state.signInWithOAuth);
  const signOut = useAuthStore((state) => state.signOut);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const clearError = useAuthStore((state) => state.clearError);

  return useMemo(
    () => ({
      initialize,
      cleanup,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword,
      refreshProfile,
      clearError,
    }),
    [
      initialize,
      cleanup,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword,
      refreshProfile,
      clearError,
    ]
  );
};
