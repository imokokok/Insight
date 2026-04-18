import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { type DatabaseQueries, createQueries } from './queries';

let serverClient: SupabaseClient | null = null;
let serverQueries: DatabaseQueries | null = null;

export function createServerClient(): SupabaseClient {
  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}

export function getServerQueries(): DatabaseQueries {
  if (serverQueries) {
    return serverQueries;
  }

  const client = createServerClient();
  serverQueries = createQueries(client);

  return serverQueries;
}

function createServerQueries(): DatabaseQueries {
  const client = createServerClient();
  return createQueries(client);
}
