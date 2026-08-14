import { PLANS, normalizePlan, type Plan } from '@/lib/billing/plans';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('api-key');

const KEY_PREFIX = 'ins_';
const KEY_BYTES = 32;

interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  plan: string;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  monthly_quota_used?: number;
  quota_reset_at?: string;
  trial_ends_at?: string | null;
}

export interface ApiKeyValidationResult {
  keyId: string;
  userId: string;
  plan: string;
  rateLimit: number;
  monthlyQuotaUsed: number;
  quotaResetAt: string;
  trialEndsAt: string | null;
}

interface GeneratedApiKey {
  name: string;
  plainKey: string;
  prefix: string;
  keyHash: string;
}

async function hashApiKey(plainKey: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plainKey));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiKey(name: string): GeneratedApiKey {
  const randomBytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  const randomPart = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const plainKey = `${KEY_PREFIX}${randomPart}`;
  const prefix = plainKey.slice(0, 8);

  return {
    name,
    plainKey,
    prefix,
    keyHash: '', // filled by caller after awaiting hashApiKey
  };
}

async function prepareApiKeyForStorage(name: string): Promise<GeneratedApiKey> {
  const generated = generateApiKey(name);
  const keyHash = await hashApiKey(generated.plainKey);
  return { ...generated, keyHash };
}

// Short-lived cache for validated API keys. Avoids a DB round-trip on every
// single API request for high-frequency consumers. A revoked/deactivated key
// may remain valid for up to CACHE_TTL_MS after revocation — this is an
// acceptable trade-off (the hourly api-keys-deactivation cron is far slower).
// Cache miss / lookup error falls through to a live DB query.
const API_KEY_CACHE_TTL_MS = 30 * 1000; // 30 seconds
const apiKeyCache = new Map<string, { result: ApiKeyValidationResult | null; expiresAt: number }>();

function getCachedApiKey(keyHash: string): ApiKeyValidationResult | null | undefined {
  const entry = apiKeyCache.get(keyHash);
  if (!entry) return undefined; // cache miss
  if (Date.now() > entry.expiresAt) {
    apiKeyCache.delete(keyHash);
    return undefined; // expired
  }
  return entry.result;
}

function setCachedApiKey(keyHash: string, result: ApiKeyValidationResult | null): void {
  apiKeyCache.set(keyHash, { result, expiresAt: Date.now() + API_KEY_CACHE_TTL_MS });
  // Lazy eviction: if the cache grows large, prune expired entries to bound
  // memory. This only runs on insert, not on the hot read path.
  if (apiKeyCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of apiKeyCache) {
      if (now > v.expiresAt) apiKeyCache.delete(k);
    }
  }
}

/** Invalidate a cached key immediately (e.g. after revocation). */
function invalidateApiKeyCache(keyHash?: string): void {
  if (keyHash) {
    apiKeyCache.delete(keyHash);
  } else {
    apiKeyCache.clear();
  }
}

export async function validateApiKey(plainKey: string): Promise<ApiKeyValidationResult | null> {
  if (!plainKey.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = await hashApiKey(plainKey);

  const cached = getCachedApiKey(keyHash);
  if (cached !== undefined) {
    return cached;
  }

  const client = createServiceRoleClient();

  try {
    const { data, error } = await client
      .from('api_keys')
      .select(
        'id, user_id, plan, rate_limit, is_active, expires_at, monthly_quota_used, quota_reset_at, trial_ends_at'
      )
      .eq('key_hash', keyHash)
      .single();

    if (error) {
      // DB lookup error (network, timeout, etc.). Do NOT cache null here —
      // caching would cause valid keys to be rejected for CACHE_TTL_MS
      // during transient DB issues. Let the next request retry the lookup.
      logger.debug('API key lookup error', { error: error.message });
      return null;
    }

    if (!data) {
      // Key not found in DB — cache the negative result to avoid repeated
      // lookups for invalid keys.
      logger.debug('API key not found');
      setCachedApiKey(keyHash, null);
      return null;
    }

    if (!data.is_active) {
      logger.debug('API key is inactive', { keyId: data.id });
      setCachedApiKey(keyHash, null);
      return null;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      logger.debug('API key expired', { keyId: data.id });
      setCachedApiKey(keyHash, null);
      return null;
    }

    const result: ApiKeyValidationResult = {
      keyId: data.id,
      userId: data.user_id,
      plan: data.plan,
      rateLimit: data.rate_limit,
      monthlyQuotaUsed: data.monthly_quota_used ?? 0,
      quotaResetAt: data.quota_reset_at ?? new Date().toISOString(),
      trialEndsAt: data.trial_ends_at ?? null,
    };

    setCachedApiKey(keyHash, result);

    // Update last_used_at asynchronously; do not block the request on this.
    // Throttled by the cache: only fires once per CACHE_TTL_MS per key.
    client
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          logger.warn('Failed to update last_used_at', {
            keyId: data.id,
            error: updateError.message,
          });
        }
      });

    return result;
  } catch (error) {
    logger.error('API key validation failed', normalizeError(error));
    return null;
  }
}

