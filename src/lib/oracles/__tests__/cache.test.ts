/* eslint-disable max-lines-per-function */
import { OracleCache, MAX_CACHE_SIZE } from '../base';

describe('OracleCache', () => {
  let cache: OracleCache;

  beforeEach(() => {
    cache = new OracleCache();
    jest.useRealTimers();
  });

  afterEach(() => {
    cache.stopCleanupInterval();
    jest.useRealTimers();
  });

  describe('TTL Expiration Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire cache entry after TTL', () => {
      const data = { price: 100 };
      const ttl = 1000;

      cache.set('test-key', data, ttl);

      expect(cache.get('test-key')).toEqual(data);

      jest.advanceTimersByTime(ttl + 1);

      expect(cache.get('test-key')).toBeNull();
    });

    it('should keep cache entry valid before TTL', () => {
      const data = { price: 200 };
      const ttl = 5000;

      cache.set('test-key', data, ttl);

      jest.advanceTimersByTime(1000);
      expect(cache.get('test-key')).toEqual(data);

      jest.advanceTimersByTime(2000);
      expect(cache.get('test-key')).toEqual(data);

      jest.advanceTimersByTime(1500);
      expect(cache.get('test-key')).toEqual(data);
    });

    it('should handle different TTL values for different entries', () => {
      const data1 = { price: 100 };
      const data2 = { price: 200 };
      const data3 = { price: 300 };

      cache.set('short', data1, 100);
      cache.set('medium', data2, 500);
      cache.set('long', data3, 1000);

      jest.advanceTimersByTime(150);

      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toEqual(data2);
      expect(cache.get('key')).toEqual(data3);

      jest.advanceTimersByTime(400);

      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toEqual(data3);

      jest.advanceTimersByTime(500);

      expect(cache.get('key')).toBeNull();
    });

    it('should handle TTL expiration with cleanup', () => {
      cache.set('key1', { price: 100 }, 100);
      cache.set('key2', { price: 200 }, 200);
      cache.set('key3', { price: 300 }, 300);

      jest.advanceTimersByTime(150);
      const cleaned1 = cache.cleanup();
      expect(cleaned1).toBe(1);
      expect(cache.size()).toBe(2);

      jest.advanceTimersByTime(100);
      const cleaned2 = cache.cleanup();
      expect(cleaned2).toBe(1);
      expect(cache.size()).toBe(1);

      jest.advanceTimersByTime(100);
      const cleaned3 = cache.cleanup();
      expect(cleaned3).toBe(1);
      expect(cache.size()).toBe(0);
    });
  });

  describe('Concurrent Access Tests', () => {
    it('should handle multiple concurrent reads', async () => {
      const data = { price: 100 };
      cache.set('test-key', data, 10000);

      const readPromises = Array.from({ length: 10 }, () => Promise.resolve(cache.get('test-key')));

      const results = await Promise.all(readPromises);

      results.forEach((result) => {
        expect(result).toEqual(data);
      });
    });

    it('should handle concurrent read and write', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>((resolve) => {
          if (i % 2 === 0) {
            cache.set(`key-${i}`, { price: i * 100 }, 10000);
          } else {
            cache.get(`key-${i - 1}`);
          }
          resolve();
        });
      });

      await Promise.all(operations);

      expect(cache.size()).toBe(5);
    });

    it('should handle concurrent writes to same key', async () => {
      const writePromises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(cache.set('same-key', { price: i }, 10000))
      );

      await Promise.all(writePromises);

      const result = cache.get<{ price: number }>('same-key');
      expect(result).toBeDefined();
      expect(typeof result!.price).toBe('number');
    });

    it('should be thread-safe for mixed operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => {
        return new Promise<void>((resolve) => {
          const key = `key-${i % 10}`;
          switch (i % 4) {
            case 0:
              cache.set(key, { value: i }, 10000);
              break;
            case 1:
              cache.get(key);
              break;
            case 2:
              cache.has(key);
              break;
            case 3:
              cache.delete(key);
              break;
          }
          resolve();
        });
      });

      await Promise.all(operations);

      expect(cache.size()).toBeGreaterThanOrEqual(0);
      expect(cache.size()).toBeLessThanOrEqual(10);
    });
  });

  describe('Memory Management Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cleanup expired entries', () => {
      cache.set('expired1', { data: 1 }, 100);
      cache.set('expired2', { data: 2 }, 100);
      cache.set('valid', { data: 3 }, 10000);

      jest.advanceTimersByTime(150);

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(2);
      expect(cache.size()).toBe(1);
      expect(cache.get('key')).toEqual({ data: 3 });
    });

    it('should preserve valid entries during cleanup', () => {
      cache.set('key1', { data: 1 }, 5000);
      cache.set('key2', { data: 2 }, 5000);
      cache.set('key3', { data: 3 }, 5000);

      jest.advanceTimersByTime(1000);

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(0);
      expect(cache.size()).toBe(3);
    });

    it('should return correct count of removed entries', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, { data: i }, i < 5 ? 100 : 10000);
      }

      jest.advanceTimersByTime(150);

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(5);
      expect(cache.size()).toBe(5);
    });

    it('should handle large cache cleanup efficiently', () => {
      const entryCount = 1000;

      for (let i = 0; i < entryCount; i++) {
        cache.set(`key-${i}`, { data: i }, i % 2 === 0 ? 100 : 10000);
      }

      jest.advanceTimersByTime(150);

      const startTime = Date.now();
      const cleaned = cache.cleanup();
      const endTime = Date.now();

      expect(cleaned).toBe(500);
      expect(cache.size()).toBe(500);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Cache Statistics Tests', () => {
    it('should return correct cache size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1', 1000);
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2', 1000);
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });

    it('should return cache keys', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);
      cache.set('key3', 'value3', 1000);

      const stats = cache.getStats();

      expect(stats.size).toBe(3);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.keys).toContain('key3');
    });

    it('should track cache hits and misses', () => {
      cache.set('existing', 'value', 1000);

      const hit = cache.get('key');
      const miss = cache.get('non-existent');

      expect(hit).toBe('value');
      expect(miss).toBeNull();
    });

    it('should provide accurate statistics', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);
      cache.set('key3', 'value3', 1000);

      const stats = cache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(stats.size).toBe(3);
      expect(Array.isArray(stats.keys)).toBe(true);
      expect(stats.keys.length).toBe(3);
    });
  });

  describe('Boundary Conditions Tests', () => {
    it('should handle empty cache operations', () => {
      expect(cache.get('non-existent')).toBeNull();
      expect(cache.has('non-existent')).toBe(false);
      expect(cache.delete('non-existent')).toBe(false);
      expect(cache.size()).toBe(0);

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(0);

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should handle null value', () => {
      cache.set('null-key', null, 1000);

      const result = cache.get('null-key');
      expect(result).toBeNull();

      expect(cache.has('null-key')).toBe(true);
    });

    it('should handle undefined value', () => {
      cache.set('undefined-key', undefined, 1000);

      const result = cache.get('undefined-key');
      expect(result).toBeUndefined();

      expect(cache.has('undefined-key')).toBe(true);
    });

    it('should handle very large values', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
        nested: { value: i * 2 },
      }));

      cache.set('large-key', largeArray, 1000);

      const result = cache.get<typeof largeArray>('large-key');
      expect(result).toEqual(largeArray);
      expect(result!.length).toBe(10000);
    });

    it('should handle very small TTL values', () => {
      jest.useFakeTimers();

      const data = { price: 100 };
      cache.set('tiny-ttl', data, 1);

      expect(cache.get('tiny-ttl')).toEqual(data);

      jest.advanceTimersByTime(2);

      expect(cache.get('tiny-ttl')).toBeNull();

      jest.useRealTimers();
    });

    it('should handle zero TTL', () => {
      jest.useFakeTimers();

      const data = { price: 100 };
      cache.set('zero-ttl', data, 0);

      jest.advanceTimersByTime(1);

      const result = cache.get('zero-ttl');
      expect(result).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Cache Operations Tests', () => {
    it('should set and get values', () => {
      const data = { price: 100, symbol: 'BTC' };

      cache.set('test-key', data, 1000);
      const result = cache.get<typeof data>('test-key');

      expect(result).toEqual(data);
    });

    it('should delete entries', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);

      const result = cache.delete('key1');

      expect(result).toBe(true);
      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toBe('value2');
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);
      cache.set('key3', 'value3', 1000);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('existing', 'value', 1000);

      expect(cache.has('existing')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should overwrite existing entry', () => {
      cache.set('key', 'first-value', 1000);

      expect(cache.get('key')).toBe('first-value');

      cache.set('key', 'second-value', 1000);

      expect(cache.get('key')).toBe('second-value');
      expect(cache.size()).toBe(1);
    });

    it('should update TTL when overwriting', () => {
      jest.useFakeTimers();

      cache.set('key', 'value1', 100);

      jest.advanceTimersByTime(50);
      expect(cache.get('key')).toBe('value1');

      cache.set('key', 'value2', 200);

      jest.advanceTimersByTime(60);
      expect(cache.get('key')).toBe('value2');

      jest.advanceTimersByTime(150);
      expect(cache.get('key')).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle key collision', () => {
      cache.set('key', { id: 1 }, 1000);
      cache.set('key', { id: 2 }, 1000);

      const result = cache.get<{ id: number }>('key');
      expect(result).toEqual({ id: 2 });
      expect(cache.size()).toBe(1);
    });

    it('should handle special characters in key', () => {
      const specialKeys = [
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key:with:colons',
        'key/with/slashes',
        'key@with@at',
        'key#with#hash',
        'key$with$dollar',
        'key%with%percent',
        'key&with&ampersand',
        'key*with*asterisk',
        'key+with+plus',
        'key=with=equals',
        'key?with?question',
        'key!with!exclamation',
        'key[with]brackets',
        'key{with}braces',
        'key(with)parens',
        'key|with|pipe',
        'key\\with\\backslash',
        'key"with"quotes',
        "key'with'apostrophe",
        'key<with>angle',
        'key,with,comma',
        'key;with;semicolon',
        'key with space',
        'key\twith\ttab',
        'key\nwith\nnewline',
        'key_value',
        '🔑',
        '🎉🎊🎁',
      ];

      specialKeys.forEach((key, index) => {
        cache.set(key, { index }, 1000);
        const result = cache.get<{ index: number }>(key);
        expect(result).toEqual({ index });
      });

      expect(cache.size()).toBe(specialKeys.length);
    });

    it('should handle numeric keys', () => {
      cache.set('123', 'numeric-string', 1000);
      cache.set('0', 'zero', 1000);
      cache.set('-1', 'negative', 1000);
      cache.set('3.14159', 'float', 1000);
      cache.set('1e5', 'scientific', 1000);

      expect(cache.get('key')).toBe('numeric-string');
      expect(cache.get('key')).toBe('zero');
      expect(cache.get('-1')).toBe('negative');
      expect(cache.get('key')).toBe('float');
      expect(cache.get('key')).toBe('scientific');
    });

    it('should handle object values', () => {
      const complexObject = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [1, 2, 3],
            },
          },
        },
        date: new Date('2024-01-01'),
        regex: /test/g,
        func: function () {
          return 'test';
        },
      };

      cache.set('complex-object', complexObject, 1000);

      const result = cache.get<typeof complexObject>('complex-object');
      expect(result).toEqual(complexObject);
      expect(result!.level1.level2.level3.value).toBe('deep');
    });

    it('should handle array values', () => {
      const arrayData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      cache.set('array-key', arrayData, 1000);

      const result = cache.get<typeof arrayData>('array-key');
      expect(result).toEqual(arrayData);
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBe(3);
    });

    it('should handle circular reference objects', () => {
      interface CircularRef {
        name: string;
        self?: CircularRef;
      }
      const circular: CircularRef = { name: 'circular' };
      circular.self = circular;

      cache.set('circular', circular, 1000);

      const result = cache.get<CircularRef>('circular');
      expect(result).toBeDefined();
      expect(result!.name).toBe('circular');
    });

    it('should handle empty string key', () => {
      cache.set('', 'empty-key', 1000);

      expect(cache.get('')).toBe('empty-key');
      expect(cache.has('')).toBe(true);
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(10000);

      cache.set(longKey, 'value', 1000);

      expect(cache.get(longKey)).toBe('value');
      expect(cache.has(longKey)).toBe(true);
    });

    it('should handle Date objects as values', () => {
      const date = new Date('2024-12-25T00:00:00.000Z');

      cache.set('date-key', date, 1000);

      const result = cache.get<Date>('date-key');
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe('2024-12-25T00:00:00.000Z');
    });

    it('should handle Map and Set as values', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const set = new Set([1, 2, 3, 4, 5]);

      cache.set('map-key', map, 1000);
      cache.set('set-key', set, 1000);

      const mapResult = cache.get<Map<string, string>>('map-key');
      const setResult = cache.get<Set<number>>('set-key');

      expect(mapResult).toBeInstanceOf(Map);
      expect(mapResult!.get('key')).toBe('value1');
      expect(setResult).toBeInstanceOf(Set);
      expect(setResult!.has(3)).toBe(true);
    });

    it('should handle Symbol values', () => {
      const sym = Symbol('test-symbol');

      cache.set('symbol-key', sym, 1000);

      const result = cache.get<symbol>('symbol-key');
      expect(typeof result).toBe('symbol');
      expect(result!.description).toBe('test-symbol');
    });

    it('should handle boolean values', () => {
      cache.set('true-key', true, 1000);
      cache.set('false-key', false, 1000);

      expect(cache.get<boolean>('true-key')).toBe(true);
      expect(cache.get<boolean>('false-key')).toBe(false);
    });

    it('should handle number values including special numbers', () => {
      cache.set('zero', 0, 1000);
      cache.set('negative', -123, 1000);
      cache.set('float', 3.14159, 1000);
      cache.set('infinity', Infinity, 1000);
      cache.set('neg-infinity', -Infinity, 1000);
      cache.set('nan', NaN, 1000);

      expect(cache.get<number>('zero')).toBe(0);
      expect(cache.get<number>('negative')).toBe(-123);
      expect(cache.get<number>('float')).toBeCloseTo(3.14159);
      expect(cache.get<number>('infinity')).toBe(Infinity);
      expect(cache.get<number>('neg-infinity')).toBe(-Infinity);
      expect(cache.get<number>('nan')).toBeNaN();
    });

    it('should handle BigInt values', () => {
      const bigIntValue = BigInt('Text');

      cache.set('bigint-key', bigIntValue, 1000);

      const result = cache.get<bigint>('bigint-key');
      expect(result).toBe(bigIntValue);
    });
  });

  describe('Integration Tests', () => {
    it('should handle realistic cache usage pattern', () => {
      jest.useFakeTimers();

      cache.set('BTC', { price: 68000, timestamp: Date.now() }, 30000);
      cache.set('ETH', { price: 3500, timestamp: Date.now() }, 30000);

      expect(cache.get('key')).toBeDefined();
      expect(cache.get('key')).toBeDefined();

      jest.advanceTimersByTime(15000);

      expect(cache.get('key')).toBeDefined();
      expect(cache.get('key')).toBeDefined();

      cache.set('BTC', { price: 68500, timestamp: Date.now() }, 30000);

      jest.advanceTimersByTime(20000);

      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toBeDefined();

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(0);

      jest.useRealTimers();
    });

    it('should handle cache invalidation pattern', () => {
      cache.set('data', { version: 1 }, 1000);

      expect(cache.get('key')).toEqual({ version: 1 });

      cache.delete('data');
      cache.set('data', { version: 2 }, 1000);

      expect(cache.get('key')).toEqual({ version: 2 });

      cache.clear();

      expect(cache.get('key')).toBeNull();
    });

    it('should handle bulk operations', () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        key: `bulk-key-${i}`,
        value: { index: i, data: `value-${i}` },
        ttl: 1000 + i * 10,
      }));

      entries.forEach(({ key, value, ttl }) => {
        cache.set(key, value, ttl);
      });

      expect(cache.size()).toBe(100);

      entries.forEach(({ key, value }) => {
        expect(cache.get(key)).toEqual(value);
      });

      const stats = cache.getStats();
      expect(stats.size).toBe(100);
      expect(stats.keys.length).toBe(100);
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid set/get operations', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        cache.set(`key-${i}`, { data: i }, 10000);
      }

      for (let i = 0; i < iterations; i++) {
        cache.get(`key-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should handle cache clear efficiently', () => {
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, { data: i }, 10000);
      }

      const startTime = Date.now();
      cache.clear();
      const endTime = Date.now();

      expect(cache.size()).toBe(0);
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('MAX_CACHE_SIZE Tests', () => {
    it('should export MAX_CACHE_SIZE constant', () => {
      expect(MAX_CACHE_SIZE).toBe(1000);
    });

    it('should respect cache size limit', () => {
      jest.useFakeTimers();

      for (let i = 0; i < MAX_CACHE_SIZE + 100; i++) {
        cache.set(`key-${i}`, { data: i }, 10000);
      }

      expect(cache.size()).toBeLessThanOrEqual(MAX_CACHE_SIZE);

      jest.useRealTimers();
    });

    it('should evict oldest expired entries first when cache is full', () => {
      jest.useFakeTimers();

      cache.set('expired1', { data: 'expired1' }, 100);
      cache.set('expired2', { data: 'expired2' }, 100);
      cache.set('valid1', { data: 'valid1' }, 10000);
      cache.set('valid2', { data: 'valid2' }, 10000);

      jest.advanceTimersByTime(150);

      for (let i = 0; i < MAX_CACHE_SIZE - 2; i++) {
        cache.set(`fill-${i}`, { data: i }, 10000);
      }

      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toEqual({ data: 'valid1' });
      expect(cache.get('key')).toEqual({ data: 'valid2' });

      jest.useRealTimers();
    });

    it('should evict oldest non-expired entry when no expired entries exist', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, { data: i }, 10000);
      }

      const initialSize = cache.size();
      expect(initialSize).toBe(10);

      for (let i = 10; i < MAX_CACHE_SIZE + 1; i++) {
        cache.set(`new-${i}`, { data: i }, 10000);
      }

      expect(cache.size()).toBeLessThanOrEqual(MAX_CACHE_SIZE);

      const evictedKeys: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = cache.get(`key-${i}`);
        if (result === null) {
          evictedKeys.push(`key-${i}`);
        }
      }

      expect(evictedKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Periodic Cleanup Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start cleanup interval', () => {
      cache.startCleanupInterval();
      expect(cache['cleanupInterval']).not.toBeNull();
    });

    it('should not start multiple cleanup intervals', () => {
      cache.startCleanupInterval();
      const firstInterval = cache['cleanupInterval'];
      cache.startCleanupInterval();
      expect(cache['cleanupInterval']).toBe(firstInterval);
    });

    it('should stop cleanup interval', () => {
      cache.startCleanupInterval();
      cache.stopCleanupInterval();
      expect(cache['cleanupInterval']).toBeNull();
    });

    it('should cleanup expired entries on interval', () => {
      cache.set('expired', { data: 1 }, 1000);
      cache.set('valid', { data: 2 }, 60000);

      cache.startCleanupInterval();

      jest.advanceTimersByTime(1500);

      expect(cache.get('key')).toBeNull();
      expect(cache.get('key')).toEqual({ data: 2 });

      cache.stopCleanupInterval();
    });

    it('should call cleanup every 60 seconds', () => {
      const cleanupSpy = jest.spyOn(cache, 'cleanup');

      cache.startCleanupInterval();

      jest.advanceTimersByTime(60000);
      expect(cleanupSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);
      expect(cleanupSpy).toHaveBeenCalledTimes(2);

      cache.stopCleanupInterval();
      cleanupSpy.mockRestore();
    });

    it('should stop interval on clear', () => {
      cache.startCleanupInterval();
      expect(cache['cleanupInterval']).not.toBeNull();

      cache.clear();

      expect(cache['cleanupInterval']).toBeNull();
    });
  });
});
