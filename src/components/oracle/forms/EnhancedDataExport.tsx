'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Settings,
  Clock,
  Check,
  ChevronDown,
  X,
  Eye,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('EnhancedDataExport');

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportField {
  key: string;
  label: string;
  selected: boolean;
}

export interface ExportableData {
  [key: string]: string | number | boolean | null | undefined | string[];
}

interface ExportHistoryItem {
  id: string;
  filename: string;
  format: ExportFormat;
  timestamp: Date;
  recordCount: number;
}

interface ScheduledExport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: ExportFormat;
  fields: string[];
  nextRun: Date;
}

interface EnhancedDataExportProps {
  data: ExportableData[];
  filename: string;
  supportedFormats?: ExportFormat[];
  fields?: ExportField[];
  onExport?: (format: ExportFormat, selectedFields: string[]) => void;
}

const STORAGE_KEY_HISTORY = 'api3_export_history';
const STORAGE_KEY_SCHEDULED = 'api3_scheduled_exports';

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

function escapeCSVValue(value: string | number | boolean | null | undefined | string[]): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    const stringValue = value.join(';');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function convertToCSV(data: ExportableData[], fields: string[]): string {
  if (!data || data.length === 0) return '';
  const headerLine = fields.join(',');
  const rows = data.map((row) => fields.map((key) => escapeCSVValue(row[key])).join(','));
  return [headerLine, ...rows].join('\n');
}

