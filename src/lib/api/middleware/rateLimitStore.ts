import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('rate-limit-store');

interface RateLimitResult {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitResult>;
  cleanup?(): void;
  clear?(): void;
  stopCleanup?(): void;
}

class KvRateLimitStore implements RateLimitStore {
  private prefix = 'ratelimit:';

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('KV operation timeout')), ms)
    );
  }

  private failOpen(windowMs: number): RateLimitResult {
    return { count: 1, resetTime: Date.now() + windowMs };
  }

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    try {
      const { kv } = await import('@vercel/kv');
      const fullKey = `${this.prefix}${key}`;
      const windowMsInSeconds = Math.ceil(windowMs / 1000);

      const count = (await Promise.race([kv.incr(fullKey), this.timeout(500)])) as number;

      if (count === 1) {
        try {
          await Promise.race([kv.expire(fullKey, windowMsInSeconds), this.timeout(500)]);
        } catch (expireError) {
          logger.warn('KV expire failed after incr, attempting cleanup', { expireError });
          try {
            await kv.set(fullKey, 0, { ex: 1 });
          } catch {
            // best effort cleanup
          }
          return this.failOpen(windowMs);
        }
        return { count, resetTime: Date.now() + windowMs };
      }

      const ttl = (await Promise.race([kv.ttl(fullKey), this.timeout(500)])) as number;

      if (ttl > 0) {
        return { count, resetTime: Date.now() + ttl * 1000 };
      }

      try {
        await Promise.race([kv.expire(fullKey, windowMsInSeconds), this.timeout(500)]);
      } catch {
        // best effort
      }

      return { count, resetTime: Date.now() + windowMs };
    } catch (error) {
      logger.warn('KV rate limit increment error, failing open', { error });
      return this.failOpen(windowMs);
    }
  }
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

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  stopCleanup(): void {
    // No-op: cleanup is now lazy (triggered on access) so there is no
    // background timer to stop.
  }
}

function createRateLimitStore(): RateLimitStore {
  if (process.env.KV_REST_API_URL) {
    try {
      const store = new KvRateLimitStore();
      logger.info('Using Vercel KV for rate limit storage');
      return store;
    } catch (error) {
      logger.warn('Failed to create KV rate limit store, falling back', { error });
    }
  }

  logger.warn('Using in-memory rate limit storage - not suitable for serverless environments');
  return new MemoryRateLimitStore();
}

export const rateLimitStore = createRateLimitStore();
