import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerClient } from '@supabase/ssr';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ops-auth');

/**
 * Gate an /ops route: must be logged in AND (if OPS_OWNER_USER_IDS is set) the
 * session user must be in the allowlist. Called from the /ops layout so every
 * sub-page inherits the protection. The middleware already bounces
 * unauthenticated users to /login; this adds the owner restriction.
 *
 * If OPS_OWNER_USER_IDS is unset we allow any authenticated user (dev convenience
 * so a solo owner is never locked out before configuring the env). Once set, it
 * is enforced strictly.
 */
export async function requireOpsOwner(): Promise<void> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect('/login?redirect=/ops');
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Read-only gate; we never write auth cookies from a Server Component.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/ops');
  }

  const owners = (process.env.OPS_OWNER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (owners.length > 0 && !owners.includes(user.id)) {
    logger.warn('Non-owner attempted /ops access', { userId: user.id });
    redirect('/');
  }
}
