/**
 * @fileoverview Hard caps for the two 24-hour products.
 *
 * A $0.50 window and a $0.55 lifecycle are flat prices, so every in-window
 * call must be bounded or the flat price becomes an unbounded cost promise.
 * Three caps apply per API key:
 *
 *   - 5 open monitored windows (the lifecycle bundle's embedded window counts)
 *   - 3 open lifecycles
 *   - 10 polls per rolling minute across those windows
 *
 * The numbers live here as code constants rather than environment config: the
 * REST routes, MCP tools and both services import this one module, so a change
 * applies to every surface at once. An env var could leave one surface on the
 * old limit and turn the flat product price into an open-ended commitment.
 * `externalCopyClaims`/`productLimits` tests pin the values; changing them
 * requires editing the test deliberately.
 *
 * Enforcement happens at the service boundary — `beginOracleWatchWindow`,
 * `beginPositionLifecycle` and `pollOracleWatchWindow` — because that is the
 * only choke point shared by REST, MCP and the x402 callback path. A DB trigger
 * (migration 0129) re-checks the two concurrency caps atomically so a race
 * between two concurrent purchases cannot exceed them.
 */

import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('product-limits');

export const PRODUCT_24H_LIMITS = {
  maxOpenWindowsPerKey: 5,
  maxOpenLifecyclesPerKey: 3,
  maxPollsPerMinute: 10,
  pollRateWindowMs: 60_000,
} as const;

export type ProductLimitScope = 'open_windows' | 'open_lifecycles' | 'poll_rate';

/** A structured refusal; the route layer maps it onto HTTP 429 (+ Retry-After for rate limits only). */
export class ProductLimitError extends Error {
  constructor(
    readonly scope: ProductLimitScope,
    readonly limit: number,
    readonly current: number,
    /**
     * Seconds until the counter resets — only for `poll_rate`. Concurrency
     * refusals pass null: no slot frees on a timer, so a Retry-After would be
     * a false promise and invites a retry storm.
     */
    readonly retryAfterSeconds: number | null,
    readonly retryAfterBasis: 'rate_window' | 'recheck'
  ) {
    super(`Product limit reached: ${scope}`);
    this.name = 'ProductLimitError';
  }
}

type CountableTable = 'oracle_watch_windows' | 'position_lifecycles';

async function countActiveSlots(table: CountableTable, apiKeyId: string): Promise<number> {
  const client = createServiceRoleClient();
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    logger.error('Product slot count failed; refusing new inventory', new Error(error.message), {
      table,
      apiKeyId,
    });
    throw new Error(`Product slot count failed for ${table}`, { cause: error });
  }
  return count ?? 0;
}

/**
 * Refuse a new window when this key already holds the maximum. Keyless x402
 * buyers are exempt: every keyless window is individually pre-paid, and there
 * is no key to attribute a concurrent inventory cap to.
 */
export async function assertOpenWindowSlot(apiKeyId: string | null | undefined): Promise<void> {
  if (!apiKeyId) return;
  const current = await countActiveSlots('oracle_watch_windows', apiKeyId);
  if (current >= PRODUCT_24H_LIMITS.maxOpenWindowsPerKey) {
    throw new ProductLimitError(
      'open_windows',
      PRODUCT_24H_LIMITS.maxOpenWindowsPerKey,
      current,
      null,
      'recheck'
    );
  }
}

/** Refuse a new lifecycle when this key already holds the maximum. */
export async function assertOpenLifecycleSlot(apiKeyId: string | null | undefined): Promise<void> {
  if (!apiKeyId) return;
  const current = await countActiveSlots('position_lifecycles', apiKeyId);
  if (current >= PRODUCT_24H_LIMITS.maxOpenLifecyclesPerKey) {
    throw new ProductLimitError(
      'open_lifecycles',
      PRODUCT_24H_LIMITS.maxOpenLifecyclesPerKey,
      current,
      null,
      'recheck'
    );
  }
}

/**
 * Count one poll against the per-key rolling minute. Keyless windows fall back
 * to the window id as subject so a token-only buyer still has a burst bound.
 */
export async function consumePollRate(subject: string): Promise<void> {
  const { count, resetTime } = await rateLimitStore.increment(
    `product:oww:poll:${subject}`,
    PRODUCT_24H_LIMITS.pollRateWindowMs
  );
  if (count > PRODUCT_24H_LIMITS.maxPollsPerMinute) {
    throw new ProductLimitError(
      'poll_rate',
      PRODUCT_24H_LIMITS.maxPollsPerMinute,
      count,
      Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)),
      'rate_window'
    );
  }
}

/** True when a Supabase error came from the migration-0129 concurrency trigger. */
export function isConcurrencyTriggerError(message: string | undefined): boolean {
  return (message ?? '').includes('product_concurrency_limit');
}

/**
 * MCP surfaces return tool errors rather than HTTP responses, so the 429
 * semantics (scope, limit, current, and the action needed) are carried in the
 * message text. Concurrency refusals deliberately omit a retry delay: no slot
 * frees on a clock, so telling an agent to wait invites a retry storm.
 */
export function productLimitMessage(error: ProductLimitError): string {
  if (error.scope === 'poll_rate') {
    return (
      `product_limit (${error.scope}): limit ${error.limit}, current ${error.current}. ` +
      `Retry after ${error.retryAfterSeconds}s — the rolling minute must reset.`
    );
  }
  return (
    `product_limit (${error.scope}): limit ${error.limit}, current ${error.current}. ` +
    'No Retry-After: a slot frees only when an open window or lifecycle is closed, ' +
    'or after its 24h expiry. Release a slot before retrying.'
  );
}
