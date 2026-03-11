'use client';

import { useState, useCallback, ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/context';

export type ExportFormat = 'csv' | 'json' | 'png';

export interface ExportOption {
  format: ExportFormat;
  label: string;
  icon?: ReactNode;
}

interface DataExportButtonProps {
  onExport: (format: ExportFormat) => void;
  options?: ExportOption[];
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function DataExportButton({
  onExport,
  options,
  className = '',
  disabled = false,
  loading = false,
}: DataExportButtonProps) {
  const { t } = useI18n();
  const [showDropdown, setShowDropdown] = useState(false);

  const defaultOptions: ExportOption[] = [
    {
      format: 'csv',
      label: '导出 CSV',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      format: 'json',
      label: '导出 JSON',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
    {
      format: 'png',
      label: '导出图片',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  const exportOptions = options || defaultOptions;

  const handleExport = useCallback(
    (format: ExportFormat) => {
      onExport(format);
      setShowDropdown(false);
    },
    [onExport]
  );

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
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
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        )}
        <span>导出</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {exportOptions.map((option) => (
              <button
                key={option.format}
                onClick={() => handleExport(option.format)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  title?: string;
  options?: ExportOption[];
}

export function ExportModal({
  isOpen,
  onClose,
  onExport,
  title = '导出数据',
  options,
}: ExportModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  const defaultOptions: ExportOption[] = [
    { format: 'csv', label: 'CSV 文件' },
    { format: 'json', label: 'JSON 文件' },
    { format: 'png', label: 'PNG 图片' },
  ];

  const exportOptions = options || defaultOptions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {exportOptions.map((option) => (
            <button
              key={option.format}
              onClick={() => {
                onExport(option.format);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
