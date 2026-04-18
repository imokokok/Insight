'use client';

import { ORACLE_CACHE_TTL } from '@/lib/oracles';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  hits: number;
  misses: number;
}

export const CACHE_CONFIG = {
  PRICE_TTL: ORACLE_CACHE_TTL.PRICE,
  HISTORICAL_TTL: ORACLE_CACHE_TTL.HISTORICAL,
  MAX_ENTRIES: 100,
} as const;

export class PriceQueryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(
    maxSize: number = CACHE_CONFIG.MAX_ENTRIES,
    defaultTTL: number = CACHE_CONFIG.PRICE_TTL
  ) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.defaultTTL);

    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(key: string): boolean {
    return this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
      missRate: total > 0 ? this.misses / total : 0,
      hits: this.hits,
      misses: this.misses,
    };
  }

  getSize(): number {
    return this.cache.size;
  }

  getRemainingTTL(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return 0;

    const remaining = entry.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  entries(): Array<[string, CacheEntry<T>]> {
    return Array.from(this.cache.entries());
  }
}

export const priceCache = new PriceQueryCache<unknown>(
  CACHE_CONFIG.MAX_ENTRIES,
  CACHE_CONFIG.PRICE_TTL
);

export const historicalCache = new PriceQueryCache<unknown>(
  CACHE_CONFIG.MAX_ENTRIES,
  CACHE_CONFIG.HISTORICAL_TTL
);

export function createCacheKey(...parts: (string | number)[]): string {
  return parts.filter(Boolean).join(':');
}

export function getCacheAge(timestamp: number): number {
  return Date.now() - timestamp;
}

export function isCacheFresh(timestamp: number, maxAge: number): boolean {
  return getCacheAge(timestamp) < maxAge;
}
