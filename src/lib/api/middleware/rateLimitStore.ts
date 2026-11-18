import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('rate-limit-store');

interface RateLimitResult {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitResult>;
  clear?(): void;
}

interface IncrementRateLimitRow {
  count: number;
  reset_time: number;
}

interface MemoryRateLimitEntry {
  count: number;
  resetTime: number;
  lastAccessTime: number;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, MemoryRateLimitEntry>();
  private MAX_STORE_SIZE = 10000;
  private CLEANUP_INTERVAL = 60000;
  private lastCleanupAt = 0;

  // Lazy cleanup: scan for expired entries at most once per CLEANUP_INTERVAL
  // when increment() is called, instead of running a module-level setInterval
  // that would keep a serverless function alive.
  private lazyCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanupAt < this.CLEANUP_INTERVAL) {
      return;
    }
    this.lastCleanupAt = now;

    let cleanedCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  private cleanupOldestEntries(count: number): void {
    const entries = Array.from(this.store.entries());
    entries.sort((a, b) => a[1].lastAccessTime - b[1].lastAccessTime);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.store.delete(entries[i][0]);
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const resetTime = now + windowMs;

    this.lazyCleanup();

    if (this.store.size >= this.MAX_STORE_SIZE) {
      this.cleanupOldestEntries(Math.floor(this.MAX_STORE_SIZE * 0.1));
      logger.warn('Rate limit store reached max size, cleaned up oldest entries');
    }

    const entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      this.store.set(key, { count: 1, resetTime, lastAccessTime: now });
      return { count: 1, resetTime };
    }

    entry.count++;
    entry.lastAccessTime = now;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  clear(): void {
    this.store.clear();
  }
}

class SupabaseRateLimitStore implements RateLimitStore {
  // Keep the upstream call bounded. A local fallback would enforce separate
  // limits on each serverless instance and let callers multiply the allowance.
  private readonly SUPABASE_RPC_TIMEOUT_MS = 2_000;

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    try {
      const client = createServiceRoleClient();
      const { data, error } = await client
        .rpc('increment_rate_limit', {
          p_key: key,
          p_window_ms: windowMs,
        })
        .abortSignal(AbortSignal.timeout(this.SUPABASE_RPC_TIMEOUT_MS));

      if (error) {
        throw error;
      }

      const rows = data as IncrementRateLimitRow[] | null;
      if (!rows || rows.length === 0) {
        throw new Error('No data returned from increment_rate_limit');
      }

      return {
        count: rows[0].count,
        resetTime: rows[0].reset_time,
      };
    } catch (error) {
      logger.error('Supabase rate limit unavailable; rejecting request', normalizeError(error));
      const unavailable = new Error('RATE_LIMIT_STORE_UNAVAILABLE', { cause: error });
      (unavailable as Error & { code?: string }).code = 'RATE_LIMIT_STORE_UNAVAILABLE';
      throw unavailable;
    }
  }

  clear(): void {
    // No-op: cleanup is handled by the database migration helper and/or cron.
  }
}

function shouldUseSupabaseRateLimitStore(): boolean {
  if (process.env.NODE_ENV === 'production' && process.env.RATE_LIMIT_STORE === 'memory') {
    throw new Error('RATE_LIMIT_STORE=memory is not supported in production');
  }
  if (process.env.RATE_LIMIT_STORE === 'supabase') {
    return true;
  }
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  return false;
}

function createRateLimitStore(): RateLimitStore {
  if (shouldUseSupabaseRateLimitStore()) {
    logger.info('Using Supabase rate limit storage');
    return new SupabaseRateLimitStore();
  }

  logger.warn('Using in-memory rate limit storage - not suitable for serverless environments');
  return new MemoryRateLimitStore();
}

export const rateLimitStore = createRateLimitStore();
