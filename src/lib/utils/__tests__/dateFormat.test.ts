import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  formatTimestamp,
  parseDate,
  getTimeRange,
  isValidDate,
  getStartOfDay,
  getEndOfDay,
  addDays,
  subtractDays,
  getDaysDifference,
  formatDateRange,
} from '../dateFormat';

describe('dateFormat utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should handle timestamp input', () => {
      const timestamp = new Date('2024-01-15').getTime();
      expect(formatDate(timestamp)).toBe('2024-01-15');
    });

    it('should handle string input', () => {
      expect(formatDate('2024-01-15')).toBe('2024-01-15');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDateTime(date)).toBe('2024-01-15 10:30:00');
    });

    it('should handle different formats', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDateTime(date, 'YYYY-MM-DD HH:mm')).toBe('2024-01-15 10:30');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time for seconds', () => {
      const now = Date.now();
      const fiveSecondsAgo = now - 5000;
      expect(formatRelativeTime(fiveSecondsAgo)).toContain('秒');
    });

    it('should format relative time for minutes', () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      expect(formatRelativeTime(fiveMinutesAgo)).toContain('分钟');
    });

    it('should format relative time for hours', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      expect(formatRelativeTime(twoHoursAgo)).toContain('小时');
    });

    it('should format relative time for days', () => {
      const now = Date.now();
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
      expect(formatRelativeTime(twoDaysAgo)).toContain('天');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in seconds', () => {
      expect(formatDuration(5000)).toBe('5秒');
    });

    it('should format duration in minutes', () => {
      expect(formatDuration(120000)).toBe('2分钟');
    });

    it('should format duration in hours', () => {
      expect(formatDuration(7200000)).toBe('2小时');
    });

    it('should format duration in days', () => {
      expect(formatDuration(172800000)).toBe('2天');
    });

    it('should format complex duration', () => {
      expect(formatDuration(90061000)).toBe('1天1小时1分钟1秒');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp', () => {
      const timestamp = 1705312200000; // 2024-01-15 10:30:00
      expect(formatTimestamp(timestamp)).toBe('2024-01-15 10:30:00');
    });

    it('should handle string timestamp', () => {
      expect(formatTimestamp('1705312200000')).toBe('2024-01-15 10:30:00');
    });
  });

  describe('parseDate', () => {
    it('should parse date string', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });

  describe('getTimeRange', () => {
    it('should return time range for 1H', () => {
      const range = getTimeRange('1H');
      expect(range).toHaveProperty('start');
      expect(range).toHaveProperty('end');
      expect(range.end - range.start).toBe(60 * 60 * 1000);
    });

    it('should return time range for 24H', () => {
      const range = getTimeRange('24H');
      expect(range.end - range.start).toBe(24 * 60 * 60 * 1000);
    });

    it('should return time range for 7D', () => {
      const range = getTimeRange('7D');
      expect(range.end - range.start).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return time range for 30D', () => {
      const range = getTimeRange('30D');
      expect(range.end - range.start).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date', () => {
      expect(isValidDate(new Date())).toBe(true);
    });

    it('should return false for invalid date', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('should return false for non-date values', () => {
      expect(isValidDate('not a date')).toBe(false);
      expect(isValidDate(123)).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2024-01-15T15:30:00');
      const start = getStartOfDay(date);

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2024-01-15T15:30:00');
      const end = getEndOfDay(date);

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 5);

      expect(result.getDate()).toBe(20);
    });

    it('should handle month boundary', () => {
      const date = new Date('2024-01-30');
      const result = addDays(date, 5);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });
  });

  describe('subtractDays', () => {
    it('should subtract days from date', () => {
      const date = new Date('2024-01-15');
      const result = subtractDays(date, 5);

      expect(result.getDate()).toBe(10);
    });

    it('should handle month boundary', () => {
      const date = new Date('2024-01-05');
      const result = subtractDays(date, 10);

      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(26);
    });
  });

  describe('getDaysDifference', () => {
    it('should calculate days difference', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');

      expect(getDaysDifference(start, end)).toBe(5);
    });

    it('should handle negative difference', () => {
      const start = new Date('2024-01-20');
      const end = new Date('2024-01-15');

      expect(getDaysDifference(start, end)).toBe(-5);
    });
  });

  describe('formatDateRange', () => {
    it('should format date range', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');

      expect(formatDateRange(start, end)).toBe('2024-01-15 - 2024-01-20');
    });

    it('should handle timestamp inputs', () => {
      const start = new Date('2024-01-15').getTime();
      const end = new Date('2024-01-20').getTime();

      expect(formatDateRange(start, end)).toBe('2024-01-15 - 2024-01-20');
    });
  });
});
