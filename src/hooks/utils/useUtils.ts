'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      if (minLoadingTime > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
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

export type ExportFormat = 'json' | 'csv' | 'excel' | 'png' | 'svg';
export type DataType = 'all' | 'price' | 'historical' | 'network';
export type ExportScope = 'current' | 'all' | 'custom';
export type Resolution = 'standard' | 'high';

export interface ExportOptions {
  format: ExportFormat;
  dataType: DataType;
  timeRange?: string;
  includeMetadata?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  scope?: ExportScope;
  resolution?: Resolution;
  batchExport?: boolean;
  chartTitle?: string;
  dataSource?: string;
  showTimestamp?: boolean;
}

interface UseExportOptions<T> {
  data: T | null;
  filename?: string;
  format?: ExportFormat;
  exportOptions?: Partial<ExportOptions>;
}

interface UseExportReturn {
  exportData: (customOptions?: Partial<ExportOptions>) => void;
  generateFilename: (format: ExportFormat, options?: Partial<ExportOptions>) => string;
}

export function useExport<T>(options: UseExportOptions<T>): UseExportReturn {
  const { data, filename, format = 'json', exportOptions = {} } = options;

  const generateFilename = useCallback(
    (formatType: ExportFormat, opts?: Partial<ExportOptions>): string => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');

      const parts: string[] = [];

      if (filename) {
        parts.push(filename);
      } else {
        parts.push('export');
      }

      parts.push(dateStr);
      parts.push(timeStr);

      if (opts?.timeRange) {
        parts.push(opts.timeRange.toLowerCase());
      }

      if (opts?.dataType && opts.dataType !== 'all') {
        parts.push(opts.dataType);
      }

      const extension = formatType === 'excel' ? 'xlsx' : formatType;
      return `${parts.join('-')}.${extension}`;
    },
    [filename]
  );

  const exportData = useCallback(
    (customOptions?: Partial<ExportOptions>) => {
      if (!data) return;

      const mergedOptions: ExportOptions = {
        format: customOptions?.format || format,
        dataType: customOptions?.dataType || exportOptions.dataType || 'all',
        timeRange: customOptions?.timeRange || exportOptions.timeRange,
        includeMetadata: customOptions?.includeMetadata ?? exportOptions.includeMetadata ?? true,
        dateRange: customOptions?.dateRange || exportOptions.dateRange,
        scope: customOptions?.scope || exportOptions.scope || 'current',
        resolution: customOptions?.resolution || exportOptions.resolution || 'standard',
        batchExport: customOptions?.batchExport ?? exportOptions.batchExport ?? false,
        chartTitle: customOptions?.chartTitle || exportOptions.chartTitle,
        dataSource: customOptions?.dataSource || exportOptions.dataSource,
      };

      const finalFilename = generateFilename(mergedOptions.format, mergedOptions);

      if (mergedOptions.format === 'json') {
        const exportPayload = mergedOptions.includeMetadata
          ? {
              metadata: {
                exportDate: new Date().toISOString(),
                timeRange: mergedOptions.timeRange,
                dataType: mergedOptions.dataType,
                dateRange: mergedOptions.dateRange,
                scope: mergedOptions.scope,
                dataSource: mergedOptions.dataSource,
              },
              data: data,
            }
          : data;

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, finalFilename);
      } else if (mergedOptions.format === 'csv' || mergedOptions.format === 'excel') {
        const csvContent = convertToCSV(data, mergedOptions);
        const mimeType =
          mergedOptions.format === 'excel'
            ? 'application/vnd.ms-excel;charset=utf-8;'
            : 'text/csv;charset=utf-8;';
        const blob = new Blob([csvContent], { type: mimeType });
        downloadBlob(blob, finalFilename);
      }
    },
    [data, format, exportOptions, generateFilename]
  );

  return {
    exportData,
    generateFilename,
  };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convertToCSV<T>(data: T, options?: ExportOptions): string {
  if (!data) return '';

  let processedData: unknown = data;

  if (options?.dataType === 'price' && typeof data === 'object' && data !== null) {
    const dataObj = data as Record<string, unknown>;
    processedData = dataObj.price || dataObj;
  } else if (options?.dataType === 'historical' && typeof data === 'object' && data !== null) {
    const dataObj = data as Record<string, unknown>;
    processedData = dataObj.historical || dataObj;
  }

  if (Array.isArray(processedData) && processedData.length > 0) {
    const headers = Object.keys(processedData[0] as object);
    const rows = processedData.map((item) =>
      headers.map((header) => {
        const value = (item as Record<string, unknown>)[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return String(value);
      })
    );

    const metadataRows: string[] = [];
    if (options?.includeMetadata) {
      metadataRows.push('# Oracle Data Export');
      metadataRows.push(`# Export Date: ${new Date().toISOString()}`);
      if (options.timeRange) {
        metadataRows.push(`# Time Range: ${options.timeRange}`);
      }
      if (options.dateRange) {
        metadataRows.push(`# Date Range: ${options.dateRange.start} - ${options.dateRange.end}`);
      }
      metadataRows.push('#');
    }

    return [...metadataRows, headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  if (typeof processedData === 'object' && processedData !== null) {
    const entries = Object.entries(processedData as Record<string, unknown>);
    const rows = entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${key},"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `${key},"${String(value).replace(/"/g, '""')}"`;
    });

    const metadataRows: string[] = [];
    if (options?.includeMetadata) {
      metadataRows.push('# Oracle Data Export');
      metadataRows.push(`# Export Date: ${new Date().toISOString()}`);
      if (options.timeRange) {
        metadataRows.push(`# Time Range: ${options.timeRange}`);
      }
      metadataRows.push('#');
    }

    return [...metadataRows, 'Key,Value', ...rows].join('\n');
  }

  return String(processedData);
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