export async function listApiKeysForUser(
  userId: string
): Promise<Omit<ApiKeyRecord, 'key_hash'>[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('api_keys')
    .select(
      'id, user_id, name, key_prefix, plan, rate_limit, is_active, last_used_at, expires_at, created_at, updated_at, monthly_quota_used, quota_reset_at, trial_ends_at'
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to list API keys', error);
    throw new Error('Failed to list API keys');
  }

  return data ?? [];
}

export async function createApiKeyForUser(
  userId: string,
  name: string,
  options: {
    plan?: string;
    rateLimit?: number;
    expiresAt?: string | null;
    trialEndsAt?: string | null;
  } = {}
): Promise<{ record: Omit<ApiKeyRecord, 'key_hash'>; plainKey: string }> {
  const prepared = await prepareApiKeyForStorage(name);
  const client = createServiceRoleClient();

  const plan: Plan = normalizePlan(options.plan);
  // Default rate_limit comes from the plan config (Free=5, Pro=30, Protocol=60).
  // Explicit overrides (e.g. admin tooling) still win.
  const rateLimit = options.rateLimit ?? PLANS[plan].rateLimit;

  const { data, error } = await client
    .from('api_keys')
    .insert({
      user_id: userId,
      name: prepared.name,
      key_hash: prepared.keyHash,
      key_prefix: prepared.prefix,
      plan,
      rate_limit: rateLimit,
      expires_at: options.expiresAt ?? null,
      trial_ends_at: options.trialEndsAt ?? null,
    })
    .select(
      'id, user_id, name, key_prefix, plan, rate_limit, is_active, last_used_at, expires_at, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    logger.error('Failed to create API key', error);
    throw new Error('Failed to create API key');
  }

  return { record: data, plainKey: prepared.plainKey };
}

export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('api_keys')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to revoke API key', error);
    throw new Error('Failed to revoke API key');
  }

  // Clear the validation cache so the revoked key stops working immediately.
  // We can't selectively invalidate by key_hash here (only keyId is known),
  // but revocation is a rare user-initiated action so a full flush is fine.
  invalidateApiKeyCache();
}

interface ApiKeyUsageRecord {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
}

export async function logApiKeyUsage(record: ApiKeyUsageRecord): Promise<void> {
  const client = createServiceRoleClient();

  const payload = {
    api_key_id: record.apiKeyId,
    endpoint: record.endpoint,
    method: record.method,
    status_code: record.statusCode,
    response_time_ms: record.responseTimeMs,
    ip_address: record.ipAddress ?? null,
    user_agent: record.userAgent ?? null,
  };

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 50;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await client.from('api_key_usage').insert(payload);

    if (!error) {
      return;
    }

    if (attempt === MAX_RETRIES) {
      logger.warn('Failed to log API key usage after retries', {
        apiKeyId: record.apiKeyId,
        endpoint: record.endpoint,
        attempts: MAX_RETRIES,
        error: error.message,
      });
      return;
    }

    // Exponential backoff with jitter: 50ms, 100ms, 200ms.
    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * delay);
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));
  }
}

// ---------------------------------------------------------------------------
// Quota & plan management functions.
// Used by: quotaMiddleware (incrementApiKeyQuota), planGuard
// (getDailyEndpointUsage), cron/billing (resetMonthlyQuota,
// downgradeExpiredTrials), webhook handler (updateApiKeyPlanForUser).
// ---------------------------------------------------------------------------

/**
 * Atomically increment the monthly quota counter for a key. Called by
 * quotaMiddleware after a successful request. Uses a PostgreSQL RPC
 * (increment_api_key_quota) to avoid the read-modify-write race that would
 * occur with a SELECT + UPDATE pattern.
 *
 * Note: this is fire-and-forget from the request path (the handler already
 * calls logApiKeyUsage async). A missed increment here only means the user
 * gets slightly more quota than they paid for — acceptable trade-off vs
 * blocking every API call on a synchronous DB write.
 */
export async function incrementApiKeyQuota(keyId: string): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.rpc('increment_api_key_quota', { key_id: keyId });

  if (error) {
    logger.warn('Failed to increment API key quota', { keyId, error: error.message });
  }
}

/**
 * Count today's calls to a specific endpoint across all of a user's API keys.
 * Used by planGuard to enforce the Free-tier daily trial quota on Tier 2
 * endpoints.
 *
 * Intentionally NOT cached. A previous 5-minute cache let a Free user fire a
 * burst of Tier 2 requests that all saw the same stale count (0) and were all
 * admitted, effectively bypassing the 5-calls/day trial limit. The DB hit per
 * guarded request is acceptable because this path is only reached by Free,
 * non-trial users on Tier 2 endpoints — a small subset that is already
 * rate-limited (5 req/min), so the query volume is bounded.
 *
 * Residual over-count: usage is recorded asynchronously (logApiKeyUsage is
 * fire-and-forget), so a handful of truly concurrent requests may all be
 * admitted before their usage rows commit. This is bounded by the rate limit
 * and is consistent with the fire-and-forget trade-off already accepted by the
 * monthly quota middleware.
 */
