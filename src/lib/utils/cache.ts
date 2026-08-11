interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface TTLCacheOptions {
  /**
   * Maximum number of entries before the oldest (FIFO) entries are evicted.
   * `<= 0` (or omitted) means **unbounded** — eviction is skipped entirely.
   * Default 1000.
   */
  maxSize?: number;
  /**
   * Background sweep interval in ms that deletes expired entries. `<= 0`
   * disables the sweep (entries still expire lazily on read). Default 60000.
   */
  cleanupIntervalMs?: number;
}

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000;

/**
 * A bounded, TTL-based in-memory cache backed by `Map`.
 *
 * Entries expire lazily on read (`get`/`has`) and, when enabled, on a
 * background sweep. Eviction is FIFO (oldest-inserted wins) and re-inserting
 * an existing key refreshes its position so recently-written keys survive
 * longer.
 *
 * TTL semantics for `set` (see `normalizeTtl`):
 *  - `ttl > 0`          → expires after that many ms.
 *  - `ttl === 0`        → expires immediately (dead on the next read). This is
 *                         NOT "no expiry" — pass a positive number for a real
 *                         lifetime.
 *  - `ttl === Infinity` → never expires.
 *  - `NaN` / negative    → normalized to `0`, so a broken caller fails loudly
 *                         (cache miss) instead of poisoning the cache.
 *
 * Note on `size` / `keys()`: they reflect the underlying map and therefore may
 * include entries that have logically expired but not yet been swept or read
 * (lazy expiry). Treat them as capacity gauges, not live-entry counts.
 */
export class TTLCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private readonly maxSize: number;
  private readonly cleanupIntervalMs: number;

  constructor(options: TTLCacheOptions = {}) {
    // A non-positive or non-finite maxSize means "no upper bound". Clamping to
    // Infinity (instead of the previous silent 0) makes the intent explicit
    // and avoids the old bug where maxSize<=0 still entered the eviction loop
    // yet never deleted anything (empty-map guard broke out), leaking memory.
    const rawMax = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.maxSize = Number.isFinite(rawMax) && rawMax > 0 ? Math.floor(rawMax) : Infinity;

    // Non-finite cleanup interval is treated as "disabled" rather than left to
    // blow up into a NaN/0ms timer below.
    const rawCleanup = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
    this.cleanupIntervalMs = Number.isFinite(rawCleanup) ? rawCleanup : 0;

    if (this.cleanupIntervalMs > 0) {
      this.startCleanupInterval();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Insert or replace an entry. Re-inserting an existing key refreshes its
   * FIFO position so it is not the first to be evicted.
   */
  set<T>(key: string, data: T, ttl: number): void {
    const safeTtl = this.normalizeTtl(ttl);
    // Refresh FIFO position so a re-inserted key is not the first to be evicted.
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // No-op when maxSize is Infinity (unbounded).
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl: safeTtl });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /** Number of stored entries, including not-yet-swept expired ones. */
  get size(): number {
    return this.cache.size;
  }

  /** Stored keys, including not-yet-swept expired ones. */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private normalizeTtl(ttl: number): number {
    // `Infinity` is the explicit "never expire" sentinel — preserve it.
    if (ttl === Infinity) return Infinity;
    // Invalid or negative TTLs would otherwise cache a "dead" entry forever (or
    // silently). Treat them as already-expired so a broken caller fails loudly
    // via a cache miss instead of poisoning the cache.
    if (!Number.isFinite(ttl) || ttl < 0) {
      return 0;
    }
    return ttl;
  }

  private cleanup(): void {
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  startCleanupInterval(): void {
    // Guard against re-entry, a non-positive interval (which would spin a
    // busy-loop timer), and resurrection of a destroyed instance's timer.
    if (this.cleanupInterval || this.cleanupIntervalMs <= 0 || this.destroyed) return;
    this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  destroy(): void {
    this.stopCleanupInterval();
    this.clear();
    this.destroyed = true;
  }
}
