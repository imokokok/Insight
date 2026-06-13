import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

import { createLogger } from '@/lib/utils/logger';

export type { UserSnapshot } from './queries';

const logger = createLogger('SupabaseClient');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
      );
    }
    logger.warn('Supabase credentials missing, using fallback values for development');
    return createBrowserClient(
      supabaseUrl || 'http://localhost:54321',
      supabaseAnonKey || 'fallback-anon-key'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase: SupabaseClient = createClient();
