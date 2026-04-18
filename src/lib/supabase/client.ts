import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type DatabaseQueries, createQueries } from './queries';

export type { PriceAlert, AlertEvent } from './queries';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
  );
}

export const supabase: SupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

let clientQueries: DatabaseQueries | null = null;

function getQueries(): DatabaseQueries {
  if (!clientQueries) {
    clientQueries = createQueries(supabase);
  }
  return clientQueries;
}

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

export const queries = getQueries();
