'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { createLogger } from '@/lib/utils/logger';
import { exportColors } from '@/lib/config/colors';

const logger = createLogger('useChartExport');

// Export format
export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf' | 'csv' | 'json' | 'xlsx';

// Export status
export type ExportStatus =
  | 'idle'
  | 'preparing'
  | 'rendering'
  | 'generating'
  | 'downloading'
  | 'completed'
  | 'error';

// Export configuration
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  quality?: number; // Image quality (0-1)
  scale?: number; // Scale ratio
  backgroundColor?: string;
  width?: number;
  height?: number;
  includeLegend?: boolean;
  includeTitle?: boolean;
  title?: string;
}

// Export progress
export interface ExportProgress {
  status: ExportStatus;
  progress: number; // 0-100
  message: string;
  error?: Error;
  startTime: number;
  endTime?: number;
  elapsedTime?: number;
}

// Data export configuration
export interface DataExportConfig extends ExportConfig {
  data: unknown[];
  columns?: Array<{
    key: string;
    header: string;
    formatter?: (value: unknown) => string;
  }>;
}

export interface UseChartExportOptions {
  defaultFilename?: string;
  defaultScale?: number;
  defaultQuality?: number;
  onExportStart?: () => void;
  onExportComplete?: (url: string) => void;
  onExportError?: (error: Error) => void;
}

export interface UseChartExportReturn {
  // Status
  isExporting: boolean;
  progress: ExportProgress;

  // Export methods
  exportChart: (
    chartRef: React.RefObject<HTMLElement>,
    config?: Partial<ExportConfig>
  ) => Promise<string | null>;
  exportData: (config: DataExportConfig) => Promise<string | null>;
  exportToImage: (
    chartRef: React.RefObject<HTMLElement>,
    format: 'png' | 'jpeg' | 'svg',
    options?: Partial<ExportConfig>
  ) => Promise<string | null>;
  exportToCSV: (
    data: unknown[],
    filename?: string,
    columns?: DataExportConfig['columns']
  ) => Promise<string | null>;
  exportToJSON: (data: unknown[], filename?: string) => Promise<string | null>;

  // Progress control
  cancelExport: () => void;
  resetExport: () => void;
}

// Export message keys for i18n
export const exportMessageKeys = {
  preparing: 'hooks.export.preparing',
  rendering: 'hooks.export.rendering',
  generating: 'hooks.export.generating',
  downloading: 'hooks.export.downloading',
  completed: 'hooks.export.completed',
  failed: 'hooks.export.failed',
  cancelled: 'hooks.export.cancelled',
  preparingCsv: 'hooks.export.preparingCsv',
  generatingCsv: 'hooks.export.generatingCsv',
  preparingJson: 'hooks.export.preparingJson',
  generatingJson: 'hooks.export.generatingJson',
};

/**
 * Chart export Hook
 * - Encapsulates export logic
 * - Supports multiple formats
 * - Export progress tracking
 */
