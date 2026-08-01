/**
 * UTC date helpers used across API routes, MCP tools, and services.
 *
 * The functions intentionally preserve the two existing date-arithmetic
 * styles found in the codebase:
 * - `Date.now() - ms` based helpers (`getDaysAgoUtc`) for simple offsets.
 * - `setDate` based helpers (`get7dAgoUtc`, `addDay`) to mirror the legacy
 *   implementations that operated on local-date objects before slicing the
 *   ISO string. This avoids changing behaviour around DST boundaries.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDaysAgoUtc(days: number): string {
  return new Date(Date.now() - days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function get7dAgoUtc(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function addDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function startOfDayUtc(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

export function endOfDayExclusiveUtc(dateStr: string): string {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + MS_PER_DAY);
  return end.toISOString();
}
