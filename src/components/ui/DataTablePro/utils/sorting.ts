import { getNestedValue } from './formatting';

import type { SortConfig } from '../types';

export function sortData<T extends Record<string, unknown>>(
  data: T[],
  sortConfig: SortConfig[]
): T[] {
  if (sortConfig.length === 0) return data;

  return [...data].sort((a, b) => {
    for (const sort of sortConfig) {
      const aValue = getNestedValue(a, sort.key);
      const bValue = getNestedValue(b, sort.key);

      if (aValue === bValue) continue;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue ?? '');
      const bStr = String(bValue ?? '');
      const comparison = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      return sort.direction === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
}

export function handleMultiSort(
  currentConfig: SortConfig[],
  key: string,
  multiSort: boolean,
  onSort?: (sortConfig: SortConfig[]) => void
): SortConfig[] {
  const existingIndex = currentConfig.findIndex((s) => s.key === key);

  if (existingIndex === -1) {
    const newSort: SortConfig = { key, direction: 'asc' };
    const newConfig = multiSort ? [...currentConfig, newSort] : [newSort];
    onSort?.(newConfig);
    return newConfig;
  }

  const existing = currentConfig[existingIndex];
  if (existing.direction === 'asc') {
    const updated = [...currentConfig];
    updated[existingIndex] = { ...existing, direction: 'desc' };
    const newConfig = multiSort ? updated : [updated[existingIndex]];
    onSort?.(newConfig);
    return newConfig;
  }

  let newConfig: SortConfig[];
  if (multiSort) {
    newConfig = currentConfig.filter((_, i) => i !== existingIndex);
  } else {
    newConfig = [];
  }
  onSort?.(newConfig);
  return newConfig;
}
