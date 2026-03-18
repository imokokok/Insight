/**
 * 统一导出模块
 *
 * 提供统一的数据导出功能，支持 CSV、JSON、Excel、PDF 格式
 */

// 类型定义
export type {
  ExportFormat,
  ExportStatus,
  ExportDataSource,
  ExportField,
  ExportConfig,
  ExportHistoryItem,
  ExportProgress,
  ExportOptions,
  UnifiedExportProps,
  ExportHistoryProps,
  ExportFormatConfig,
  ExportSettings,
} from './types';

// 常量
export {
  EXPORT_FORMAT_CONFIGS,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_HISTORY_STORAGE_KEY,
  EXPORT_SETTINGS_STORAGE_KEY,
} from './types';

// 工具函数
export {
  generateId,
  generateFileName,
  formatFileSize,
  getFieldLabel,
  getSelectedFields,
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPDF,
  executeExport,
  loadExportHistory,
  saveExportHistory,
  clearExportHistory,
  removeExportHistoryItem,
  loadExportSettings,
  saveExportSettings,
  reDownloadHistoryItem,
} from './exportUtils';

// Hook
export { useExportHistory } from './useExportHistory';
export type { UseExportHistoryReturn } from './useExportHistory';

// 组件
export { UnifiedExport } from './UnifiedExport';
export { ExportHistoryPanel } from './ExportHistoryPanel';
