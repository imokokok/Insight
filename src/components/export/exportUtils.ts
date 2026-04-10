/**
 * 统一导出工具函数
 *
 * 提供 CSV、JSON、Excel、PDF 导出功能
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
 * 生成唯一 ID
 */
export function generateId(): string {
  return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成文件名
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
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取格式化的字段标签
 */
export function getFieldLabel(field: ExportField, locale: string = 'en'): string {
  return locale === 'zh-CN' ? field.labelZh : field.label;
}

/**
 * 过滤已选字段
 */
export function getSelectedFields(fields: ExportField[]): ExportField[] {
  return fields.filter((f) => f.selected);
}

/**
 * 导出为 CSV
 */
export function exportToCSV(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource,
  locale: string = 'en'
): { content: string; fileName: string; mimeType: string } {
  const selectedFields = getSelectedFields(config.fields);
  const lines: string[] = [];

  // 添加元数据
  if (config.includeMetadata) {
    lines.push(`# Data Source: ${dataSource}`);
    lines.push(`# Export Time: ${new Date().toISOString()}`);
    lines.push(`# Record Count: ${data.length}`);
    lines.push('');
  }

  // 添加表头
  const headers = selectedFields.map((f) => getFieldLabel(f, locale));
  lines.push(headers.join(','));

  // 添加数据行
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
 * 导出为 JSON
 */
export function exportToJSON(
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
 * 导出为 Excel (使用 CSV 格式作为基础，实际项目中可以使用 xlsx 库)
 */
export function exportToExcel(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource,
  locale: string = 'en'
): { content: string; fileName: string; mimeType: string } {
  // Excel 导出使用 CSV 格式，但使用不同的 MIME 类型和扩展名
  // 实际项目中可以使用 xlsx 库生成真正的 Excel 文件
  const result = exportToCSV(data, config, dataSource, locale);
  return {
    content: result.content,
    fileName: generateFileName(dataSource, 'excel', config.fileName),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * 导出为 PDF
 */
export async function exportToPDF(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource,
  locale: string = 'en',
  chartElement?: HTMLElement | null,
  stats?: Record<string, number | string>
): Promise<{ content: Blob; fileName: string; mimeType: string }> {
  const doc = new jsPDF();
  const selectedFields = getSelectedFields(config.fields);
  const isZh = locale === 'zh-CN';

  // 标题
  doc.setFontSize(20);
  doc.setTextColor(exportColors.text.primary);
  doc.text(isZh ? '数据导出报告' : 'Data Export Report', 14, 20);

  // 元数据
  doc.setFontSize(10);
  doc.setTextColor(exportColors.text.secondary);
  doc.text(`${isZh ? '生成时间' : 'Generated'}: ${new Date().toLocaleString(locale)}`, 14, 28);

  let yPos = 40;

  // 添加统计信息
  if (config.includeStats && stats) {
    doc.setFontSize(12);
    doc.setTextColor(exportColors.text.primary);
    doc.text(isZh ? '统计摘要' : 'Statistics Summary', 14, yPos);

    yPos += 8;
    const statsData = Object.entries(stats).map(([key, value]) => [key, String(value)]);

    autoTable(doc, {
      startY: yPos,
      head: [[isZh ? '指标' : 'Metric', isZh ? '数值' : 'Value']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // 添加图表
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
      doc.text(isZh ? '数据图表' : 'Data Chart', 14, yPos);

      doc.addImage(imgData, 'PNG', 14, yPos + 5, imgWidth, imgHeight);
      yPos += imgHeight + 15;
    } catch (error) {
      logger.error('Failed to capture chart', error as Error);
    }
  }

  // 添加数据表格
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(exportColors.text.primary);
  doc.text(isZh ? '数据详情' : 'Data Details', 14, yPos);

  const headers = selectedFields.map((f) => getFieldLabel(f, locale));
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
 * 执行导出
 */
export async function executeExport(
  data: unknown[],
  config: ExportConfig,
  dataSource: ExportDataSource,
  locale: string = 'en',
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
        result = exportToCSV(data, config, dataSource, locale);
        break;
      case 'json':
        result = exportToJSON(data, config, dataSource);
        break;
      case 'excel':
        result = exportToExcel(data, config, dataSource, locale);
        break;
      case 'pdf':
        result = await exportToPDF(data, config, dataSource, locale, chartElement, stats);
        break;
      default:
        throw new Error(`Unsupported export format: ${config.format}`);
    }

    // 创建下载
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

    // 更新历史记录
    historyItem.fileName = result.fileName;
    historyItem.fileSize = blob.size;
    historyItem.completedAt = Date.now();
    historyItem.downloadUrl = url;

    // 保存到历史记录
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
 * 获取嵌套对象值
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
 * 格式化 CSV 值
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
      // 处理包含逗号或引号的字符串
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
  }
}

/**
 * 格式化 PDF 值
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
 * 从 localStorage 加载导出历史
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
 * 保存导出历史到 localStorage
 */
export function saveExportHistory(item: ExportHistoryItem): void {
  if (typeof window === 'undefined') return;

  try {
    const history = loadExportHistory();
    const updated = [item, ...history];

    // 应用设置限制
    const settings = loadExportSettings();
    const maxItems = settings.maxHistoryItems;

    // 清理旧记录
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
 * 清除导出历史
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
 * 删除单个历史记录
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
 * 从 localStorage 加载导出设置
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
 * 保存导出设置到 localStorage
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
 * 重新下载历史记录
 */
export function reDownloadHistoryItem(item: ExportHistoryItem): void {
  // 重新下载功能 - 在实际应用中可能需要重新生成文件
  // 这里仅作为示例，实际实现可能需要存储文件内容或重新生成
  logger.info(`Re-downloading ${item.fileName}`);
}
