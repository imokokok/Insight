// Shared time-range definitions for the /ops console. `range.ts` is server-safe
// (no 'use client') so both the server pages (which map a range key to a window
// in hours) and the client TimeRangePicker (which renders the switcher) import it.

export const RANGES = [
  { key: '1h', label: '1h', hours: 1 },
  { key: '24h', label: '24h', hours: 24 },
  { key: '7d', label: '7d', hours: 168 },
  { key: '30d', label: '30d', hours: 720 },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

/** Map a `?range=` query value to a window in hours; defaults to 24h. */
export function rangeToHours(range?: string | null): number {
  const found = RANGES.find((r) => r.key === range);
  return found ? found.hours : 24;
}

/** Human label for the current range, used in stat subtitles. */
export function rangeLabel(range?: string | null): string {
  const found = RANGES.find((r) => r.key === range);
  return found ? found.label : '24h';
}
