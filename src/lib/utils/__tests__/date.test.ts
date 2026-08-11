import {
  addDay,
  endOfDayExclusiveUtc,
  get7dAgoUtc,
  getDaysAgoUtc,
  getTodayUtc,
  startOfDayUtc,
} from '../date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('date helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getTodayUtc', () => {
    it('returns ISO date portion for mocked now', () => {
      jest.setSystemTime(new Date('2026-07-24T12:34:56.789Z'));
      expect(getTodayUtc()).toBe('2026-07-24');
    });

    it('rolls over at UTC midnight', () => {
      jest.setSystemTime(new Date('2026-07-24T23:59:59.999Z'));
      expect(getTodayUtc()).toBe('2026-07-24');
      jest.setSystemTime(new Date('2026-07-25T00:00:00.000Z'));
      expect(getTodayUtc()).toBe('2026-07-25');
    });
  });

  describe('getDaysAgoUtc', () => {
    it('returns N days ago based on Date.now()', () => {
      jest.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));
      expect(getDaysAgoUtc(7)).toBe('2026-07-17');
      expect(getDaysAgoUtc(0)).toBe('2026-07-24');
    });

    it('handles month boundaries', () => {
      jest.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
      expect(getDaysAgoUtc(1)).toBe('2026-02-28');
    });

    it('handles year boundaries', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      expect(getDaysAgoUtc(1)).toBe('2025-12-31');
    });

    it('rejects non-integer / negative inputs (fail loud)', () => {
      expect(() => getDaysAgoUtc(-1)).toThrow(TypeError);
      expect(() => getDaysAgoUtc(1.5)).toThrow(TypeError);
      expect(() => getDaysAgoUtc(Number.NaN)).toThrow(TypeError);
    });
  });

  describe('get7dAgoUtc', () => {
    it('returns 7 days ago', () => {
      jest.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));
      expect(get7dAgoUtc()).toBe('2026-07-17');
    });

    it('handles month boundaries', () => {
      jest.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
      expect(get7dAgoUtc()).toBe('2026-02-22');
    });

    it('is consistent with getDaysAgoUtc(7)', () => {
      jest.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
      expect(get7dAgoUtc()).toBe(getDaysAgoUtc(7));
    });
  });

  describe('addDay', () => {
    it('advances by one day', () => {
      expect(addDay('2026-07-24')).toBe('2026-07-25');
    });

    it('handles month end', () => {
      expect(addDay('2026-02-28')).toBe('2026-03-01');
    });

    it('handles year end', () => {
      expect(addDay('2026-12-31')).toBe('2027-01-01');
    });

    it('handles leap years correctly', () => {
      expect(addDay('2024-02-28')).toBe('2024-02-29'); // leap day exists
      expect(addDay('2025-02-28')).toBe('2025-03-01'); // non-leap
    });

    it('advances by exactly one UTC day (timezone-independent)', () => {
      for (const d of ['2026-07-24', '2026-02-28', '2026-12-31', '2024-02-29']) {
        const before = new Date(`${d}T00:00:00.000Z`).getTime();
        const after = new Date(`${addDay(d)}T00:00:00.000Z`).getTime();
        expect(after - before).toBe(MS_PER_DAY);
      }
    });

    it('rejects invalid date strings (fail loud)', () => {
      expect(() => addDay('2026-02-30')).toThrow(TypeError); // impossible calendar date
      expect(() => addDay('not-a-date')).toThrow(TypeError);
      expect(() => addDay('')).toThrow(TypeError);
    });
  });

  describe('startOfDayUtc', () => {
    it('returns ISO timestamp at 00:00:00.000Z', () => {
      expect(startOfDayUtc('2026-07-24')).toBe('2026-07-24T00:00:00.000Z');
    });

    it('rejects invalid date strings', () => {
      expect(() => startOfDayUtc('2026-02-30')).toThrow(TypeError);
    });
  });

  describe('endOfDayExclusiveUtc', () => {
    it('returns start of next day', () => {
      expect(endOfDayExclusiveUtc('2026-07-24')).toBe('2026-07-25T00:00:00.000Z');
    });

    it('handles month boundaries', () => {
      expect(endOfDayExclusiveUtc('2026-02-28')).toBe('2026-03-01T00:00:00.000Z');
    });

    it('is exactly one UTC day after start and equals startOfDay(addDay(d))', () => {
      for (const d of ['2026-07-24', '2026-02-28', '2026-12-31']) {
        const start = new Date(startOfDayUtc(d)).getTime();
        expect(new Date(endOfDayExclusiveUtc(d)).getTime() - start).toBe(MS_PER_DAY);
        expect(endOfDayExclusiveUtc(d)).toBe(startOfDayUtc(addDay(d)));
      }
    });

    it('rejects invalid date strings', () => {
      expect(() => endOfDayExclusiveUtc('2026-02-30')).toThrow(TypeError);
    });
  });
});