export function useChartExport(options: UseChartExportOptions = {}): UseChartExportReturn {
  const {
    defaultFilename = 'chart-export',
    defaultScale = 2,
    defaultQuality = 0.95,
    onExportStart,
    onExportComplete,
    onExportError,
  } = options;

  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
    message: exportMessageKeys.preparing,
    startTime: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const isExporting =
    progress.status !== 'idle' && progress.status !== 'completed' && progress.status !== 'error';

  // Update progress
  const updateProgress = useCallback((updates: Partial<ExportProgress>) => {
    setProgress((prev) => {
      const newProgress = { ...prev, ...updates };
      if (updates.status === 'completed' || updates.status === 'error') {
        newProgress.endTime = Date.now();
        newProgress.elapsedTime = newProgress.endTime - prev.startTime;
      }
      return newProgress;
    });
  }, []);

  // Check if cancelled
  const checkCancelled = useCallback(() => {
    if (isCancelledRef.current || abortControllerRef.current?.signal.aborted) {
      throw new Error('Export cancelled');
    }
  }, []);

  // Convert SVG to image
  const svgToImage = useCallback(
    async (
      svgElement: SVGSVGElement,
      format: 'png' | 'jpeg' | 'svg',
      config: ExportConfig
    ): Promise<string> => {
      checkCancelled();

      const {
        width,
        height,
        scale = defaultScale,
        quality = defaultQuality,
        backgroundColor = exportColors.background,
      } = config;

      // If SVG format, return serialized string directly
      if (format === 'svg') {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        return URL.createObjectURL(blob);
      }

      updateProgress({ status: 'rendering', progress: 30, message: exportMessageKeys.rendering });

      // Clone SVG for modifications
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // Set dimensions
      const svgWidth = width || svgElement.viewBox.baseVal.width || svgElement.clientWidth || 800;
      const svgHeight =
        height || svgElement.viewBox.baseVal.height || svgElement.clientHeight || 600;

      clonedSvg.setAttribute('width', String(svgWidth));
      clonedSvg.setAttribute('height', String(svgHeight));

      // Add background color
      if (backgroundColor && format === 'jpeg') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', backgroundColor);
        clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      }

      // Serialize SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      checkCancelled();

      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          try {
            checkCancelled();

            updateProgress({ status: 'generating', progress: 60, message: exportMessageKeys.generating });

            const canvas = document.createElement('canvas');
            canvas.width = svgWidth * scale;
            canvas.height = svgHeight * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Fill background
            if (backgroundColor) {
              ctx.fillStyle = backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw image
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(url);

            // Convert to Data URL
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataUrl = canvas.toDataURL(mimeType, quality);

            resolve(dataUrl);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG image'));
        };

        img.src = url;
      });
    },
    [checkCancelled, updateProgress, defaultScale, defaultQuality]
  );

  // Export chart as image
  const exportToImage = useCallback(
    async (
      chartRef: React.RefObject<HTMLElement>,
      format: 'png' | 'jpeg' | 'svg',
      options: Partial<ExportConfig> = {}
    ): Promise<string | null> => {
      if (!chartRef.current) {
        logger.error('Chart ref is not available');
        return null;
      }

      abortControllerRef.current = new AbortController();
      isCancelledRef.current = false;

      try {
        onExportStart?.();
        updateProgress({
          status: 'preparing',
          progress: 10,
          message: exportMessageKeys.preparing,
          startTime: Date.now(),
        });

        // Find SVG element
        const svgElement = chartRef.current.querySelector('svg');
        if (!svgElement) {
          throw new Error('No SVG element found in chart');
        }

        const config: ExportConfig = {
          format,
          filename: options.filename || defaultFilename,
          scale: options.scale || defaultScale,
          quality: options.quality || defaultQuality,
          backgroundColor: options.backgroundColor || exportColors.background,
          width: options.width,
          height: options.height,
          includeLegend: options.includeLegend ?? true,
          includeTitle: options.includeTitle ?? true,
          title: options.title,
        };

        const dataUrl = await svgToImage(svgElement, format, config);

        checkCancelled();

        updateProgress({ status: 'downloading', progress: 80, message: exportMessageKeys.downloading });

        // Download file
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${config.filename}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        updateProgress({ status: 'completed', progress: 100, message: exportMessageKeys.completed });
        onExportComplete?.(dataUrl);

        return dataUrl;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Export failed', err);
        updateProgress({ status: 'error', progress: 0, message: exportMessageKeys.failed, error: err });
        onExportError?.(err);
        return null;
      }
    },
    [
      defaultFilename,
      defaultScale,
      defaultQuality,
      onExportStart,
      onExportComplete,
      onExportError,
      svgToImage,
      checkCancelled,
      updateProgress,
    ]
  );

  // Export chart (generic method)
  const exportChart = useCallback(
    async (
      chartRef: React.RefObject<HTMLElement>,
      config: Partial<ExportConfig> = {}
    ): Promise<string | null> => {
      const format = config.format || 'png';

      if (format === 'csv' || format === 'json' || format === 'xlsx') {
        logger.error(`Use exportData for ${format} format`);
        return null;
      }

      return exportToImage(chartRef, format as 'png' | 'jpeg' | 'svg', config);
    },
    [exportToImage]
  );

  // Convert to CSV
  const convertToCSV = useCallback(
    (data: unknown[], columns?: DataExportConfig['columns']): string => {
      if (data.length === 0) return '';

      const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0] as object);
      const headers = columns ? columns.map((c) => c.header) : keys;

      const csvRows: string[] = [];

      // Add header row
      csvRows.push(headers.join(','));

      // Add data rows
      for (const row of data) {
        const values = keys.map((key) => {
          const column = columns?.find((c) => c.key === key);
          let value: unknown;

          if (column?.formatter) {
            value = column.formatter((row as Record<string, unknown>)[key]);
          } else {
            value = (row as Record<string, unknown>)[key];
          }

          // Handle special characters
          const stringValue = String(value ?? '');
          if (
            stringValue.includes(',') ||
            stringValue.includes('\n') ||
            stringValue.includes('"')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });

        csvRows.push(values.join(','));
      }

      return csvRows.join('\n');
    },
    []
  );

  // Export as CSV
  const exportToCSV = useCallback(
    async (
      data: unknown[],
      filename?: string,
      columns?: DataExportConfig['columns']
    ): Promise<string | null> => {
      abortControllerRef.current = new AbortController();
      isCancelledRef.current = false;

      try {
        onExportStart?.();
        updateProgress({
          status: 'preparing',
          progress: 20,
          message: exportMessageKeys.preparingCsv,
          startTime: Date.now(),
        });

        checkCancelled();

        updateProgress({ status: 'generating', progress: 50, message: exportMessageKeys.generatingCsv });

        const csv = convertToCSV(data, columns);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        checkCancelled();

        updateProgress({ status: 'downloading', progress: 80, message: exportMessageKeys.downloading });

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename || defaultFilename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        updateProgress({ status: 'completed', progress: 100, message: exportMessageKeys.completed });
        onExportComplete?.(url);

        return url;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('CSV export failed', err);
        updateProgress({ status: 'error', progress: 0, message: exportMessageKeys.failed, error: err });
        onExportError?.(err);
        return null;
      }
    },
    [
      defaultFilename,
      onExportStart,
      onExportComplete,
      onExportError,
      convertToCSV,
      checkCancelled,
      updateProgress,
    ]
  );

  // Export as JSON
  const exportToJSON = useCallback(
    async (data: unknown[], filename?: string): Promise<string | null> => {
      abortControllerRef.current = new AbortController();
      isCancelledRef.current = false;

      try {
        onExportStart?.();
        updateProgress({
          status: 'preparing',
          progress: 20,
          message: exportMessageKeys.preparingJson,
          startTime: Date.now(),
        });

        checkCancelled();

        updateProgress({ status: 'generating', progress: 50, message: exportMessageKeys.generatingJson });

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        checkCancelled();

        updateProgress({ status: 'downloading', progress: 80, message: exportMessageKeys.downloading });

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename || defaultFilename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        updateProgress({ status: 'completed', progress: 100, message: exportMessageKeys.completed });
        onExportComplete?.(url);

        return url;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('JSON export failed', err);
        updateProgress({ status: 'error', progress: 0, message: exportMessageKeys.failed, error: err });
        onExportError?.(err);
        return null;
      }
    },
    [
      defaultFilename,
      onExportStart,
      onExportComplete,
      onExportError,
      checkCancelled,
      updateProgress,
    ]
  );

  // Export data (generic method)
  const exportData = useCallback(
    async (config: DataExportConfig): Promise<string | null> => {
      const { format, data, filename, columns } = config;

      switch (format) {
        case 'csv':
          return exportToCSV(data, filename, columns);
        case 'json':
          return exportToJSON(data, filename);
        default:
          logger.error(`Unsupported data export format: ${format}`);
          return null;
      }
    },
    [exportToCSV, exportToJSON]
  );

  // Cancel export
  const cancelExport = useCallback(() => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    updateProgress({ status: 'idle', progress: 0, message: exportMessageKeys.cancelled });
    logger.info('Export cancelled');
  }, [updateProgress]);

  // Reset export status
  const resetExport = useCallback(() => {
    isCancelledRef.current = false;
    abortControllerRef.current = null;
    setProgress({
      status: 'idle',
      progress: 0,
      message: exportMessageKeys.preparing,
      startTime: 0,
    });
  }, []);

  return useMemo(
    () => ({
      isExporting,
      progress,
      exportChart,
      exportData,
      exportToImage,
      exportToCSV,
      exportToJSON,
      cancelExport,
      resetExport,
    }),
    [
      isExporting,
      progress,
      exportChart,
      exportData,
      exportToImage,
      exportToCSV,
      exportToJSON,
      cancelExport,
      resetExport,
    ]
  );
}

