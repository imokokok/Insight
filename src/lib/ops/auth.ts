import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerClient } from '@supabase/ssr';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ops-auth');

/**
 * Pure check: is `userId` in the OPS_OWNER_USER_IDS allowlist?
 *
 * Single source of truth shared by BOTH the server gate (`requireOpsOwner`)
 * and the client nav visibility (which receives only this boolean, never the
 * allowlist itself).
 *
 * SECURITY: this is an *authorization* gate, so it fails CLOSED in production.
 * If OPS_OWNER_USER_IDS is unset we DENY in production (NODE_ENV === 'production')
 * — otherwise any authenticated user could reach the internal console. In
 * non-production (local dev / CI) we keep the dev convenience of allowing any
 * user so a solo owner is never locked out before configuring the env. Once the
 * allowlist is set (any environment) it is enforced strictly.
 */
export function isOpsOwner(userId?: string | null): boolean {
  const owners = (process.env.OPS_OWNER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  // Fail-closed in production; dev/CI convenience only when not in production.
  if (owners.length === 0) return process.env.NODE_ENV !== 'production';
  if (!userId) return false;
  return owners.includes(userId);
}

/**
 * Gate an /ops route: must be logged in AND (if OPS_OWNER_USER_IDS is set) the
 * session user must be in the allowlist. Called from the /ops layout so every
 * sub-page inherits the protection. The middleware already bounces
 * unauthenticated users to /login; this adds the owner restriction.
 *
 * SECURITY: in production, if OPS_OWNER_USER_IDS is unset this DENIES access
 * (fail-closed) so the internal console is never world-readable to any logged-in
 * user. See `isOpsOwner` for the full rationale.
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

  if (!isOpsOwner(user.id)) {
    logger.warn('Non-owner attempted /ops access', { userId: user.id });
    redirect('/');
  }

  // L2 hardening: audit trail. One structured line per granted access so we
  // know who entered the internal console and when. (Per-sub-page granularity
  // would require a dedicated audit table — a later L3 upgrade.) We log after
  // both the auth session gate and the optional owner allowlist have passed.
  logger.info('Ops console access granted', {
    userId: user.id,
    email: user.email,
    ownerLockEnabled: (process.env.OPS_OWNER_USER_IDS ?? '').trim().length > 0,
  });
}
