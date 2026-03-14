import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseQueries, createQueries } from './queries';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
