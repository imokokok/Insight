import {
  addDay,
  endOfDayExclusiveUtc,
  get7dAgoUtc,
  getDaysAgoUtc,
  getTodayUtc,
  startOfDayUtc,
} from '../date';

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
  });

  describe('get7dAgoUtc', () => {
    it('returns 7 days ago using setDate arithmetic', () => {
      jest.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));
      expect(get7dAgoUtc()).toBe('2026-07-17');
    });

    it('handles month boundaries', () => {
      jest.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
      expect(get7dAgoUtc()).toBe('2026-02-22');
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
  });

  describe('startOfDayUtc', () => {
    it('returns ISO timestamp at 00:00:00.000Z', () => {
      expect(startOfDayUtc('2026-07-24')).toBe('2026-07-24T00:00:00.000Z');
    });
  });

  describe('endOfDayExclusiveUtc', () => {
    it('returns start of next day', () => {
      expect(endOfDayExclusiveUtc('2026-07-24')).toBe('2026-07-25T00:00:00.000Z');
    });

    it('handles month boundaries', () => {
      expect(endOfDayExclusiveUtc('2026-02-28')).toBe('2026-03-01T00:00:00.000Z');
    });
  });
});
