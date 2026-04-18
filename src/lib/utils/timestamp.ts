/**
 * Timestamp utility functions for consistent time handling across the application.
 * All functions work with timestamps in milliseconds as the standard unit.
 */

import { ValidationError } from '@/lib/errors';

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
    if (timestamp < 1e10) {
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

  if (seconds < 60) {
    return { value: seconds, unit: 'seconds', isFuture };
  }
  if (seconds < 3600) {
    return { value: Math.floor(seconds / 60), unit: 'minutes', isFuture };
  }
  if (seconds < 86400) {
    return { value: Math.floor(seconds / 3600), unit: 'hours', isFuture };
  }
  return { value: Math.floor(seconds / 86400), unit: 'days', isFuture };
}

export function formatTimeAgo(diff: TimeAgoResult): string {
  const { value, unit, isFuture } = diff;

  if (value === 0 && unit === 'seconds') {
    return 'Just now';
  }

  if (isFuture) {
    switch (unit) {
      case 'seconds':
        return `In ${value} seconds`;
      case 'minutes':
        return `In ${value} minutes`;
      case 'hours':
        return `In ${value} hours`;
      case 'days':
        return `In ${value} days`;
      default:
        return '';
    }
  }

  switch (unit) {
    case 'seconds':
      return `${value} seconds ago`;
    case 'minutes':
      return `${value} minutes ago`;
    case 'hours':
      return `${value} hours ago`;
    case 'days':
      return `${value} days ago`;
    default:
      return '';
  }
}

export function isSeconds(timestamp: number): boolean {
  return timestamp < 1e12;
}

export function isMilliseconds(timestamp: number): boolean {
  return timestamp >= 1e12;
}
