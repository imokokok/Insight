import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { type DatabaseQueries, createQueries } from './queries';

let serverClientInstance: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  return supabaseUrl;
}

function getSupabaseAnonKey(): string {
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      'Missing SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
    );
  }
  return anonKey;
}

/**
 * Service-role client: bypasses ALL Row Level Security (RLS).
 * Use ONLY for privileged/admin operations that cannot rely on user RLS,
 * e.g. cron jobs, account deletion, seeding, or writes to tables without
 * user INSERT policies (such as price_records writes).
 *
 * Never use this for user-triggered reads/writes of user-owned data.
 */
export function createServiceRoleClient(): SupabaseClient {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  serverClientInstance = createClient(getSupabaseUrl(), supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClientInstance;
}

/**
 * User-scoped client: uses the anon key and forwards the caller's JWT so that
 * Supabase RLS policies (auth.uid()) are enforced.
 *
 * Use for user-triggered API routes that read/write user-owned data.
 * Pass the user's access token extracted from the Authorization header.
 */
export function createUserClient(accessToken?: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

export function getServerQueries(): DatabaseQueries {
  const client = createServiceRoleClient();
  return createQueries(client);
}

/**
 * Build a queries helper backed by a user-scoped client (RLS-enforced).
 * Pass the user's access token from the request context.
 */
export function getUserQueries(accessToken: string): DatabaseQueries {
  const client = createUserClient(accessToken);
  return createQueries(client);
}
