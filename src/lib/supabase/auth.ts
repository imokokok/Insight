import { supabase } from './client';
import type { User, Session, AuthError, Provider } from '@supabase/supabase-js';
import { Blockchain, OracleProvider } from '../types/oracle';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  preferences?: {
    defaultSymbol?: string;
    defaultChain?: Blockchain;
    defaultProvider?: OracleProvider;
    refreshInterval?: number;
    notificationsEnabled?: boolean;
    theme?: 'light' | 'dark' | 'system';
  };
  notification_settings?: {
    email_alerts?: boolean;
    push_notifications?: boolean;
    alert_frequency?: 'immediate' | 'hourly' | 'daily';
  };
  created_at?: string;
  updated_at?: string;
}

export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (data.user && !error) {
    await createUserProfile(data.user.id, {
      display_name: displayName,
    });
  }

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signInWithOAuth(provider: Provider): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { error };
}

export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return {
    user: data.user,
    session: null,
    error,
  };
}

export async function getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.getSession();
  return {
    session: data.session,
    error,
  };
}

export async function getUser(): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.getUser();
  return {
    user: data.user,
    error,
  };
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
}

export async function createUserProfile(
  userId: string,
  data: { display_name?: string | null }
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      display_name: data.display_name || null,
    })
    .select()
    .single();

  return {
    profile: profile as UserProfile | null,
    error: error as Error | null,
  };
}

export async function getUserProfile(
  userId: string
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return {
    profile: data as UserProfile | null,
    error: error as Error | null,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<
    Pick<UserProfile, 'display_name' | 'avatar_url' | 'preferences' | 'notification_settings'>
  >
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  return {
    profile: data as UserProfile | null,
    error: error as Error | null,
  };
}
