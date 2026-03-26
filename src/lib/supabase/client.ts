import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

import { type DatabaseQueries, createQueries } from './queries';

export type {
  PriceRecord,
  PriceRecordInsert,
  UserSnapshot,
  UserSnapshotInsert,
  UserFavorite,
  UserFavoriteInsert,
  PriceAlert,
  PriceAlertInsert,
  AlertEvent,
  AlertEventInsert,
  UserProfile,
  UserProfileUpdate,
  PriceRecordsFilters,
} from './queries';

export { DatabaseQueries, createQueries } from './queries';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

export const supabase: SupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

let clientQueries: DatabaseQueries | null = null;

export function getQueries(): DatabaseQueries {
  if (!clientQueries) {
    clientQueries = createQueries(supabase);
  }
  return clientQueries;
}

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

export const queries = getQueries();
