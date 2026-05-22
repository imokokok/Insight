export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface TTLCacheOptions {
  maxSize?: number;
  cleanupIntervalMs?: number;
}

export class TTLCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly maxSize: number;
  private readonly cleanupIntervalMs: number;

  constructor(options: TTLCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 60000;

    if (options.cleanupIntervalMs !== 0) {
      this.startCleanupInterval();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
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

  get size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    if (this.cleanupInterval.unref) {
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
    this.cache.clear();
  }
}
