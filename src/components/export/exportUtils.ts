/**
 * Unified Export Utility Functions
 *
 * Provides CSV, JSON, Excel, PDF export functionality
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { exportColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

import {
  type ExportConfig,
  type ExportFormat,
  type ExportDataSource,
  type ExportHistoryItem,
  type ExportField,
  type ExportSettings,
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_HISTORY_STORAGE_KEY,
  EXPORT_SETTINGS_STORAGE_KEY,
} from './types';

const logger = createLogger('UnifiedExport');

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate file name
 */
export function generateFileName(
  dataSource: ExportDataSource,
  format: ExportFormat,
  customName?: string
): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const sourceMap: Record<ExportDataSource, string> = {
    'price-query': 'price-query',
    'cross-oracle': 'cross-oracle',
    'oracle-detail': 'oracle-detail',
    custom: 'custom',
  };

  const baseName = customName || sourceMap[dataSource] || 'export';
  const extension = format === 'excel' ? 'xlsx' : format;
  return `${baseName}-${timestamp}.${extension}`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get formatted field label
 */
export function getFieldLabel(field: ExportField): string {
  return field.label;
}

/**
 * Filter selected fields
 */
export function getSelectedFields(fields: ExportField[]): ExportField[] {
  return fields.filter((f) => f.selected);
}

/**
 * Export to CSV
 */
function exportToCSV(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource
): { content: string; fileName: string; mimeType: string } {
  const selectedFields = getSelectedFields(config.fields);
  const lines: string[] = [];

  // Add metadata
  if (config.includeMetadata) {
    lines.push(`# Data Source: ${dataSource}`);
    lines.push(`# Export Time: ${new Date().toISOString()}`);
    lines.push(`# Record Count: ${data.length}`);
    lines.push('');
  }

  // Add headers
  const headers = selectedFields.map((f) => getFieldLabel(f));
  lines.push(headers.join(','));

  // Add data rows
  data.forEach((item) => {
    const row = selectedFields.map((field) => {
      const value = getNestedValue(item, field.key);
      return formatCSVValue(value, field.dataType);
    });
    lines.push(row.join(','));
  });

  return {
    content: '\ufeff' + lines.join('\n'),
    fileName: generateFileName(dataSource, 'csv', config.fileName),
    mimeType: 'text/csv;charset=utf-8;',
  };
}

/**
 * Export to JSON
 */
function exportToJSON(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource
): { content: string; fileName: string; mimeType: string } {
  const selectedFields = getSelectedFields(config.fields);

  const exportData: Record<string, unknown> = {
    metadata: config.includeMetadata
      ? {
          dataSource,
          exportTime: new Date().toISOString(),
          recordCount: data.length,
          exportedFields: selectedFields.map((f) => f.key),
        }
      : undefined,
    data: data.map((item) => {
      const row: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        row[field.key] = getNestedValue(item, field.key);
      });
      return row;
    }),
  };

  return {
    content: JSON.stringify(exportData, null, 2),
    fileName: generateFileName(dataSource, 'json', config.fileName),
    mimeType: 'application/json',
  };
}

/**
 * Export to Excel (uses CSV format as base, actual projects can use xlsx library)
 */
