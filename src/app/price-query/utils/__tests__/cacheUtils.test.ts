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

    describe('Cache set and get', () => {
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
        const objCache = new PriceQueryCache<{ nested: { value: number } }>();
        const obj = { nested: { value: 42 } };

        objCache.set('obj1', obj);
        const result = objCache.get('obj1');

        expect(result).toEqual(obj);
      });
    });

    describe('Cache expiration', () => {
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

        expect(remaining).toBeGreaterThan(800);
        expect(remaining).toBeLessThanOrEqual(900);
      });

      it('should return 0 for non-existent key', () => {
        const remaining = cache.getRemainingTTL('non-existent');

        expect(remaining).toBe(0);
      });
    });

    describe('Cache cleanup', () => {
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

    describe('LRU eviction', () => {
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
        cache = new PriceQueryCache<string>(3, 1000);
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

    describe('has method', () => {
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

    describe('Cache statistics', () => {
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
    });

    describe('Cache keys', () => {
      it('should create consistent cache keys', () => {
        const key1 = createCacheKey('provider1', 'BTC', 'eth');
        const key2 = createCacheKey('provider1', 'BTC', 'eth');

        expect(key1).toBe(key2);
      });

      it('should create different keys for different inputs', () => {
        const key1 = createCacheKey('provider1', 'BTC', 'eth');
        const key2 = createCacheKey('provider1', 'ETH', 'eth');

        expect(key1).not.toBe(key2);
      });
    });
  });

  describe('Edge cases', () => {
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
      const specialCache = new PriceQueryCache<string>(5, 1000);
      specialCache.set('key:with:colons', 'value1');
      specialCache.set('key/with/slashes', 'value2');
      specialCache.set('key with spaces', 'value3');

      expect(specialCache.get('key:with:colons')).toBe('value1');
      expect(specialCache.get('key/with/slashes')).toBe('value2');
      expect(specialCache.get('key with spaces')).toBe('value3');
    });

    it('should handle empty string values', () => {
      const emptyCache = new PriceQueryCache<string>(5, 1000);
      emptyCache.set('key1', '');

      expect(emptyCache.get('key1')).toBe('');
    });

    it('should handle null and undefined values', () => {
      const mixedCache = new PriceQueryCache<string | null | undefined>();

      mixedCache.set('null', null);
      mixedCache.set('undefined', undefined);

      expect(mixedCache.get('null')).toBeNull();
      expect(mixedCache.get('undefined')).toBeUndefined();
    });

    it('should handle rapid set/get operations', () => {
      const rapidCache = new PriceQueryCache<string>(5, 1000);
      for (let i = 0; i < 100; i++) {
        rapidCache.set(`key${i}`, `value${i}`);
      }

      expect(rapidCache.getSize()).toBe(5);
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have valid default values', () => {
      expect(CACHE_CONFIG.MAX_ENTRIES).toBeGreaterThan(0);
      expect(CACHE_CONFIG.PRICE_TTL).toBeGreaterThan(0);
      expect(CACHE_CONFIG.HISTORICAL_TTL).toBeGreaterThan(0);
    });
  });

  describe('Utility functions', () => {
    it('getCacheAge should calculate age correctly', async () => {
      const timestamp = Date.now() - 100;
      const age = getCacheAge(timestamp);

      expect(age).toBeGreaterThanOrEqual(100);
    });

    it('getCacheAge should return 0 for current timestamp', () => {
      const age = getCacheAge(Date.now());

      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('isCacheFresh should return true for fresh cache', () => {
      const timestamp = Date.now() - 100;
      expect(isCacheFresh(timestamp, 500)).toBe(true);
    });

    it('isCacheFresh should return false for stale cache', () => {
      const timestamp = Date.now() - 1000;
      expect(isCacheFresh(timestamp, 500)).toBe(false);
    });
  });
});
