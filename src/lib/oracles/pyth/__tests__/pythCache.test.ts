import { PythCache } from '../pythCache';

describe('PythCache', () => {
  let cache: PythCache;

  beforeEach(() => {
    cache = new PythCache();
  });

  describe('get and set', () => {
    it('should store and retrieve a value', () => {
      const data = { price: 100, symbol: 'BTC' };

      cache.set('test-key', data, 1000);
      const result = cache.get<typeof data>('test-key');

      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const data = { price: 100 };

      cache.set('test-key', data, 10);

      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = cache.get<typeof data>('test-key');

      expect(result).toBeNull();
    });

    it('should delete expired entry on get', async () => {
      const data = { price: 100 };

      cache.set('test-key', data, 10);

      await new Promise((resolve) => setTimeout(resolve, 20));

      cache.get('test-key');

      expect(cache.size()).toBe(0);
    });

    it('should handle different data types', () => {
      cache.set('string', 'hello', 1000);
      cache.set('number', 42, 1000);
      cache.set('boolean', true, 1000);
      cache.set('array', [1, 2, 3], 1000);
      cache.set('object', { key: 'value' }, 1000);

      expect(cache.get<string>('string')).toBe('hello');
      expect(cache.get<number>('number')).toBe(42);
      expect(cache.get<boolean>('boolean')).toBe(true);
      expect(cache.get<number[]>('array')).toEqual([1, 2, 3]);
      expect(cache.get<{ key: string }>('object')).toEqual({ key: 'value' });
    });

    it('should overwrite existing key', () => {
      cache.set('key', 'first', 1000);
      cache.set('key', 'second', 1000);

      expect(cache.get<string>('key')).toBe('second');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete specific key', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);

      const result = cache.delete('key1');

      expect(result).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should return false for non-existent key', () => {
      const result = cache.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cache.set('key', 'value', 1000);

      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      cache.set('key', 'value', 10);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(cache.has('key')).toBe(false);
    });

    it('should delete expired entry on has check', async () => {
      cache.set('key', 'value', 10);

      await new Promise((resolve) => setTimeout(resolve, 20));

      cache.has('key');

      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1', 1000);
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2', 1000);
      expect(cache.size()).toBe(2);
    });

    it('should not count expired entries', async () => {
      cache.set('key1', 'value1', 10);
      cache.set('key2', 'value2', 1000);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(cache.size()).toBe(2);

      cache.get('key1');

      expect(cache.size()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      cache.set('null-key', null, 1000);

      expect(cache.get('null-key')).toBeNull();
    });

    it('should handle undefined values', () => {
      cache.set('undefined-key', undefined, 1000);

      expect(cache.get('undefined-key')).toBeUndefined();
    });

    it('should handle empty string keys', () => {
      cache.set('', 'empty-key-value', 1000);

      expect(cache.get('')).toBe('empty-key-value');
    });

    it('should handle very long TTL', async () => {
      const data = { price: 100 };

      cache.set('long-ttl', data, 100000);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cache.get<typeof data>('long-ttl')).toEqual(data);
    });

    it('should handle zero TTL (immediate expiry)', async () => {
      const data = { price: 100 };

      cache.set('zero-ttl', data, 0);

      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(cache.get<typeof data>('zero-ttl')).toBeNull();
    });
  });
});
