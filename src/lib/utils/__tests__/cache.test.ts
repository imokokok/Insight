import { TTLCache } from '../cache';

describe('TTLCache', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic set/get/has/delete', () => {
    it('stores and returns values', () => {
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      cache.set('a', 1, 1000);
      expect(cache.get('a')).toBe(1);
      expect(cache.has('a')).toBe(true);
      expect(cache.size).toBe(1);
    });

    it('returns null / false for missing keys', () => {
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      expect(cache.get('missing')).toBeNull();
      expect(cache.has('missing')).toBe(false);
    });

    it('deletes and clears entries', () => {
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      cache.set('a', 1, 1000);
      cache.set('b', 2, 1000);
      expect(cache.delete('a')).toBe(true);
      expect(cache.has('a')).toBe(false);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('TTL expiry', () => {
    it('expires entries after their ttl', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      cache.set('x', 42, 1000);
      expect(cache.get('x')).toBe(42);
      jest.advanceTimersByTime(1001);
      expect(cache.get('x')).toBeNull();
      expect(cache.has('x')).toBe(false);
    });

    it('never expires an entry with an Infinity ttl', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      cache.set('forever', 'v', Infinity);
      jest.advanceTimersByTime(1_000_000_000);
      expect(cache.get('forever')).toBe('v');
    });
  });

  describe('maxSize eviction', () => {
    it('evicts the oldest entries first (FIFO) when over capacity', () => {
      const cache = new TTLCache({ maxSize: 3, cleanupIntervalMs: 0 });
      cache.set('a', 1, 1000);
      cache.set('b', 2, 1000);
      cache.set('c', 3, 1000);
      cache.set('d', 4, 1000); // should evict 'a'
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('d')).toBe(true);
      expect(cache.size).toBe(3);
    });

    it('refreshes FIFO position on re-insert so recent keys survive', () => {
      const cache = new TTLCache({ maxSize: 2, cleanupIntervalMs: 0 });
      cache.set('a', 1, 1000);
      cache.set('b', 2, 1000);
      cache.set('a', 1, 1000); // touch 'a' -> now newest
      cache.set('c', 3, 1000); // should evict 'b', not 'a'
      expect(cache.has('b')).toBe(false);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('c')).toBe(true);
    });

    it('treats maxSize <= 0 as unbounded (no eviction)', () => {
      const cache = new TTLCache({ maxSize: 0, cleanupIntervalMs: 0 });
      for (let i = 0; i < 50; i++) cache.set(`k${i}`, i, 1000);
      expect(cache.size).toBe(50);
    });

    it('defaults maxSize to 1000 when omitted', () => {
      const cache = new TTLCache({ cleanupIntervalMs: 0 });
      for (let i = 0; i < 1005; i++) cache.set(`k${i}`, i, 1000);
      expect(cache.size).toBe(1000);
    });
  });

  describe('invalid input guards', () => {
    it('does not start a background sweep when cleanupIntervalMs <= 0', () => {
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      // Manual invocation must remain a safe no-op (no busy-loop timer).
      expect(() => cache.startCleanupInterval()).not.toThrow();
      cache.destroy();
    });

    it('does not cache entries with a negative/NaN ttl (fails loudly)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      cache.set('neg', 'v', -5);
      cache.set('nan', 'v', NaN);
      // ttl is normalized to 0 => entry is effectively dead on the next tick
      // (not cached meaningfully), so a broken caller fails loudly.
      jest.advanceTimersByTime(1);
      expect(cache.get('neg')).toBeNull();
      expect(cache.get('nan')).toBeNull();
    });
  });

  describe('background cleanup', () => {
    it('removes expired entries on the sweep interval', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 1000 });
      cache.set('x', 1, 500);
      jest.advanceTimersByTime(1000);
      expect(cache.has('x')).toBe(false);
      cache.destroy();
    });
  });

  describe('destroy', () => {
    it('clears entries and is idempotent', () => {
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 0 });
      cache.set('a', 1, 1000);
      cache.destroy();
      expect(cache.size).toBe(0);
      expect(() => cache.destroy()).not.toThrow();
      expect(cache.size).toBe(0);
    });

    it('does not resurrect the cleanup timer after destroy', () => {
      const cache = new TTLCache({ maxSize: 10, cleanupIntervalMs: 1000 });
      // Spy only after construction so the constructor's own setInterval
      // (legitimate) is not counted.
      const spy = jest.spyOn(global, 'setInterval');
      cache.destroy();
      cache.startCleanupInterval();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
