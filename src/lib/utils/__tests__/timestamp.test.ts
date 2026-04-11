import {
  toMilliseconds,
  toSeconds,
  normalizeTimestamp,
  isSeconds,
  isMilliseconds,
} from '../timestamp';

describe('Timestamp Utilities', () => {
  const testTimestampSeconds = 1234567890;
  const testTimestampMilliseconds = 1234567890000;
  const testDate = new Date('2024-01-01T00:00:00Z');
  const testISOString = '2024-01-01T00:00:00Z';

  describe('toMilliseconds', () => {
    it('should convert seconds to milliseconds', () => {
      const result = toMilliseconds(testTimestampSeconds);
      expect(result).toBe(testTimestampMilliseconds);
    });

    it('should keep milliseconds unchanged', () => {
      const result = toMilliseconds(testTimestampMilliseconds);
      expect(result).toBe(testTimestampMilliseconds);
    });

    it('should convert Date object to milliseconds', () => {
      const result = toMilliseconds(testDate);
      expect(result).toBe(testDate.getTime());
    });

    it('should convert ISO string to milliseconds', () => {
      const result = toMilliseconds(testISOString);
      expect(result).toBe(new Date(testISOString).getTime());
    });

    it('should handle edge case near threshold', () => {
      const nearThreshold = 9999999999;
      const result = toMilliseconds(nearThreshold);
      expect(result).toBe(nearThreshold * 1000);
    });

    it('should handle zero', () => {
      const result = toMilliseconds(0);
      expect(result).toBe(0);
    });
  });

  describe('toSeconds', () => {
    it('should convert milliseconds to seconds', () => {
      const result = toSeconds(testTimestampMilliseconds);
      expect(result).toBe(testTimestampSeconds);
    });

    it('should keep seconds unchanged', () => {
      const result = toSeconds(testTimestampSeconds);
      expect(result).toBe(testTimestampSeconds);
    });

    it('should convert Date object to seconds', () => {
      const result = toSeconds(testDate);
      expect(result).toBe(Math.floor(testDate.getTime() / 1000));
    });

    it('should convert ISO string to seconds', () => {
      const result = toSeconds(testISOString);
      expect(result).toBe(Math.floor(new Date(testISOString).getTime() / 1000));
    });

    it('should use floor division', () => {
      const result = toSeconds(1234567899500);
      expect(result).toBe(1234567899);
    });

    it('should handle zero', () => {
      const result = toSeconds(0);
      expect(result).toBe(0);
    });
  });

  describe('normalizeTimestamp', () => {
    it('should normalize seconds to milliseconds', () => {
      const result = normalizeTimestamp(testTimestampSeconds);
      expect(result).toBe(testTimestampMilliseconds);
    });

    it('should normalize milliseconds to milliseconds', () => {
      const result = normalizeTimestamp(testTimestampMilliseconds);
      expect(result).toBe(testTimestampMilliseconds);
    });

    it('should normalize Date object to milliseconds', () => {
      const result = normalizeTimestamp(testDate);
      expect(result).toBe(testDate.getTime());
    });

    it('should normalize ISO string to milliseconds', () => {
      const result = normalizeTimestamp(testISOString);
      expect(result).toBe(new Date(testISOString).getTime());
    });

    it('should be an alias for toMilliseconds', () => {
      const inputs = [testTimestampSeconds, testTimestampMilliseconds, testDate, testISOString];

      inputs.forEach((input) => {
        expect(normalizeTimestamp(input)).toBe(toMilliseconds(input));
      });
    });
  });

  describe('isSeconds', () => {
    it('should return true for seconds timestamp', () => {
      expect(isSeconds(testTimestampSeconds)).toBe(true);
    });

    it('should return false for milliseconds timestamp', () => {
      expect(isSeconds(testTimestampMilliseconds)).toBe(false);
    });

    it('should return true for zero', () => {
      expect(isSeconds(0)).toBe(true);
    });

    it('should return true for values below 1e12', () => {
      expect(isSeconds(999999999999)).toBe(true);
    });

    it('should return false for values at or above 1e12', () => {
      expect(isSeconds(1000000000000)).toBe(false);
    });
  });

  describe('isMilliseconds', () => {
    it('should return true for milliseconds timestamp', () => {
      expect(isMilliseconds(testTimestampMilliseconds)).toBe(true);
    });

    it('should return false for seconds timestamp', () => {
      expect(isMilliseconds(testTimestampSeconds)).toBe(false);
    });

    it('should return false for zero', () => {
      expect(isMilliseconds(0)).toBe(false);
    });

    it('should return false for values below 1e12', () => {
      expect(isMilliseconds(999999999999)).toBe(false);
    });

    it('should return true for values at or above 1e12', () => {
      expect(isMilliseconds(1000000000000)).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should handle round-trip conversion: seconds -> ms -> seconds', () => {
      const ms = toMilliseconds(testTimestampSeconds);
      const seconds = toSeconds(ms);
      expect(seconds).toBe(testTimestampSeconds);
    });

    it('should handle round-trip conversion: ms -> seconds -> ms', () => {
      const seconds = toSeconds(testTimestampMilliseconds);
      const ms = toMilliseconds(seconds);
      expect(ms).toBe(testTimestampMilliseconds);
    });

    it('should work with current timestamp', () => {
      const now = Date.now();
      const normalized = normalizeTimestamp(now);
      expect(normalized).toBe(now);
    });

    it('should handle Date.now() correctly', () => {
      const now = Date.now();
      const asSeconds = toSeconds(now);
      const backToMs = toMilliseconds(asSeconds);
      expect(backToMs).toBe(Math.floor(now / 1000) * 1000);
    });
  });
});
