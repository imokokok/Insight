/* eslint-disable max-lines-per-function */
import {
  PriceQueryCache,
  CACHE_CONFIG,
  createCacheKey,
  getCacheAge,
  isCacheFresh,
} from '../cacheUtils';

describe('cacheUtils', () => {
  describe('PriceQueryCache', () => {
    let cache: PriceQueryCache<string>;

    beforeEach(() => {
      cache = new PriceQueryCache<string>(5, 1000);
    });

    afterEach(() => {
      cache.clearAll();
    });

    describe('缓存设置和获取', () => {
      it('should set and get a value', () => {
        cache.set('key1', 'value1');
        const result = cache.get('key1');

        expect(result).toBe('value1');
      });

      it('should return undefined for non-existent key', () => {
        const result = cache.get('non-existent');

        expect(result).toBeUndefined();
      });

      it('should overwrite existing key', () => {
        cache.set('key1', 'value1');
        cache.set('key1', 'value2');
        const result = cache.get('key1');

        expect(result).toBe('value2');
      });

      it('should handle multiple keys', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');

        expect(cache.get('key1')).toBe('value1');
        expect(cache.get('key2')).toBe('value2');
        expect(cache.get('key3')).toBe('value3');
      });

      it('should handle complex objects', () => {
        const objectCache = new PriceQueryCache<{ price: number; symbol: string }>(5, 1000);
        const data = { price: 100, symbol: 'BTC' };

        objectCache.set('btc-price', data);
        const result = objectCache.get('btc-price');

        expect(result).toEqual(data);
      });
    });

    describe('缓存过期', () => {
      it('should return undefined for expired entry', async () => {
        cache = new PriceQueryCache<string>(5, 100);
        cache.set('key1', 'value1');

        await new Promise((resolve) => setTimeout(resolve, 150));

        const result = cache.get('key1');

        expect(result).toBeUndefined();
      });

      it('should delete expired entry on access', async () => {
        cache = new PriceQueryCache<string>(5, 100);
        cache.set('key1', 'value1');

        await new Promise((resolve) => setTimeout(resolve, 150));

        cache.get('key1');

        expect(cache.getSize()).toBe(0);
      });

      it('should respect custom TTL', async () => {
        cache.set('key1', 'value1', 500);

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(cache.get('key1')).toBe('value1');

        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(cache.get('key1')).toBeUndefined();
      });

      it('should return correct remaining TTL', async () => {
        cache = new PriceQueryCache<string>(5, 1000);
        cache.set('key1', 'value1');

        await new Promise((resolve) => setTimeout(resolve, 100));

        const remaining = cache.getRemainingTTL('key1');

        expect(remaining).toBeLessThan(1000);
        expect(remaining).toBeGreaterThan(800);
      });

      it('should return 0 for non-existent key remaining TTL', () => {
        const remaining = cache.getRemainingTTL('non-existent');

        expect(remaining).toBe(0);
      });
    });

    describe('缓存清理', () => {
      it('should clear a specific key', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        const result = cache.clear('key1');

        expect(result).toBe(true);
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBe('value2');
      });

      it('should return false when clearing non-existent key', () => {
        const result = cache.clear('non-existent');

        expect(result).toBe(false);
      });

      it('should clear all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');

        cache.clearAll();

        expect(cache.getSize()).toBe(0);
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBeUndefined();
        expect(cache.get('key3')).toBeUndefined();
      });

      it('should reset stats on clearAll', () => {
        cache.set('key1', 'value1');
        cache.get('key1');
        cache.get('non-existent');

        cache.clearAll();
        const stats = cache.getStats();

        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });

      it('should clear expired entries', async () => {
        cache = new PriceQueryCache<string>(5, 100);
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        await new Promise((resolve) => setTimeout(resolve, 150));

        cache.set('key3', 'value3');
        const cleared = cache.clearExpired();

        expect(cleared).toBe(2);
        expect(cache.getSize()).toBe(1);
        expect(cache.get('key3')).toBe('value3');
      });

      it('should return 0 when no expired entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        const cleared = cache.clearExpired();

        expect(cleared).toBe(0);
      });
    });

    describe('LRU 淘汰', () => {
      it('should evict oldest entry when max size reached', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        cache.set('key4', 'value4');
        cache.set('key5', 'value5');
        cache.set('key6', 'value6');

        expect(cache.getSize()).toBe(5);
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key6')).toBe('value6');
      });

      it('should not evict when updating existing key', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        cache.set('key4', 'value4');
        cache.set('key5', 'value5');

        cache.set('key1', 'value1-updated');

        expect(cache.getSize()).toBe(5);
        expect(cache.get('key1')).toBe('value1-updated');
      });

      it('should evict based on timestamp not access order', async () => {
        cache.set('key1', 'value1');
        await new Promise((resolve) => setTimeout(resolve, 10));
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        cache.set('key4', 'value4');
        cache.set('key5', 'value5');

        cache.get('key1');

        cache.set('key6', 'value6');

        expect(cache.get('key1')).toBeUndefined();
      });
    });

    describe('has 方法', () => {
      it('should return true for existing key', () => {
        cache.set('key1', 'value1');

        expect(cache.has('key1')).toBe(true);
      });

      it('should return false for non-existent key', () => {
        expect(cache.has('non-existent')).toBe(false);
      });

      it('should return false for expired key', async () => {
        cache = new PriceQueryCache<string>(5, 100);
        cache.set('key1', 'value1');

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(cache.has('key1')).toBe(false);
      });
    });

    describe('缓存统计', () => {
      it('should track hits correctly', () => {
        cache.set('key1', 'value1');
        cache.get('key1');
        cache.get('key1');

        const stats = cache.getStats();

        expect(stats.hits).toBe(2);
        expect(stats.hitRate).toBe(1);
      });

      it('should track misses correctly', () => {
        cache.get('non-existent');
        cache.get('another-non-existent');

        const stats = cache.getStats();

        expect(stats.misses).toBe(2);
        expect(stats.missRate).toBe(1);
      });

      it('should calculate hit rate correctly', () => {
        cache.set('key1', 'value1');
        cache.get('key1');
        cache.get('non-existent');

        const stats = cache.getStats();

        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(0.5);
        expect(stats.missRate).toBe(0.5);
      });

      it('should return zero rates when no operations', () => {
        const stats = cache.getStats();

        expect(stats.hitRate).toBe(0);
        expect(stats.missRate).toBe(0);
      });

      it('should return correct size', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        const stats = cache.getStats();

        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(5);
      });
    });

    describe('辅助方法', () => {
      it('should return all keys', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        const keys = cache.keys();

        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
        expect(keys.length).toBe(2);
      });

      it('should return all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        const entries = cache.entries();

        expect(entries.length).toBe(2);
        expect(entries[0][0]).toBe('key1');
        expect(entries[0][1].data).toBe('value1');
        expect(entries[0][1].timestamp).toBeDefined();
        expect(entries[0][1].expiresAt).toBeDefined();
      });

      it('should return correct size', () => {
        expect(cache.getSize()).toBe(0);

        cache.set('key1', 'value1');
        expect(cache.getSize()).toBe(1);

        cache.set('key2', 'value2');
        expect(cache.getSize()).toBe(2);

        cache.clear('key1');
        expect(cache.getSize()).toBe(1);
      });
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have correct price TTL', () => {
      expect(CACHE_CONFIG.PRICE_TTL).toBe(30 * 1000);
    });

    it('should have correct historical TTL', () => {
      expect(CACHE_CONFIG.HISTORICAL_TTL).toBe(60 * 1000);
    });

    it('should have correct max entries', () => {
      expect(CACHE_CONFIG.MAX_ENTRIES).toBe(100);
    });
  });

  describe('createCacheKey', () => {
    it('should create key from single part', () => {
      const key = createCacheKey('chainlink');

      expect(key).toBe('chainlink');
    });

    it('should create key from multiple parts', () => {
      const key = createCacheKey('chainlink', 'BTC', 'ethereum');

      expect(key).toBe('chainlink:BTC:ethereum');
    });

    it('should filter out falsy values', () => {
      const key = createCacheKey('chainlink', '', 'BTC', null, 'ethereum');

      expect(key).toBe('chainlink:BTC:ethereum');
    });

    it('should handle numeric parts', () => {
      const key = createCacheKey('prices', 24, 'BTC');

      expect(key).toBe('prices:24:BTC');
    });

    it('should handle empty parts', () => {
      const key = createCacheKey();

      expect(key).toBe('');
    });

    it('should handle all falsy parts', () => {
      const key = createCacheKey('', null, undefined, 0);

      expect(key).toBe('');
    });
  });

  describe('getCacheAge', () => {
    it('should calculate cache age correctly', () => {
      const timestamp = Date.now() - 1000;
      const age = getCacheAge(timestamp);

      expect(age).toBeGreaterThanOrEqual(1000);
      expect(age).toBeLessThan(1100);
    });

    it('should return positive value for past timestamp', () => {
      const pastTimestamp = Date.now() - 5000;
      const age = getCacheAge(pastTimestamp);

      expect(age).toBeGreaterThan(0);
    });

    it('should return negative or zero for future timestamp', () => {
      const futureTimestamp = Date.now() + 5000;
      const age = getCacheAge(futureTimestamp);

      expect(age).toBeLessThan(0);
    });
  });

  describe('isCacheFresh', () => {
    it('should return true for fresh cache', () => {
      const timestamp = Date.now() - 500;
      const isFresh = isCacheFresh(timestamp, 1000);

      expect(isFresh).toBe(true);
    });

    it('should return false for stale cache', () => {
      const timestamp = Date.now() - 2000;
      const isFresh = isCacheFresh(timestamp, 1000);

      expect(isFresh).toBe(false);
    });

    it('should handle edge case at exact maxAge', () => {
      const timestamp = Date.now() - 1000;
      const isFresh = isCacheFresh(timestamp, 1000);

      expect(isFresh).toBe(false);
    });

    it('should handle zero maxAge', () => {
      const timestamp = Date.now();
      const isFresh = isCacheFresh(timestamp, 0);

      expect(isFresh).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('should handle cache with max size 1', () => {
      const smallCache = new PriceQueryCache<string>(1, 1000);

      smallCache.set('key1', 'value1');
      expect(smallCache.get('key1')).toBe('value1');

      smallCache.set('key2', 'value2');
      expect(smallCache.get('key1')).toBeUndefined();
      expect(smallCache.get('key2')).toBe('value2');
    });

    it('should handle cache with max size 0', () => {
      const zeroCache = new PriceQueryCache<string>(0, 1000);

      zeroCache.set('key1', 'value1');
      expect(zeroCache.get('key1')).toBe('value1');
      expect(zeroCache.getSize()).toBe(1);
    });

    it('should handle TTL of 0', async () => {
      const zeroTtlCache = new PriceQueryCache<string>(5, 0);

      zeroTtlCache.set('key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(zeroTtlCache.get('key1')).toBeUndefined();
    });

    it('should handle very large TTL', () => {
      const largeTtlCache = new PriceQueryCache<string>(5, Number.MAX_SAFE_INTEGER);

      largeTtlCache.set('key1', 'value1');

      expect(largeTtlCache.get('key1')).toBe('value1');
      expect(largeTtlCache.getRemainingTTL('key1')).toBeGreaterThan(0);
    });

    it('should handle special characters in keys', () => {
      const specialCache = new PriceQueryCache<string>(10, 1000);
      const specialKeys = [
        'key:with:colons',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key with spaces',
        'key@with#special$chars',
        '中文键',
        '🔑emoji',
      ];

      specialKeys.forEach((key) => {
        specialCache.set(key, `value-${key}`);
        expect(specialCache.get(key)).toBe(`value-${key}`);
      });
    });

    it('should handle concurrent operations', async () => {
      const concurrentCache = new PriceQueryCache<string>(5, 1000);
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            concurrentCache.set(`key-${i}`, `value-${i}`);
            resolve();
          })
        );
      }

      await Promise.all(promises);

      expect(concurrentCache.getSize()).toBe(5);
    });
  });
});
