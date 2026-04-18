/**
 * Unified Export Feature Type Definitions
 *
 * Provides type definitions for data export functionality, supporting CSV, JSON, Excel, PDF formats
 */

/**
 * Export format type
 */
export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';

/**
 * Export status
 */
export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'completed' | 'error';

/**
 * Data source type
 */
export type ExportDataSource = 'price-query' | 'cross-oracle' | 'oracle-detail' | 'custom';

/**
 * Export field definition
 */
export interface ExportField {
  key: string;
  label: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  selected: boolean;
}

/**
 * Export configuration
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
 * Export history item
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
 * Export progress
 */
export interface ExportProgress {
  status: ExportStatus;
  progress: number; // 0-100
  currentStep: string;
  recordCount: number;
  processedCount: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  data: unknown[];
  config: ExportConfig;
  dataSource: ExportDataSource;
  chartElement?: HTMLElement | null;
  stats?: Record<string, number | string>;
}

/**
 * Unified export component props
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
 * Export history component props
 */
export interface ExportHistoryProps {
  maxItems?: number;
  onReDownload?: (historyItem: ExportHistoryItem) => void;
  onClearHistory?: () => void;
  onRemoveItem?: (id: string) => void;
}

/**
 * Export format configuration
 */
export interface ExportFormatConfig {
  value: ExportFormat;
  label: string;
  icon: string;
  mimeType: string;
  extension: string;
}

/**
 * Default export format configurations
 */
export const EXPORT_FORMAT_CONFIGS: ExportFormatConfig[] = [
  {
    value: 'csv',
    label: 'CSV',
    icon: 'table',
    mimeType: 'text/csv;charset=utf-8;',
    extension: 'csv',
  },
  {
    value: 'json',
    label: 'JSON',
    icon: 'file-json',
    mimeType: 'application/json',
    extension: 'json',
  },
  {
    value: 'excel',
    label: 'Excel',
    icon: 'file-spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
  {
    value: 'pdf',
    label: 'PDF',
    icon: 'file-text',
    mimeType: 'application/pdf',
    extension: 'pdf',
  },
];

/**
 * Default export configuration
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
 * localStorage keys
 */
export const EXPORT_HISTORY_STORAGE_KEY = 'oracle_export_history_v2';
export const EXPORT_SETTINGS_STORAGE_KEY = 'oracle_export_settings_v2';

/**
 * Export settings
 */
export interface ExportSettings {
  maxHistoryItems: number;
  autoCleanup: boolean;
  cleanupAfterDays: number;
  defaultFormat: ExportFormat;
}

/**
 * Default export settings
 */
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  maxHistoryItems: 50,
  autoCleanup: true,
  cleanupAfterDays: 30,
  defaultFormat: 'csv',
};
