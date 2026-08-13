/**
 * Timestamp utility functions for consistent time handling across the application.
 * All functions work with timestamps in milliseconds as the standard unit.
 */

import { ValidationError } from '@/lib/errors';

const SECONDS_MS_THRESHOLD = 1e10;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

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
    const date = new Date(timestamp);
    const time = date.getTime();
    if (isNaN(time)) {
      throw new ValidationError(`Invalid date string: ${timestamp}`, {
        field: 'timestamp',
        value: timestamp,
      });
    }
    return time;
  }

  if (typeof timestamp === 'number') {
    // NaN/Infinity are not valid timestamps. Rejecting here fails loud instead
    // of silently propagating a value that later breaks time math — e.g.
    // `new Date(NaN).toISOString()` throws an opaque RangeError, and a finite
    // check here matches the contract already enforced for strings above and
    // by `validateNumberArray` in statistics.ts.
    if (!Number.isFinite(timestamp)) {
      throw new ValidationError(`Invalid timestamp number: ${timestamp}`, {
        field: 'timestamp',
        value: timestamp,
      });
    }
    if (timestamp < SECONDS_MS_THRESHOLD) {
      return timestamp * 1000;
    }
    return timestamp;
  }

  throw new ValidationError(`Invalid timestamp type: ${typeof timestamp}`, {
    field: 'timestamp',
    value: timestamp,
  });
}

/**
 * Normalizes a timestamp to milliseconds.
 * Handles seconds, milliseconds, Date objects, and ISO string formats.
 * This is an alias for {@link toMilliseconds}.
 *
 * @param timestamp - Input timestamp (seconds, milliseconds, Date, or ISO string)
 * @returns Timestamp in milliseconds
 *
 * @example
 * normalizeTimestamp(1234567890) // seconds -> 1234567890000
 * normalizeTimestamp(1234567890000) // milliseconds -> 1234567890000
 * normalizeTimestamp(new Date()) // Date -> milliseconds
 * normalizeTimestamp('2024-01-01T00:00:00Z') // ISO string -> milliseconds
 */
export function normalizeTimestamp(timestamp: number | string | Date): number {
  return toMilliseconds(timestamp);
}

interface TimeAgoResult {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  isFuture: boolean;
}

export function getTimeAgoDiff(input: Date | number): TimeAgoResult {
  const timestamp = input instanceof Date ? input.getTime() : toMilliseconds(input);
  const diffMs = Date.now() - timestamp;
  const isFuture = diffMs < 0;
  const seconds = Math.floor(Math.abs(diffMs) / 1000);

  if (seconds < SECONDS_PER_MINUTE) {
    return { value: seconds, unit: 'seconds', isFuture };
  }
  if (seconds < SECONDS_PER_HOUR) {
    return { value: Math.floor(seconds / SECONDS_PER_MINUTE), unit: 'minutes', isFuture };
  }
  if (seconds < SECONDS_PER_DAY) {
    return { value: Math.floor(seconds / SECONDS_PER_HOUR), unit: 'hours', isFuture };
  }
  return { value: Math.floor(seconds / SECONDS_PER_DAY), unit: 'days', isFuture };
}

const TIME_UNIT_FORMAT: Record<TimeAgoResult['unit'], { long: string; short: string }> = {
  seconds: { long: 'seconds', short: 's' },
  minutes: { long: 'minutes', short: 'm' },
  hours: { long: 'hours', short: 'h' },
  days: { long: 'days', short: 'd' },
};

export function formatTimeAgo(diff: TimeAgoResult): string {
  const { value, unit, isFuture } = diff;
  if (value === 0 && unit === 'seconds') return 'Just now';
  const { long } = TIME_UNIT_FORMAT[unit];
  return isFuture ? `In ${value} ${long}` : `${value} ${long} ago`;
}

export function formatTimeAgoShort(diff: TimeAgoResult): string {
  const { value, unit } = diff;
  if (value === 0 && unit === 'seconds') return 'just now';
  return `${value}${TIME_UNIT_FORMAT[unit].short} ago`;
}

const TIME_UNIT_COLORS: Record<TimeAgoResult['unit'], { future: string; past: string }> = {
  seconds: { future: 'text-amber-500', past: 'text-emerald-600' },
  minutes: { future: 'text-amber-500', past: 'text-emerald-600' },
  hours: { future: 'text-gray-500', past: 'text-gray-500' },
  days: { future: 'text-gray-400', past: 'text-gray-400' },
};

export function formatTimeAgoWithColor(
  diff: TimeAgoResult
): { text: string; color: string } | null {
  const { value, unit, isFuture } = diff;

  if (isFuture) {
    return {
      text: `In ${value}${TIME_UNIT_FORMAT[unit].short}`,
      color: TIME_UNIT_COLORS[unit].future,
    };
  }
  // Past "seconds" collapses to "just now" regardless of magnitude (matches the
  // sibling formatters' value-0 sentinel, but intentionally ignores value here).
  if (unit === 'seconds') return { text: 'just now', color: 'text-emerald-600' };
  return {
    text: `${value}${TIME_UNIT_FORMAT[unit].short} ago`,
    color: TIME_UNIT_COLORS[unit].past,
  };
}
