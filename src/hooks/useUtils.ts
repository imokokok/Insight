'use client';

import { useState, useCallback, useRef } from 'react';

interface UseRefreshOptions {
  onRefresh?: () => Promise<void> | void;
  minLoadingTime?: number;
}

interface UseRefreshReturn {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useRefresh(options: UseRefreshOptions = {}): UseRefreshReturn {
  const { onRefresh, minLoadingTime = 500 } = options;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      if (minLoadingTime > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsRefreshing(false);
        }, minLoadingTime);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, onRefresh, minLoadingTime]);

  return {
    isRefreshing,
    refresh,
  };
}

interface UseExportOptions<T> {
  data: T | null;
  filename?: string;
  format?: 'json' | 'csv';
}

interface UseExportReturn {
  exportData: () => void;
}

export function useExport<T>(options: UseExportOptions<T>): UseExportReturn {
  const { data, filename, format = 'json' } = options;

  const exportData = useCallback(() => {
    if (!data) return;

    const timestamp = Date.now();
    const defaultFilename = `export-${timestamp}`;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename || defaultFilename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvContent = convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename || defaultFilename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [data, filename, format]);

  return {
    exportData,
  };
}

function convertToCSV<T>(data: T): string {
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0] as object);
    const rows = data.map((item) =>
      headers.map((header) => {
        const value = (item as Record<string, unknown>)[header];
        return typeof value === 'string' ? `"${value}"` : value;
      })
    );
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
  return '';
}

interface UseLocalStorageOptions<T> {
  key: string;
  initialValue: T;
}

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
}

export function useLocalStorage<T>(options: UseLocalStorageOptions<T>): UseLocalStorageReturn<T> {
  const { key, initialValue } = options;
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    },
    [key, storedValue]
  );

  return {
    value: storedValue,
    setValue,
  };
}
