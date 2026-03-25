'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DataExportButton');

export type ExportFormat = 'csv' | 'json';

export interface ExportColumn {
  key: string;
  label: string;
}

export type ExportDataRow = Record<string, string | number | boolean | null | undefined | string[]>;

interface DataExportButtonProps {
  data: ExportDataRow[];
  filename: string;
  columns?: ExportColumn[];
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function escapeCSVValue(value: string | number | boolean | null | undefined | string[]): string {
  if (value === null || value === undefined) {
    return '';
  }
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

function convertToCSV(data: ExportDataRow[], columns?: ExportColumn[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const keys = columns ? columns.map((col) => col.key) : Object.keys(data[0]);
  const headers = columns ? columns.map((col) => col.label) : keys;

  const headerLine = headers.map(escapeCSVValue).join(',');

  const rows = data.map((row) => {
    return keys
      .map((key) => {
        const value = row[key];
        return escapeCSVValue(value);
      })
      .join(',');
  });

  return [headerLine, ...rows].join('\n');
}

function convertToJSON(data: ExportDataRow[]): string {
  return JSON.stringify(data, null, 2);
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

export function DataExportButton({
  data,
  filename,
  columns,
  className = '',
  disabled = false,
  compact = false,
}: DataExportButtonProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exportTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (exportTimerRef.current) {
        clearTimeout(exportTimerRef.current);
      }
    };
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (isExporting || !data || data.length === 0) return;

      setIsExporting(true);
      setIsOpen(false);

      try {
        const timestamp = formatDateTime(new Date());
        const fullFilename = `${filename}_${timestamp}.${format}`;

        if (format === 'csv') {
          const csvContent = convertToCSV(data, columns);
          downloadFile(csvContent, fullFilename, 'text/csv;charset=utf-8;');
        } else if (format === 'json') {
          const jsonContent = convertToJSON(data);
          downloadFile(jsonContent, fullFilename, 'application/json;charset=utf-8;');
        }
      } catch (error) {
        logger.error('Export failed', error instanceof Error ? error : new Error(String(error)));
      } finally {
        exportTimerRef.current = setTimeout(() => {
          setIsExporting(false);
        }, 500);
      }
    },
    [data, filename, columns, isExporting]
  );

  const hasData = data && data.length > 0;

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isExporting || !hasData}
          className={`p-2  transition-colors ${
            disabled || isExporting || !hasData
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={hasData ? t('forms.exportData') : t('forms.noDataToExport')}
        >
          {isExporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
        </button>

        {isOpen && hasData && (
          <div className="absolute right-0 top-full mt-2 w-40 bg-white   border border-gray-200 py-1 z-50">
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              JSON
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || !hasData}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium  transition-colors ${
          disabled || isExporting || !hasData
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        {isExporting ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{t('forms.exporting')}</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>{t('forms.export')}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && hasData && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white   border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('forms.selectExportFormat')}</h3>
          </div>
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10  bg-success-100 flex items-center justify-center">
              <span className="text-xs font-bold text-success-600">CSV</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('forms.csvFile')}</span>
              <p className="text-xs text-gray-500">{t('forms.csvFormat')}</p>
            </div>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10  bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-600">JSON</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('forms.jsonFile')}</span>
              <p className="text-xs text-gray-500">{t('forms.jsonFormat')}</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
