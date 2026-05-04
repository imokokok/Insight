import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

export type { PriceAlert, AlertEvent, UserSnapshot, UserSnapshotInsert } from './queries';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
  );
}

export const supabase: SupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}