export function exportToExcel(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource
): { content: string; fileName: string; mimeType: string } {
  // Excel export uses CSV format but with different MIME type and extension
  // Actual projects can use xlsx library to generate real Excel files
  const result = exportToCSV(data, config, dataSource);
  return {
    content: result.content,
    fileName: generateFileName(dataSource, 'excel', config.fileName),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * Export to PDF
 */
export async function exportToPDF(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource,
  chartElement?: HTMLElement | null,
  stats?: Record<string, number | string>
): Promise<{ content: Blob; fileName: string; mimeType: string }> {
  const doc = new jsPDF();
  const selectedFields = getSelectedFields(config.fields);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(exportColors.text.primary);
  doc.text('Data Export Report', 14, 20);

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(exportColors.text.secondary);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  let yPos = 40;

  // Add statistics
  if (config.includeStats && stats) {
    doc.setFontSize(12);
    doc.setTextColor(exportColors.text.primary);
    doc.text('Statistics Summary', 14, yPos);

    yPos += 8;
    const statsData = Object.entries(stats).map(([key, value]) => [key, String(value)]);

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Add chart
  if (config.includeChart && chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (yPos + imgHeight > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(exportColors.text.primary);
      doc.text('Data Chart', 14, yPos);

      doc.addImage(imgData, 'PNG', 14, yPos + 5, imgWidth, imgHeight);
      yPos += imgHeight + 15;
    } catch (error) {
      logger.error('Failed to capture chart', error as Error);
    }
  }

  // Add data table
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(exportColors.text.primary);
  doc.text('Data Details', 14, yPos);

  const headers = selectedFields.map((f) => getFieldLabel(f));
  const body = data.map((item) =>
    selectedFields.map((field) => {
      const value = getNestedValue(item, field.key);
      return formatPDFValue(value, field.dataType);
    })
  );

  autoTable(doc, {
    startY: yPos + 5,
    head: [headers],
    body,
    theme: 'striped',
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    pageBreak: 'auto',
  });

  const blob = doc.output('blob');
  return {
    content: blob,
    fileName: generateFileName(dataSource, 'pdf', config.fileName),
    mimeType: 'application/pdf',
  };
}

/**
 * Execute export
 */
export async function executeExport(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource,
  chartElement?: HTMLElement | null,
  stats?: Record<string, number | string>
): Promise<ExportHistoryItem> {
  const startTime = Date.now();
  const historyItem: ExportHistoryItem = {
    id: generateId(),
    fileName: '',
    format: config.format,
    dataSource,
    recordCount: data.length,
    fileSize: 0,
    status: 'completed',
    createdAt: startTime,
  };

  try {
    let result: { content: string | Blob; fileName: string; mimeType: string };

    switch (config.format) {
      case 'csv':
        result = exportToCSV(data, config, dataSource);
        break;
      case 'json':
        result = exportToJSON(data, config, dataSource);
        break;
      case 'excel':
        result = exportToExcel(data, config, dataSource);
        break;
      case 'pdf':
        result = await exportToPDF(data, config, dataSource, chartElement, stats);
        break;
      default:
        throw new Error(`Unsupported export format: ${config.format}`);
    }

    // Create download
    const blob =
      typeof result.content === 'string'
        ? new Blob([result.content], { type: result.mimeType })
        : result.content;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Update history
    historyItem.fileName = result.fileName;
    historyItem.fileSize = blob.size;
    historyItem.completedAt = Date.now();
    historyItem.downloadUrl = url;

    // Save to history
    saveExportHistory(historyItem);

    return historyItem;
  } catch (error) {
    historyItem.status = 'failed';
    historyItem.errorMessage = error instanceof Error ? error.message : String(error);
    saveExportHistory(historyItem);
    throw error;
  }
}

/**
 * Get nested object value
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return '';

  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return '';
    value = (value as Record<string, unknown>)[key];
  }

  return value ?? '';
}

/**
 * Format CSV value
 */
function formatCSVValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return '';

  switch (dataType) {
    case 'date':
      return value instanceof Date ? value.toISOString() : String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return String(value);
    default:
      // Handle strings containing commas or quotes
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
  }
}

/**
 * Format PDF value
 */
function formatPDFValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return '-';

  switch (dataType) {
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      return String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      if (typeof value === 'number') {
        return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
      }
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Load export history from localStorage
 */
export function loadExportHistory(): ExportHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(EXPORT_HISTORY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load export history', error as Error);
  }
  return [];
}

/**
 * Save export history to localStorage
 */
function saveExportHistory(item: ExportHistoryItem): void {
  if (typeof window === 'undefined') return;

  try {
    const history = loadExportHistory();
    const updated = [item, ...history];

    // Apply settings limit
    const settings = loadExportSettings();
    const maxItems = settings.maxHistoryItems;

    // Clean up old records
    let filtered = updated.slice(0, maxItems);
    if (settings.autoCleanup) {
      const cutoffTime = Date.now() - settings.cleanupAfterDays * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((h) => h.createdAt > cutoffTime);
    }

    localStorage.setItem(EXPORT_HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('Failed to save export history', error as Error);
  }
}

/**
 * Clear export history
 */
export function clearExportHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(EXPORT_HISTORY_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear export history', error as Error);
  }
}

/**
 * Remove single history item
 */
export function removeExportHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const history = loadExportHistory();
    const filtered = history.filter((h) => h.id !== id);
    localStorage.setItem(EXPORT_HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('Failed to remove export history item', error as Error);
  }
}

/**
 * Load export settings from localStorage
 */
export function loadExportSettings(): ExportSettings {
  if (typeof window === 'undefined') return DEFAULT_EXPORT_SETTINGS;

  try {
    const stored = localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_EXPORT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    logger.error('Failed to load export settings', error as Error);
  }
  return DEFAULT_EXPORT_SETTINGS;
}

/**
 * Save export settings to localStorage
 */
export function saveExportSettings(settings: Partial<ExportSettings>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = loadExportSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to save export settings', error as Error);
  }
}

/**
 * Re-download history item
 */
function reDownloadHistoryItem(item: ExportHistoryItem): void {
  // Re-download functionality - in actual apps may need to regenerate file
  // This is just an example, actual implementation may need to store file content or regenerate
  logger.info(`Re-downloading ${item.fileName}`);
}