export async function getDailyEndpointUsage(userId: string, endpoint: string): Promise<number> {
  const client = createServiceRoleClient();

  const { data, error } = await client.rpc('get_daily_endpoint_usage', {
    p_user_id: userId,
    p_endpoint: endpoint,
  });

  if (error) {
    logger.warn('Failed to get daily endpoint usage', {
      userId,
      endpoint,
      error: error.message,
    });
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}

/**
 * Reset monthly_quota_used to 0 for all keys and advance quota_reset_at by
 * one month. Called by the billing cron on the 1st of each month.
 *
 * Implemented as a server-side RPC to avoid serializing a potentially large
 * RETURNING result set over the network, which has caused Vercel 504 timeouts.
 */
export async function resetMonthlyQuota(): Promise<{ reset: number }> {
  const client = createServiceRoleClient();

  const { data, error } = await client.rpc('reset_monthly_quota');

  if (error) {
    logger.error('Failed to reset monthly quota', error);
    throw new Error('Failed to reset monthly quota');
  }

  return { reset: typeof data === 'number' ? data : 0 };
}

/**
 * Downgrade all API keys whose Pro trial has expired back to free.
 * Called daily by the billing cron. Returns the number of keys downgraded.
 *
 * Implemented as a server-side RPC to avoid serializing a potentially large
 * RETURNING result set over the network, which has caused Vercel 504 timeouts.
 */
export async function downgradeExpiredTrials(): Promise<{ downgraded: number }> {
  const client = createServiceRoleClient();

  const { data, error } = await client.rpc('downgrade_expired_trials');

  if (error) {
    logger.error('Failed to downgrade expired trials', error);
    throw new Error('Failed to downgrade expired trials');
  }

  // Clear the validation cache so downgraded keys lose Pro rate limit immediately.
  invalidateApiKeyCache();

  return { downgraded: typeof data === 'number' ? data : 0 };
}

/**
 * Downgrade API keys for users whose NOWPayments subscription has expired
 * (current_period_end < now AND status = 'active'). Called daily by the
 * billing cron. Returns the number of API keys downgraded.
 *
 * The RPC `downgrade_expired_subscriptions` (migration 0015) only downgrades
 * users who have NO remaining active, unexpired subscription — so a user
 * who renewed will not be downgraded even if their old subscription just
 * expired.
 *
 * Implemented as a server-side RPC to avoid serializing a potentially large
 * RETURNING result set over the network (same reason as resetMonthlyQuota).
 */
export async function downgradeExpiredSubscriptions(): Promise<{ downgraded: number }> {
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc('downgrade_expired_subscriptions');

  if (error) {
    logger.error('Failed to downgrade expired subscriptions', error);
    throw new Error('Failed to downgrade expired subscriptions');
  }

  // Clear the validation cache so downgraded keys lose paid rate limit immediately.
  invalidateApiKeyCache();

  return { downgraded: typeof data === 'number' ? data : 0 };
}

/**
 * Cancel subscription rows stuck in "incomplete" status for more than 24 hours
 * (abandoned checkouts or lost IPNs). Called daily by the billing cron to
 * prevent zombie rows from accumulating. Returns the number of rows cleaned up.
 */
export async function cleanupIncompleteSubscriptions(): Promise<{ cleanedUp: number }> {
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc('cleanup_incomplete_subscriptions');

  if (error) {
    logger.error('Failed to cleanup incomplete subscriptions', error);
    throw new Error('Failed to cleanup incomplete subscriptions');
  }

  return { cleanedUp: typeof data === 'number' ? data : 0 };
}

/**
 * Update all of a user's API keys to a new plan (and matching rate_limit).
 * Called by the NOWPayments webhook handler when a payment is confirmed
 * (upgrade) or refunded (downgrade to free). Returns the number of keys
 * updated. Idempotent — repeating with the same plan is a no-op.
 */
export async function updateApiKeyPlanForUser(
  userId: string,
  plan: Plan,
  options: { stripeCustomerId?: string; stripeSubscriptionId?: string } = {}
): Promise<{ updated: number }> {
  const client = createServiceRoleClient();
  const planConfig = PLANS[plan];
  const rateLimit = planConfig.rateLimit;

  const updatePayload: Record<string, unknown> = {
    plan,
    rate_limit: rateLimit,
  };
  if (options.stripeCustomerId !== undefined) {
    updatePayload.stripe_customer_id = options.stripeCustomerId;
  }
  if (options.stripeSubscriptionId !== undefined) {
    updatePayload.stripe_subscription_id = options.stripeSubscriptionId;
  }
  // When upgrading to a paid plan via NOWPayments webhook, clear any trial_ends_at.
  if (plan !== 'free') {
    updatePayload.trial_ends_at = null;
  }

  const { data, error } = await client
    .from('api_keys')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('is_active', true)
    .select('id');

  if (error) {
    logger.error('Failed to update API key plan for user', new Error(error.message), {
      userId,
      plan,
    });
    throw new Error('Failed to update API key plan');
  }

  // Clear the validation cache so the new plan/rate_limit takes effect
  // immediately on the next request.
  invalidateApiKeyCache();

  return { updated: data?.length ?? 0 };
}
