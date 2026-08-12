// Shared, dependency-free helpers for ops tables: CSV export + generic client-side sort.
// Imported only by client components; the DOM APIs below run inside event handlers.

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

/** Toggle sort on header click: asc -> desc -> off. */
export function nextSort(prev: SortState, key: string): SortState {
  if (!prev || prev.key !== key) return { key, dir: 'asc' };
  if (prev.dir === 'asc') return { key, dir: 'desc' };
  return null;
}

/** Stable, locale-aware sort over an arbitrary accessor. Numbers compare numerically. */
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  get: (row: T, key: string) => string | number
): T[] {
  if (!sort) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = get(a, sort.key);
    const bv = get(b, sort.key);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'en') * dir;
  });
}

function escapeCsv(value: string | number | null): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], data: (string | number | null)[][]): string {
  const lines = [header, ...data].map((row) => row.map(escapeCsv).join(','));
  return '﻿' + lines.join('\n'); // BOM so Excel reads UTF-8 correctly
}

export function downloadCsv(
  filename: string,
  header: string[],
  data: (string | number | null)[][]
): void {
  const csv = toCsv(header, data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
