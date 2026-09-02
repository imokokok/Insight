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
}

export interface ApiKeyValidationResult {
  keyId: string;
  userId: string;
  plan: string;
  rateLimit: number;
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
      .select('id, user_id, plan, rate_limit, is_active, expires_at')
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
      'id, user_id, name, key_prefix, plan, rate_limit, is_active, last_used_at, expires_at, created_at, updated_at'
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
  } = {}
): Promise<{ record: Omit<ApiKeyRecord, 'key_hash'>; plainKey: string }> {
  const prepared = await prepareApiKeyForStorage(name);
  const client = createServiceRoleClient();

  const plan: Plan = normalizePlan(options.plan);
  // Default rate_limit comes from the plan config (Developer=30, Team=60,
  // Enterprise unlimited). Explicit overrides (e.g. admin tooling) still win.
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
// Plan management functions.
// Used by: cron/billing (downgradeExpiredSubscriptions, cleanupIncompleteSubscriptions),
// webhook handler (updateApiKeyPlanForUser).
// ---------------------------------------------------------------------------

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
 * RETURNING result set over the network.
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
 * Called by the NOWPayments webhook handler when a payment is confirmed.
 * Returns the number of keys updated. Idempotent — repeating with the same
 * plan is a no-op.
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

/**
 * Set (or clear, when amount is null) the optional per-key monthly credit
 * budget. Enforced inside the credit precheck/consume RPCs against the
 * credit_ledger for the current month. Scoped to the key's owning user.
 */
export async function setApiKeyBudget(
  keyId: string,
  userId: string,
  amount: number | null
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('api_keys')
    .update({ budget_monthly: amount })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to set API key budget', new Error(error.message), { keyId, userId });
    throw new Error('Failed to set API key budget');
  }
}
