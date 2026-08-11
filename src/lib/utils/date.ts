/**
 * UTC date helpers used across API routes, MCP tools, and services.
 *
 * Correctness contract — these run on servers whose local timezone is not
 * guaranteed to be UTC, so every helper is written purely in terms of UTC
 * calendar fields and returns a `YYYY-MM-DD` (or `...Z` timestamp) string in
 * UTC:
 *  - Date-only inputs are parsed as UTC midnight.
 *  - Day arithmetic uses `getUTCDate` / `setUTCDate`, never the local
 *    `getDate` / `setDate`, so results are identical regardless of the runtime
 *    timezone (a local-tz implementation silently shifts results by the UTC
 *    offset and can be off by a day at month boundaries).
 *  - `addDay` / `endOfDayExclusiveUtc` are the building blocks for half-open
 *    range queries: `[from, to)` is expressed as `>= startOfDayUtc(from)` and
 *    `< endOfDayExclusiveUtc(to)` (equivalently `< addDay(to)`).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a `YYYY-MM-DD` string as UTC midnight. Rejects both malformed strings
 * and calendar-impossible dates (e.g. `2026-02-30`) that `Date` would silently
 * normalize, so a bad input fails loudly with a clear message instead of
 * producing a wrong-but-valid-looking date.
 */
function parseUtcDateStr(dateStr: string): Date {
  if (!DATE_STR_RE.test(dateStr)) {
    throw new TypeError(`Invalid date string "${dateStr}": expected format YYYY-MM-DD`);
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  // A valid input must round-trip to itself. `Date` silently rolls impossible
  // dates forward (2026-02-30 -> 2026-03-02), which the round-trip catches.
  if (date.toISOString().slice(0, 10) !== dateStr) {
    throw new TypeError(`Invalid calendar date "${dateStr}"`);
  }
  return date;
}

export function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDaysAgoUtc(days: number): string {
  if (!Number.isInteger(days) || days < 0) {
    throw new TypeError(`getDaysAgoUtc expects a non-negative integer, got ${days}`);
  }
  // UTC days are exactly MS_PER_DAY long, so subtracting N days from "now"
  // lands on the UTC calendar date N days before today.
  return new Date(Date.now() - days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function get7dAgoUtc(): string {
  // Single source of truth: keep "7 days ago" consistent with getDaysAgoUtc.
  return getDaysAgoUtc(7);
}

export function addDay(dateStr: string): string {
  const date = parseUtcDateStr(dateStr);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function startOfDayUtc(dateStr: string): string {
  // Input is already UTC midnight; re-serialize to assert validity + normalize.
  return parseUtcDateStr(dateStr).toISOString();
}

export function endOfDayExclusiveUtc(dateStr: string): string {
  const start = parseUtcDateStr(dateStr);
  return new Date(start.getTime() + MS_PER_DAY).toISOString();
}
