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
 * Hard cap on any single Supabase REST request, applied at the fetch layer so
 * it covers every call site — including the ones that bypass the query queue
 * (ops queries, api keys, x402 audit inserts, rate-limit RPC).
 *
 * Why: supabase-js has no default timeout. When the database saturates,
 * requests hang until the Vercel runtime kills the function (30s), holding
 * instances and concurrency slots the whole time. 15s bounds the worst case
 * while staying far above legitimate query latencies (the largest observed
 * read, the full oracle registry, completes in ~1s).
 */
const SUPABASE_FETCH_TIMEOUT_MS = 15_000;

const timeoutFetch: typeof fetch = (input, init) => {
  const callerSignal = init?.signal;
  const hardTimeout = AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS);
  const signal = callerSignal ? AbortSignal.any([callerSignal, hardTimeout]) : hardTimeout;
  return fetch(input, { ...init, signal });
};

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
    global: {
      fetch: timeoutFetch,
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
      fetch: timeoutFetch,
    },
  });
}

/**
 * Admin queries: backed by the service-role client, bypassing ALL RLS.
 * Use ONLY for cron jobs, system-level operations, and writes to tables
 * without user INSERT policies (e.g. price_records).
 *
 * For user-triggered API routes, ALWAYS use getUserQueries() instead.
 */
export function getAdminQueries(): DatabaseQueries {
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
