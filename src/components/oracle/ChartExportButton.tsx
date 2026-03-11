'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import {
  exportChart,
  exportMultipleCharts,
  ExportOptions,
  ExportProgress,
  ChartExportData,
  getSupportedExportFormats,
  Resolution,
  RESOLUTION_CONFIG,
} from '@/utils/chartExport';

interface ChartExportButtonProps {
  chartRef?: RefObject<HTMLElement | HTMLDivElement | null>;
  data: ChartExportData[];
  filename?: string;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  disabled?: boolean;
  compact?: boolean;
  multipleCharts?: Array<{
    chartRef: RefObject<HTMLElement | HTMLDivElement | null>;
    data: ChartExportData[];
    name: string;
  }>;
  chartTitle?: string;
  dataSource?: string;
}

export function ChartExportButton({
  chartRef,
  data,
  filename = 'chart-export',
  onExportComplete,
  onExportError,
  disabled = false,
  compact = false,
  multipleCharts,
  chartTitle,
  dataSource,
}: ChartExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResolutionPicker, setShowResolutionPicker] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>('standard');
  const [pendingFormat, setPendingFormat] = useState<ExportOptions['format'] | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportedFormats = getSupportedExportFormats();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProgress = useCallback((p: ExportProgress) => {
    setProgress(p);
  }, []);

  const handleFormatSelect = useCallback(
    (format: ExportOptions['format']) => {
      if (format === 'png' || format === 'svg') {
        setPendingFormat(format);
        setShowResolutionPicker(true);
        setIsOpen(false);
      } else {
        executeExport(format, 'standard');
      }
    },
    []
  );

  const executeExport = useCallback(
    async (format: ExportOptions['format'], resolution: Resolution) => {
      if (progress.status === 'exporting') return;

      setProgress({ status: 'preparing', progress: 0, message: '准备导出...' });
      setShowResolutionPicker(false);
      setPendingFormat(null);

      try {
        const options: ExportOptions = {
          format,
          filename,
          includeMetadata: true,
          resolution,
          chartTitle,
          dataSource,
          showTimestamp: true,
        };

        if (multipleCharts && multipleCharts.length > 0) {
          const charts = multipleCharts.map((chart) => ({
            chartRef: chart.chartRef.current,
            data: chart.data,
            name: chart.name,
          }));
          await exportMultipleCharts(charts, options, handleProgress);
        } else {
          await exportChart(chartRef?.current || null, data, options, handleProgress);
        }

        onExportComplete?.();

        setTimeout(() => {
          setProgress({ status: 'idle', progress: 0, message: '' });
        }, 2000);
      } catch (error) {
        setProgress({
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '导出失败',
        });
        onExportError?.(error instanceof Error ? error : new Error('Export failed'));

        setTimeout(() => {
          setProgress({ status: 'idle', progress: 0, message: '' });
        }, 3000);
      }
    },
    [progress.status, chartRef, data, filename, multipleCharts, handleProgress, onExportComplete, onExportError, chartTitle, dataSource]
  );

  const handleResolutionSelect = useCallback(
    (resolution: Resolution) => {
      if (pendingFormat) {
        executeExport(pendingFormat, resolution);
      }
    },
    [pendingFormat, executeExport]
  );

  const getProgressColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const isExporting = progress.status === 'preparing' || progress.status === 'exporting';

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isExporting}
          className={`p-2 rounded-lg transition-colors ${
            disabled || isExporting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="导出图表"
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
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
        </button>

        {progress.status !== 'idle' && (
          <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor()} transition-all duration-300`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{progress.progress}%</span>
            </div>
            <p className="text-xs text-gray-600 truncate">{progress.message}</p>
          </div>
        )}

        {showResolutionPicker && (
          <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-3 py-1.5 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">选择分辨率</span>
            </div>
            {(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map((res) => (
              <button
                key={res}
                onClick={() => handleResolutionSelect(res)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  selectedResolution === res
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {RESOLUTION_CONFIG[res].label}
              </button>
            ))}
          </div>
        )}

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {supportedFormats.map((format) => {
              const isDisabled = format.requiresChartRef && !chartRef?.current && !multipleCharts;

              return (
                <button
                  key={format.format}
                  onClick={() => handleFormatSelect(format.format)}
                  disabled={isDisabled}
                  className={`w-full px-4 py-2.5 text-left transition-colors ${
                    isDisabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{format.label}</span>
                    <span className="text-xs text-gray-400">{format.format.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{format.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          disabled || isExporting
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
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
            <span>导出中...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>导出</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {progress.status !== 'idle' && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {progress.status === 'completed' ? '导出完成' : '正在导出'}
            </span>
            <span className="text-sm text-gray-500">{progress.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">{progress.message}</p>
        </div>
      )}

      {showResolutionPicker && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">选择分辨率</h3>
            <p className="text-xs text-gray-500 mt-0.5">选择导出图片的分辨率</p>
          </div>
          <div className="py-1">
            {(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map((res) => (
              <button
                key={res}
                onClick={() => handleResolutionSelect(res)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedResolution === res
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{RESOLUTION_CONFIG[res].label}</span>
                  {selectedResolution === res && (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">选择导出格式</h3>
          </div>
          {supportedFormats.map((format) => {
            const isDisabled = format.requiresChartRef && !chartRef?.current && !multipleCharts;

            return (
              <button
                key={format.format}
                onClick={() => handleFormatSelect(format.format)}
                disabled={isDisabled}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  isDisabled
                    ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">{format.format.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{format.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{format.description}</p>
                    </div>
                  </div>
                  {!isDisabled && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
