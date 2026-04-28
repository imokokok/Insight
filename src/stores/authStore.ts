import { useMemo } from 'react';

import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import { apiClient } from '@/lib/api';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithOAuth as authSignInWithOAuth,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  resendVerification as authResendVerification,
  getSession,
  onAuthStateChange,
  createUserProfile,
} from '@/lib/supabase/auth';
import type { UserProfile } from '@/lib/supabase/auth';
import { createLogger } from '@/lib/utils/logger';

import type { User, Session, AuthError, Provider, Subscription } from '@supabase/supabase-js';

const logger = createLogger('authStore');

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  initialized: boolean;
  _initializing: boolean;
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
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resendVerification: (email: string) => Promise<{ error: AuthError | null }>;
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
  try {
    const response = await apiClient.get<{ profile: UserProfile }>('/api/auth/profile');
    return response.data.profile;
  } catch {
    try {
      const { profile: newProfile, error: createError } = await createUserProfile(userId, {
        display_name: session?.user?.user_metadata?.display_name,
      });
      if (createError) {
        logger.error(
          'Failed to create user profile',
          createError instanceof Error ? createError : new Error(String(createError))
        );
        return null;
      }
      return newProfile;
    } catch (createErr) {
      logger.error(
        'Failed to create user profile after fetch failure',
        createErr instanceof Error ? createErr : new Error(String(createErr))
      );
      return null;
    }
  }
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        session: null,
        profile: null,
        loading: true,
        error: null,
        initialized: false,
        _initializing: false,
        subscription: null,

        initialize: async () => {
          if (get().initialized) return;
          if ((get() as AuthStore)._initializing) return;
          set({ _initializing: true } as Partial<AuthStore>);

          set({ loading: true, error: null });

          try {
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
              try {
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
              } catch (err) {
                logger.error(
                  'Auth state change handler error',
                  err instanceof Error ? err : new Error(String(err))
                );
              }
            });

            set({
              subscription,
              initialized: true,
              loading: false,
              _initializing: false,
            } as Partial<AuthStore>);
          } catch (err) {
            set({
              error: err as Error,
              loading: false,
              initialized: true,
              _initializing: false,
            } as Partial<AuthStore>);
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

          if (newUser && newSession) {
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

          set({ loading: false });
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

        updatePassword: async (newPassword: string) => {
          set({ loading: true, error: null });

          const { error: updateError } = await authUpdatePassword(newPassword);

          if (updateError) {
            set({ error: updateError, loading: false });
            return { error: updateError };
          }

          set({ loading: false });
          return { error: null };
        },

        resendVerification: async (email: string) => {
          set({ loading: true, error: null });

          const { error: resendError } = await authResendVerification(email);

          if (resendError) {
            set({ error: resendError, loading: false });
            return { error: resendError };
          }

          set({ loading: false });
          return { error: null };
        },

        refreshProfile: async () => {
          const { user, session } = get();
          if (user) {
            try {
              const profile = await fetchUserProfile(user.id, session);
              set({ profile });
            } catch (err) {
              logger.error(
                'Failed to refresh profile',
                err instanceof Error ? err : new Error(String(err))
              );
            }
          }
        },

        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        setProfile: (profile) => set({ profile }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          profile: state.profile,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          if (state.profile) {
            const profile = { ...state.profile };
            if (profile.created_at && typeof profile.created_at === 'string') {
              profile.created_at = new Date(profile.created_at);
            }
            if (profile.updated_at && typeof profile.updated_at === 'string') {
              profile.updated_at = new Date(profile.updated_at);
            }
            state.profile = profile;
          }
        },
      }
    ),
    { name: 'AuthStore' }
  )
);

export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthInitialized = () => useAuthStore((state) => state.initialized);

export const useAuthActions = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const cleanup = useAuthStore((state) => state.cleanup);
  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithOAuth = useAuthStore((state) => state.signInWithOAuth);
  const signOut = useAuthStore((state) => state.signOut);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const resendVerification = useAuthStore((state) => state.resendVerification);
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
      updatePassword,
      resendVerification,
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
      updatePassword,
      resendVerification,
      refreshProfile,
      clearError,
    ]
  );
};