// Batch export Hook
export interface BatchExportItem {
  id: string;
  chartRef?: React.RefObject<HTMLElement>;
  data?: unknown[];
  config: ExportConfig | DataExportConfig;
}

export interface UseBatchChartExportOptions {
  onBatchStart?: () => void;
  onBatchComplete?: (results: Array<{ id: string; success: boolean; url?: string }>) => void;
  onBatchError?: (error: Error) => void;
}

export interface UseBatchChartExportReturn {
  isBatchExporting: boolean;
  currentIndex: number;
  totalCount: number;
  batchProgress: number;
  results: Array<{ id: string; success: boolean; url?: string; error?: Error }>;
  exportBatch: (items: BatchExportItem[]) => Promise<void>;
  cancelBatch: () => void;
  resetBatch: () => void;
}

/**
 * Batch chart export Hook
 */
export function useBatchChartExport(
  options: UseBatchChartExportOptions = {}
): UseBatchChartExportReturn {
  const { onBatchStart, onBatchComplete, onBatchError } = options;

  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState<
    Array<{ id: string; success: boolean; url?: string; error?: Error }>
  >([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const batchProgress = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0;

  const exportBatch = useCallback(
    async (items: BatchExportItem[]) => {
      if (items.length === 0) return;

      abortControllerRef.current = new AbortController();
      setIsBatchExporting(true);
      setTotalCount(items.length);
      setCurrentIndex(0);
      setResults([]);

      onBatchStart?.();

      const batchResults: Array<{ id: string; success: boolean; url?: string; error?: Error }> = [];

      try {
        for (let i = 0; i < items.length; i++) {
          if (abortControllerRef.current.signal.aborted) {
            throw new Error('Batch export cancelled');
          }

          setCurrentIndex(i);
          const item = items[i];

          try {
            let url: string | null = null;

            if (item.chartRef && 'format' in item.config) {
              // Export chart
              const chartExport = useChartExport();
              url = await chartExport.exportChart(item.chartRef, item.config as ExportConfig);
            } else if (item.data) {
              // Export data
              const chartExport = useChartExport();
              url = await chartExport.exportData({
                ...item.config,
                data: item.data,
              } as DataExportConfig);
            }

            batchResults.push({ id: item.id, success: !!url, url: url || undefined });
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            batchResults.push({ id: item.id, success: false, error: err });
          }
        }

        setResults(batchResults);
        onBatchComplete?.(batchResults);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Batch export failed', err);
        onBatchError?.(err);
      } finally {
        setIsBatchExporting(false);
      }
    },
    [onBatchStart, onBatchComplete, onBatchError]
  );

  const cancelBatch = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsBatchExporting(false);
    logger.info('Batch export cancelled');
  }, []);

  const resetBatch = useCallback(() => {
    setIsBatchExporting(false);
    setCurrentIndex(0);
    setTotalCount(0);
    setResults([]);
    abortControllerRef.current = null;
  }, []);

  return {
    isBatchExporting,
    currentIndex,
    totalCount,
    batchProgress,
    results,
    exportBatch,
    cancelBatch,
    resetBatch,
  };
}