function convertToJSON(data: ExportableData[], fields: string[]): string {
  const filtered = data.map((row) => {
    const obj: Record<string, unknown> = {};
    fields.forEach((key) => {
      obj[key] = row[key];
    });
    return obj;
  });
  return JSON.stringify(filtered, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  csv: <FileText className="w-5 h-5" />,
  json: <FileJson className="w-5 h-5" />,
  xlsx: <FileSpreadsheet className="w-5 h-5" />,
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  json: 'JSON',
  xlsx: 'Excel',
};

export function EnhancedDataExport({
  data,
  filename,
  supportedFormats = ['csv', 'json'],
  fields,
  onExport,
}: EnhancedDataExportProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(supportedFormats[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFields, setExportFields] = useState<ExportField[]>(
    fields ||
      (data.length > 0
        ? Object.keys(data[0]).map((key) => ({ key, label: key, selected: true }))
        : [])
  );
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [scheduledExports, setScheduledExports] = useState<ScheduledExport[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        setExportHistory(
          parsed.map((h: ExportHistoryItem) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }))
        );
      } catch (error) {
        logger.error(
          'Failed to parse export history',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    const storedScheduled = localStorage.getItem(STORAGE_KEY_SCHEDULED);
    if (storedScheduled) {
      try {
        const parsed = JSON.parse(storedScheduled);
        setScheduledExports(
          parsed.map((s: ScheduledExport) => ({
            ...s,
            nextRun: new Date(s.nextRun),
          }))
        );
      } catch (error) {
        logger.error(
          'Failed to parse scheduled exports',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPreview(false);
        setShowHistory(false);
        setShowSchedule(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleField = useCallback((key: string) => {
    setExportFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f))
    );
  }, []);

  const selectAllFields = useCallback(() => {
    setExportFields((prev) => prev.map((f) => ({ ...f, selected: true })));
  }, []);

  const deselectAllFields = useCallback(() => {
    setExportFields((prev) => prev.map((f) => ({ ...f, selected: false })));
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting || !data || data.length === 0) return;

    const selectedFields = exportFields.filter((f) => f.selected).map((f) => f.key);
    if (selectedFields.length === 0) return;

    setIsExporting(true);

    try {
      const timestamp = formatDateTime(new Date());
      const fullFilename = `${filename}_${timestamp}.${selectedFormat}`;

      if (selectedFormat === 'csv') {
        const csvContent = convertToCSV(data, selectedFields);
        downloadFile(csvContent, fullFilename, 'text/csv;charset=utf-8;');
      } else if (selectedFormat === 'json') {
        const jsonContent = convertToJSON(data, selectedFields);
        downloadFile(jsonContent, fullFilename, 'application/json;charset=utf-8;');
      } else if (selectedFormat === 'xlsx') {
        const csvContent = convertToCSV(data, selectedFields);
        downloadFile(csvContent, fullFilename.replace('.xlsx', '.csv'), 'text/csv;charset=utf-8;');
      }

      const historyItem: ExportHistoryItem = {
        id: Date.now().toString(),
        filename: fullFilename,
        format: selectedFormat,
        timestamp: new Date(),
        recordCount: data.length,
      };

      const updatedHistory = [historyItem, ...exportHistory].slice(0, 20);
      setExportHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

      onExport?.(selectedFormat, selectedFields);
      setIsOpen(false);
    } catch (error) {
      logger.error('Export failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsExporting(false);
    }
  }, [data, filename, selectedFormat, exportFields, isExporting, exportHistory, onExport]);

  const previewData = data.slice(0, 5);
  const selectedFields = exportFields.filter((f) => f.selected);
  const hasData = data && data.length > 0;
  const hasSelectedFields = selectedFields.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        disabled={!hasData}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        {t('api3.export.title') || 'Export'}
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg border border-gray-200 shadow-xl z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('api3.export.title') || 'Export Data'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.length.toLocaleString()} {t('api3.export.records') || 'records'}
            </p>
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                {t('api3.export.format') || 'Format'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {supportedFormats.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                      selectedFormat === format
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {FORMAT_ICONS[format]}
                    <span className="text-xs font-medium">{FORMAT_LABELS[format]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">
                  {t('api3.export.fields') || 'Fields'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllFields}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {t('api3.export.selectAll') || 'Select All'}
                  </button>
                  <button
                    onClick={deselectAllFields}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t('api3.export.deselectAll') || 'Deselect All'}
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {exportFields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <Checkbox checked={field.selected} onChange={() => toggleField(field.key)} />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-1" />
                {t('api3.export.preview') || 'Preview'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock className="w-4 h-4 mr-1" />
                {t('api3.export.history') || 'History'}
              </Button>
            </div>

            {showPreview && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-700">
                    {t('api3.export.previewTitle') || 'Preview (first 5 rows)'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {selectedFields.map((field) => (
                          <th
                            key={field.key}
                            className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                          >
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {selectedFields.map((field) => (
                            <td
                              key={field.key}
                              className="px-3 py-2 text-gray-700 whitespace-nowrap"
                            >
                              {String(row[field.key] ?? '-').slice(0, 30)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showHistory && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-700">
                    {t('api3.export.historyTitle') || 'Export History'}
                  </span>
                </div>
                {exportHistory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    {t('api3.export.noHistory') || 'No export history'}
                  </div>
                ) : (
                  <div className="max-h-32 overflow-y-auto">
                    {exportHistory.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <div className="text-xs font-medium text-gray-700 truncate max-w-[180px]">
                            {item.filename}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {item.timestamp.toLocaleString()} · {item.recordCount} records
                          </div>
                        </div>
                        <Badge variant="secondary" size="sm">
                          {item.format.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showSchedule && (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-700">
                    {t('api3.export.scheduledExports') || 'Scheduled Exports'}
                  </span>
                  <Button variant="secondary" size="sm">
                    <Settings className="w-3 h-3 mr-1" />
                    {t('api3.export.addSchedule') || 'Add'}
                  </Button>
                </div>
                {scheduledExports.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-2">
                    {t('api3.export.noScheduled') || 'No scheduled exports'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scheduledExports.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                      >
                        <div>
                          <div className="font-medium text-gray-700">{schedule.name}</div>
                          <div className="text-gray-500">
                            {schedule.frequency} · Next: {schedule.nextRun.toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary" size="sm">
                          {schedule.format.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <Button
              className="w-full"
              onClick={handleExport}
              disabled={isExporting || !hasSelectedFields}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('api3.export.exporting') || 'Exporting...'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t('api3.export.download') || 'Download'} {FORMAT_LABELS[selectedFormat]}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
