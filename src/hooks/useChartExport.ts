'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useChartExport');

// 导出格式
export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf' | 'csv' | 'json' | 'xlsx';

// 导出状态
export type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'generating' | 'downloading' | 'completed' | 'error';

// 导出配置
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  quality?: number; // 图片质量 (0-1)
  scale?: number; // 缩放比例
  backgroundColor?: string;
  width?: number;
  height?: number;
  includeLegend?: boolean;
  includeTitle?: boolean;
  title?: string;
}

// 导出进度
export interface ExportProgress {
  status: ExportStatus;
  progress: number; // 0-100
  message: string;
  error?: Error;
  startTime: number;
  endTime?: number;
  elapsedTime?: number;
}

// 数据导出配置
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
  // 状态
  isExporting: boolean;
  progress: ExportProgress;

  // 导出方法
  exportChart: (chartRef: React.RefObject<HTMLElement>, config?: Partial<ExportConfig>) => Promise<string | null>;
  exportData: (config: DataExportConfig) => Promise<string | null>;
  exportToImage: (
    chartRef: React.RefObject<HTMLElement>,
    format: 'png' | 'jpeg' | 'svg',
    options?: Partial<ExportConfig>
  ) => Promise<string | null>;
  exportToCSV: (data: unknown[], filename?: string, columns?: DataExportConfig['columns']) => Promise<string | null>;
  exportToJSON: (data: unknown[], filename?: string) => Promise<string | null>;

  // 进度控制
  cancelExport: () => void;
  resetExport: () => void;
}

