/**
 * Timestamp utility functions for consistent time handling across the application.
 * All functions work with timestamps in milliseconds as the standard unit.
 */

/**
 * Converts a timestamp to milliseconds.
 * Handles seconds, milliseconds, Date objects, and ISO string formats.
 *
 * @param timestamp - Input timestamp (seconds, milliseconds, Date, or ISO string)
 * @returns Timestamp in milliseconds
 *
 * @example
 * toMilliseconds(1234567890) // seconds -> 1234567890000
 * toMilliseconds(1234567890000) // milliseconds -> 1234567890000
 * toMilliseconds(new Date()) // Date -> milliseconds
 * toMilliseconds('2024-01-01T00:00:00Z') // ISO string -> milliseconds
 */
export function toMilliseconds(timestamp: number | string | Date): number {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }

  if (typeof timestamp === 'number') {
    if (timestamp < 1e12) {
      return timestamp * 1000;
    }
    return timestamp;
  }

  throw new Error(`Invalid timestamp type: ${typeof timestamp}`);
}

/**
 * Converts a timestamp to seconds.
 * Handles seconds, milliseconds, Date objects, and ISO string formats.
 *
 * @param timestamp - Input timestamp (seconds, milliseconds, Date, or ISO string)
 * @returns Timestamp in seconds (floor division)
 *
 * @example
 * toSeconds(1234567890) // seconds -> 1234567890
 * toSeconds(1234567890000) // milliseconds -> 1234567890
 * toSeconds(new Date()) // Date -> seconds
 * toSeconds('2024-01-01T00:00:00Z') // ISO string -> seconds
 */
export function toSeconds(timestamp: number | string | Date): number {
  const ms = toMilliseconds(timestamp);
  return Math.floor(ms / 1000);
}

/**
 * Normalizes a timestamp to milliseconds (standard unit for the application).
 * This is an alias for toMilliseconds for semantic clarity.
 *
 * @param timestamp - Input timestamp (seconds, milliseconds, Date, or ISO string)
 * @returns Timestamp in milliseconds
 *
 * @example
 * normalizeTimestamp(1234567890) // -> 1234567890000
 * normalizeTimestamp(Date.now()) // -> current timestamp in ms
 */
export function normalizeTimestamp(timestamp: number | string | Date): number {
  return toMilliseconds(timestamp);
}

export interface TimeAgoResult {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

export function getTimeAgoDiff(input: Date | number): TimeAgoResult {
  const timestamp = input instanceof Date ? input.getTime() : toMilliseconds(input);
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return { value: seconds, unit: 'seconds' };
  }
  if (seconds < 3600) {
    return { value: Math.floor(seconds / 60), unit: 'minutes' };
  }
  if (seconds < 86400) {
    return { value: Math.floor(seconds / 3600), unit: 'hours' };
  }
  return { value: Math.floor(seconds / 86400), unit: 'days' };
}

export function formatTimeAgo(
  diff: TimeAgoResult,
  t: (key: string, params?: Record<string, number>) => string
): string {
  const { value, unit } = diff;

  if (value === 0 && unit === 'seconds') {
    return t('time.justNow');
  }

  switch (unit) {
    case 'seconds':
      return t('time.secondsAgo', { seconds: value });
    case 'minutes':
      return t('time.minutesAgo', { minutes: value });
    case 'hours':
      return t('time.hoursAgo', { hours: value });
    case 'days':
      return t('time.daysAgo', { days: value });
    default:
      return '';
  }
}

export function getTimeAgo(
  input: Date | number,
  t: (key: string, params?: Record<string, number>) => string
): string {
  const diff = getTimeAgoDiff(input);
  return formatTimeAgo(diff, t);
}
