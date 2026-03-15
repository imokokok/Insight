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