/**
 * 图表导出 Hook
 * - 封装导出逻辑
 * - 支持多种格式
 * - 导出进度跟踪
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
    message: '准备导出...',
    startTime: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const isExporting = progress.status !== 'idle' && progress.status !== 'completed' && progress.status !== 'error';

  // 更新进度
  const updateProgress = useCallback(
    (updates: Partial<ExportProgress>) => {
      setProgress((prev) => {
        const newProgress = { ...prev, ...updates };
        if (updates.status === 'completed' || updates.status === 'error') {
          newProgress.endTime = Date.now();
          newProgress.elapsedTime = newProgress.endTime - prev.startTime;
        }
        return newProgress;
      });
    },
    []
  );

  // 检查是否已取消
  const checkCancelled = useCallback(() => {
    if (isCancelledRef.current || abortControllerRef.current?.signal.aborted) {
      throw new Error('Export cancelled');
    }
  }, []);

  // 将 SVG 转换为图片
  const svgToImage = useCallback(
    async (
      svgElement: SVGSVGElement,
      format: 'png' | 'jpeg' | 'svg',
      config: ExportConfig
    ): Promise<string> => {
      checkCancelled();

      const { width, height, scale = defaultScale, quality = defaultQuality, backgroundColor = '#ffffff' } = config;

      // 如果是 SVG 格式，直接返回序列化后的字符串
      if (format === 'svg') {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        return URL.createObjectURL(blob);
      }

      updateProgress({ status: 'rendering', progress: 30, message: '渲染图表...' });

      // 克隆 SVG 以进行修改
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // 设置尺寸
      const svgWidth = width || svgElement.viewBox.baseVal.width || svgElement.clientWidth || 800;
      const svgHeight = height || svgElement.viewBox.baseVal.height || svgElement.clientHeight || 600;

      clonedSvg.setAttribute('width', String(svgWidth));
      clonedSvg.setAttribute('height', String(svgHeight));

      // 添加背景色
      if (backgroundColor && format === 'jpeg') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', backgroundColor);
        clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      }

      // 序列化 SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      checkCancelled();

      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          try {
            checkCancelled();

            updateProgress({ status: 'generating', progress: 60, message: '生成图片...' });

            const canvas = document.createElement('canvas');
            canvas.width = svgWidth * scale;
            canvas.height = svgHeight * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // 填充背景
            if (backgroundColor) {
              ctx.fillStyle = backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // 绘制图片
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(url);

            // 转换为 Data URL
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

  // 导出图表为图片
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
          message: '准备导出...',
          startTime: Date.now(),
        });

        // 查找 SVG 元素
        const svgElement = chartRef.current.querySelector('svg');
        if (!svgElement) {
          throw new Error('No SVG element found in chart');
        }

        const config: ExportConfig = {
          format,
          filename: options.filename || defaultFilename,
          scale: options.scale || defaultScale,
          quality: options.quality || defaultQuality,
          backgroundColor: options.backgroundColor || '#ffffff',
          width: options.width,
          height: options.height,
          includeLegend: options.includeLegend ?? true,
          includeTitle: options.includeTitle ?? true,
          title: options.title,
        };

        const dataUrl = await svgToImage(svgElement, format, config);

        checkCancelled();

        updateProgress({ status: 'downloading', progress: 80, message: '下载文件...' });

        // 下载文件
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${config.filename}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        updateProgress({ status: 'completed', progress: 100, message: '导出完成' });
        onExportComplete?.(dataUrl);

        return dataUrl;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Export failed', err);
        updateProgress({ status: 'error', progress: 0, message: '导出失败', error: err });
        onExportError?.(err);
        return null;
      }
    },
    [defaultFilename, defaultScale, defaultQuality, onExportStart, onExportComplete, onExportError, svgToImage, checkCancelled, updateProgress]
  );

  // 导出图表（通用方法）
  const exportChart = useCallback(
    async (chartRef: React.RefObject<HTMLElement>, config: Partial<ExportConfig> = {}): Promise<string | null> => {
      const format = config.format || 'png';

      if (format === 'csv' || format === 'json' || format === 'xlsx') {
        logger.error(`Use exportData for ${format} format`);
        return null;
      }

      return exportToImage(chartRef, format as 'png' | 'jpeg' | 'svg', config);
    },
    [exportToImage]
  );

  // 转换为 CSV
  const convertToCSV = useCallback((data: unknown[], columns?: DataExportConfig['columns']): string => {
    if (data.length === 0) return '';

    const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0] as object);
    const headers = columns ? columns.map((c) => c.header) : keys;

    const csvRows: string[] = [];

    // 添加标题行
    csvRows.push(headers.join(','));

    // 添加数据行
    for (const row of data) {
      const values = keys.map((key) => {
        const column = columns?.find((c) => c.key === key);
        let value: unknown;

        if (column?.formatter) {
          value = column.formatter((row as Record<string, unknown>)[key]);
        } else {
          value = (row as Record<string, unknown>)[key];
        }

        // 处理特殊字符
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });

      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }, []);

  // 导出为 CSV
  const exportToCSV = useCallback(
    async (data: unknown[], filename?: string, columns?: DataExportConfig['columns']): Promise<string | null> => {
      abortControllerRef.current = new AbortController();
      isCancelledRef.current = false;

      try {
        onExportStart?.();
        updateProgress({
          status: 'preparing',
          progress: 20,
          message: '准备 CSV 数据...',
          startTime: Date.now(),
        });

        checkCancelled();

        updateProgress({ status: 'generating', progress: 50, message: '生成 CSV...' });

        const csv = convertToCSV(data, columns);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        checkCancelled();

        updateProgress({ status: 'downloading', progress: 80, message: '下载文件...' });

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename || defaultFilename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        updateProgress({ status: 'completed', progress: 100, message: '导出完成' });
        onExportComplete?.(url);

        return url;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('CSV export failed', err);
        updateProgress({ status: 'error', progress: 0, message: '导出失败', error: err });
        onExportError?.(err);
        return null;
      }
    },
    [defaultFilename, onExportStart, onExportComplete, onExportError, convertToCSV, checkCancelled, updateProgress]
  );

  // 导出为 JSON
  const exportToJSON = useCallback(
    async (data: unknown[], filename?: string): Promise<string | null> => {
      abortControllerRef.current = new AbortController();
      isCancelledRef.current = false;

      try {
        onExportStart?.();
        updateProgress({
          status: 'preparing',
          progress: 20,
          message: '准备 JSON 数据...',
          startTime: Date.now(),
        });

        checkCancelled();

        updateProgress({ status: 'generating', progress: 50, message: '生成 JSON...' });

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        checkCancelled();

        updateProgress({ status: 'downloading', progress: 80, message: '下载文件...' });

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename || defaultFilename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        updateProgress({ status: 'completed', progress: 100, message: '导出完成' });
        onExportComplete?.(url);

        return url;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('JSON export failed', err);
        updateProgress({ status: 'error', progress: 0, message: '导出失败', error: err });
        onExportError?.(err);
        return null;
      }
    },
    [defaultFilename, onExportStart, onExportComplete, onExportError, checkCancelled, updateProgress]
  );

  // 导出数据（通用方法）
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

  // 取消导出
  const cancelExport = useCallback(() => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    updateProgress({ status: 'idle', progress: 0, message: '已取消' });
    logger.info('Export cancelled');
  }, [updateProgress]);

  // 重置导出状态
  const resetExport = useCallback(() => {
    isCancelledRef.current = false;
    abortControllerRef.current = null;
    setProgress({
      status: 'idle',
      progress: 0,
      message: '准备导出...',
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
    [isExporting, progress, exportChart, exportData, exportToImage, exportToCSV, exportToJSON, cancelExport, resetExport]
  );
}

// 批量导出 Hook
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
 * 批量图表导出 Hook
 */
export function useBatchChartExport(options: UseBatchChartExportOptions = {}): UseBatchChartExportReturn {
  const { onBatchStart, onBatchComplete, onBatchError } = options;

  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState<Array<{ id: string; success: boolean; url?: string; error?: Error }>>([]);

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
              // 导出图表
              const chartExport = useChartExport();
              url = await chartExport.exportChart(item.chartRef, item.config as ExportConfig);
            } else if (item.data) {
              // 导出数据
              const chartExport = useChartExport();
              url = await chartExport.exportData({ ...item.config, data: item.data } as DataExportConfig);
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
