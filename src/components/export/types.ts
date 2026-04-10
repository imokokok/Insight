/**
 * 统一导出功能类型定义
 *
 * 提供数据导出相关的类型定义，支持 CSV、JSON、Excel、PDF 格式
 */

/**
 * 导出格式类型
 */
export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';

/**
 * 导出状态
 */
export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'completed' | 'error';

/**
 * 数据源类型
 */
export type ExportDataSource = 'price-query' | 'cross-oracle' | 'oracle-detail' | 'custom';

/**
 * 导出字段定义
 */
export interface ExportField {
  key: string;
  label: string;
  labelZh: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  selected: boolean;
}

/**
 * 导出配置
 */
export interface ExportConfig {
  format: ExportFormat;
  fields: ExportField[];
  includeMetadata: boolean;
  includeTimestamp: boolean;
  fileName?: string;
  timeRange?: {
    start: number | null;
    end: number | null;
  };
  includeChart?: boolean;
  includeStats?: boolean;
}

/**
 * 导出历史记录
 */
export interface ExportHistoryItem {
  id: string;
  fileName: string;
  format: ExportFormat;
  dataSource: ExportDataSource;
  recordCount: number;
  fileSize: number;
  status: 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  downloadUrl?: string;
}

/**
 * 导出进度
 */
export interface ExportProgress {
  status: ExportStatus;
  progress: number; // 0-100
  currentStep: string;
  currentStepZh: string;
  recordCount: number;
  processedCount: number;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  data: unknown[];
  config: ExportConfig;
  dataSource: ExportDataSource;
  chartElement?: HTMLElement | null;
  stats?: Record<string, number | string>;
}

/**
 * 统一导出组件属性
 */
export interface UnifiedExportProps {
  data: unknown[];
  dataSource: ExportDataSource;
  fields: ExportField[];
  chartElement?: HTMLElement | null;
  stats?: Record<string, number | string>;
  disabled?: boolean;
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (historyItem: ExportHistoryItem) => void;
  onExportError?: (error: Error) => void;
}

/**
 * 导出历史组件属性
 */
export interface ExportHistoryProps {
  maxItems?: number;
  onReDownload?: (historyItem: ExportHistoryItem) => void;
  onClearHistory?: () => void;
  onRemoveItem?: (id: string) => void;
}

/**
 * 导出格式配置
 */
export interface ExportFormatConfig {
  value: ExportFormat;
  label: string;
  labelZh: string;
  icon: string;
  mimeType: string;
  extension: string;
}

/**
 * 默认导出格式配置
 */
export const EXPORT_FORMAT_CONFIGS: ExportFormatConfig[] = [
  {
    value: 'csv',
    label: 'CSV',
    labelZh: 'CSV',
    icon: 'table',
    mimeType: 'text/csv;charset=utf-8;',
    extension: 'csv',
  },
  {
    value: 'json',
    label: 'JSON',
    labelZh: 'JSON',
    icon: 'file-json',
    mimeType: 'application/json',
    extension: 'json',
  },
  {
    value: 'excel',
    label: 'Excel',
    labelZh: 'Excel',
    icon: 'file-spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
  {
    value: 'pdf',
    label: 'PDF',
    labelZh: 'PDF',
    icon: 'file-text',
    mimeType: 'application/pdf',
    extension: 'pdf',
  },
];

/**
 * 默认导出配置
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'csv',
  fields: [],
  includeMetadata: true,
  includeTimestamp: true,
  timeRange: {
    start: null,
    end: null,
  },
  includeChart: false,
  includeStats: false,
};

/**
 * localStorage 键名
 */
export const EXPORT_HISTORY_STORAGE_KEY = 'oracle_export_history_v2';
export const EXPORT_SETTINGS_STORAGE_KEY = 'oracle_export_settings_v2';

/**
 * 导出设置
 */
export interface ExportSettings {
  maxHistoryItems: number;
  autoCleanup: boolean;
  cleanupAfterDays: number;
  defaultFormat: ExportFormat;
}

/**
 * 默认导出设置
 */
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  maxHistoryItems: 50,
  autoCleanup: true,
  cleanupAfterDays: 30,
  defaultFormat: 'csv',
};
