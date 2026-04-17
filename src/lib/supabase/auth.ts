import { supabase } from './client';

import type { User, Session, AuthError, Provider, AuthChangeEvent } from '@supabase/supabase-js';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface SignUpResponse extends AuthResponse {
  profileError: Error | null;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  preferences?: {
    default_oracle?: string;
    default_symbol?: string;
    default_chain?: string;
    default_time_range?: string;
    language?: string;
    default_currency?: string;
    auto_refresh_interval?: number;
    chart_settings?: {
      show_confidence_interval?: boolean;
      auto_refresh?: boolean;
      refresh_interval?: number;
    };
  };
  notification_settings?: {
    email_alerts?: boolean;
    push_notifications?: boolean;
    alert_frequency?: 'immediate' | 'hourly' | 'daily';
  };
  created_at?: string | Date;
  updated_at?: string | Date;
}

export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  let profileError: Error | null = null;

  if (data.user && !error) {
    const { error: createProfileError } = await createUserProfile(data.user.id, {
      display_name: displayName,
    });
    profileError = createProfileError;
  }

  return {
    user: data.user,
    session: data.session,
    error,
    profileError,
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
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });

  return { error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(
  email: string,
  locale?: string
): Promise<{ error: AuthError | null }> {
  const currentLocale = locale || 'en';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/${currentLocale}/auth/reset-password`,
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

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
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

export interface AvatarUploadResult {
  url: string | null;
  error: Error | null;
}

export async function uploadAvatar(userId: string, file: File): Promise<AvatarUploadResult> {
  try {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return {
        url: null,
        error: new Error(`Invalid file type. Allowed types: ${ALLOWED_AVATAR_TYPES.join(', ')}`),
      };
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return {
        url: null,
        error: new Error(
          `File size exceeds maximum allowed size of ${MAX_AVATAR_SIZE / 1024 / 1024}MB`
        ),
      };
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return {
        url: null,
        error: new Error(`Failed to upload avatar: ${uploadError.message}`),
      };
    }

    const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);

    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return {
        url: null,
        error: new Error(`Failed to update profile with avatar: ${updateError.message}`),
      };
    }

    return {
      url: avatarUrl,
      error: null,
    };
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error : new Error('Unknown error during avatar upload'),
    };
  }
}

export async function deleteAvatar(userId: string): Promise<{ error: Error | null }> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId);

    if (listError) {
      return { error: new Error(`Failed to list avatar files: ${listError.message}`) };
    }

    if (files && files.length > 0) {
      const filesToDelete = files.map((file) => `${userId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(filesToDelete);

      if (deleteError) {
        return { error: new Error(`Failed to delete avatar files: ${deleteError.message}`) };
      }
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return { error: new Error(`Failed to update profile: ${updateError.message}`) };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error during avatar deletion'),
    };
  }
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
