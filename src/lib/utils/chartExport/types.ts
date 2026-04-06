/**
 * @fileoverview 图表导出相关类型定义
 * @description 定义导出选项、设置、进度等类型
 */

export interface ExportOptions {
  format: 'csv' | 'json' | 'png' | 'svg' | 'excel' | 'pdf';
  filename?: string;
  includeMetadata?: boolean;
  resolution?: Resolution;
  chartTitle?: string;
  dataSource?: string;
  showTimestamp?: boolean;
}

export type Resolution = 'standard' | 'high' | 'ultra';
export type ExportRange = 'current' | 'all';

export interface ExportSettings {
  range: ExportRange;
  includeMetadata: boolean;
  includeWatermark: boolean;
  filenameTemplate: string;
  customFilename: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface PDFExportOptions {
  filename: string;
  charts: Array<{
    chartRef: HTMLElement | null;
    data: ChartExportData[];
    title: string;
  }>;
  includeWatermark?: boolean;
  includeMetadata?: boolean;
  metadata?: ExportMetadata;
}

export interface BatchExportItem {
  chartRef: HTMLElement | null;
  data: ChartExportData[];
  name: string;
  title: string;
}

export interface ZIPExportOptions {
  filename: string;
  charts: BatchExportItem[];
  settings: {
    format: 'png' | 'svg' | 'pdf' | 'csv' | 'json';
    resolution: Resolution;
    includeMetadata: boolean;
  };
}

export const RESOLUTION_CONFIG: Record<
  Resolution,
  { scale: number; labelKey: string; dpi: number }
> = {
  standard: { scale: 2, labelKey: 'export.resolution.standard', dpi: 144 },
  high: { scale: 4, labelKey: 'export.resolution.high', dpi: 288 },
  ultra: { scale: 6, labelKey: 'export.resolution.ultra', dpi: 432 },
};

export interface ChartExportData {
  [key: string]: string | number | undefined;
}

export interface ExportMetadata {
  exportedAt: string;
  dataSource?: string;
  timeRange?: string;
  totalRecords?: number;
  [key: string]: string | number | undefined;
}

export interface ExportProgress {
  status: 'idle' | 'preparing' | 'exporting' | 'completed' | 'error';
  progress: number;
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;
