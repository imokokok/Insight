'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  exportChart,
  exportMultipleCharts,
  exportToPDF,
  exportToZIP,
  ExportOptions,
  ExportProgress,
  ChartExportData,
  getSupportedExportFormats,
  Resolution,
  RESOLUTION_CONFIG,
  ExportRange,
  ExportSettings,
  PDFExportOptions,
  BatchExportItem,
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
  availableCharts?: Array<{
    id: string;
    name: string;
    chartRef: RefObject<HTMLElement | HTMLDivElement | null>;
    data: ChartExportData[];
  }>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
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
  availableCharts = [],
  dateRange,
  onDateRangeChange,
}: ChartExportButtonProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResolutionPicker, setShowResolutionPicker] = useState(false);
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>('standard');
  const [pendingFormat, setPendingFormat] = useState<ExportOptions['format'] | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const [settings, setSettings] = useState<ExportSettings>({
    range: 'current',
    includeMetadata: true,
    includeWatermark: true,
    filenameTemplate: '{title}_{date}_{time}',
    customFilename: filename,
    dateRange: dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
  });

  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportedFormats = getSupportedExportFormats();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
        setShowBatchSelector(false);
        setShowPreview(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProgress = useCallback((p: ExportProgress) => {
    setProgress(p);
  }, []);

  const generateFilename = useCallback(() => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const title = chartTitle || 'chart';

    return settings.filenameTemplate
      .replace('{title}', title)
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{source}', dataSource || 'unknown');
  }, [settings.filenameTemplate, chartTitle, dataSource]);

  const getFilteredData = useCallback(() => {
    if (settings.range === 'current') {
      return data;
    }
    if (settings.dateRange) {
      return data.filter((item) => {
        const itemDate = item.date ? new Date(item.date as string) : null;
        if (!itemDate) return true;
        return itemDate >= settings.dateRange!.start && itemDate <= settings.dateRange!.end;
      });
    }
    return data;
  }, [data, settings.range, settings.dateRange]);

  const executeExport = useCallback(
    async (format: ExportOptions['format'], resolution: Resolution) => {
      if (progress.status === 'exporting') return;

      setProgress({ status: 'preparing', progress: 0, message: t('priceChart.export.exporting') });
      setShowResolutionPicker(false);
      setShowSettings(false);
      setPendingFormat(null);

      try {
        const exportFilename = settings.customFilename || generateFilename();
        const filteredData = getFilteredData();

        const options: ExportOptions = {
          format,
          filename: exportFilename,
          includeMetadata: settings.includeMetadata,
          resolution,
          chartTitle,
          dataSource,
          showTimestamp: true,
        };

        if (format === 'pdf') {
          const pdfOptions: PDFExportOptions = {
            filename: exportFilename,
            charts: [
              {
                chartRef: chartRef?.current || null,
                data: filteredData,
                title: chartTitle || t('priceChart.export.title'),
              },
            ],
            includeWatermark: settings.includeWatermark,
            includeMetadata: settings.includeMetadata,
            metadata: {
              exportedAt: new Date().toISOString(),
              dataSource,
              timeRange: settings.dateRange
                ? `${settings.dateRange.start.toLocaleDateString()} - ${settings.dateRange.end.toLocaleDateString()}`
                : undefined,
            },
          };
          await exportToPDF(pdfOptions, handleProgress);
        } else if (multipleCharts && multipleCharts.length > 0) {
          const charts = multipleCharts.map((chart) => ({
            chartRef: chart.chartRef.current,
            data: chart.data,
            name: chart.name,
          }));
          await exportMultipleCharts(charts, options, handleProgress);
        } else {
          await exportChart(chartRef?.current || null, filteredData, options, handleProgress);
        }

        onExportComplete?.();

        setTimeout(() => {
          setProgress({ status: 'idle', progress: 0, message: '' });
        }, 2000);
      } catch (error) {
        setProgress({
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : t('priceChart.export.exportFailed'),
        });
        onExportError?.(error instanceof Error ? error : new Error('Export failed'));

        setTimeout(() => {
          setProgress({ status: 'idle', progress: 0, message: '' });
        }, 3000);
      }
    },
    [
      progress.status,
      chartRef,
      data,
      settings,
      multipleCharts,
      handleProgress,
      onExportComplete,
      onExportError,
      chartTitle,
      dataSource,
      generateFilename,
      getFilteredData,
      t,
    ]
  );

  const executeBatchExport = useCallback(async () => {
    if (selectedCharts.size === 0 || progress.status === 'exporting') return;

    setProgress({ status: 'preparing', progress: 0, message: t('priceChart.export.exporting') });
    setShowBatchSelector(false);

    try {
      const exportFilename = settings.customFilename || generateFilename();
      const chartsToExport: BatchExportItem[] = [];

      availableCharts.forEach((chart) => {
        if (selectedCharts.has(chart.id)) {
          chartsToExport.push({
            chartRef: chart.chartRef.current,
            data: chart.data,
            name: chart.name,
            title: chart.name,
          });
        }
      });

      await exportToZIP(
        {
          filename: exportFilename,
          charts: chartsToExport,
          settings: {
            format: 'png',
            resolution: selectedResolution,
            includeMetadata: settings.includeMetadata,
          },
        },
        handleProgress
      );

      onExportComplete?.();

      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0, message: '' });
        setSelectedCharts(new Set());
      }, 2000);
    } catch (error) {
      setProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : t('priceChart.export.exportFailed'),
      });
      onExportError?.(error instanceof Error ? error : new Error('Batch export failed'));

      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0, message: '' });
      }, 3000);
    }
  }, [
    selectedCharts,
    progress.status,
    availableCharts,
    settings,
    selectedResolution,
    handleProgress,
    onExportComplete,
    onExportError,
    generateFilename,
    t,
  ]);

  const handleFormatSelect = useCallback(
    (format: ExportOptions['format']) => {
      if (format === 'png' || format === 'svg') {
        setPendingFormat(format);
        setShowResolutionPicker(true);
        setIsOpen(false);
      } else if (format === 'pdf') {
        setPendingFormat(format);
        setShowSettings(true);
        setIsOpen(false);
      } else {
        executeExport(format, 'standard');
      }
    },
    [executeExport]
  );

  const handleResolutionSelect = useCallback(
    (resolution: Resolution) => {
      setSelectedResolution(resolution);
      if (pendingFormat) {
        executeExport(pendingFormat, resolution);
      }
    },
    [pendingFormat, executeExport]
  );

  const toggleChartSelection = (chartId: string) => {
    const newSelected = new Set(selectedCharts);
    if (newSelected.has(chartId)) {
      newSelected.delete(chartId);
    } else {
      newSelected.add(chartId);
    }
    setSelectedCharts(newSelected);
  };

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

  const renderSettingsPanel = () => (
    <div className="absolute top-full mt-2 right-0 w-96 bg-white   border border-gray-200 py-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="px-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.settings')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.settingsDescription')}</p>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">{t('priceChart.export.range')}</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSettings({ ...settings, range: 'current' })}
            className={`flex-1 px-3 py-2 text-xs  border transition-colors ${
              settings.range === 'current'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('priceChart.export.currentView')}
          </button>
          <button
            onClick={() => setSettings({ ...settings, range: 'all' })}
            className={`flex-1 px-3 py-2 text-xs  border transition-colors ${
              settings.range === 'all'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('priceChart.export.allData')}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">{t('priceChart.export.dateRange')}</label>
        <div className="space-y-2">
          <input
            type="date"
            value={settings.dateRange?.start.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                dateRange: {
                  ...settings.dateRange!,
                  start: new Date(e.target.value),
                },
              })
            }
            className="w-full px-3 py-2 text-xs border border-gray-200  focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={settings.dateRange?.end.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                dateRange: {
                  ...settings.dateRange!,
                  end: new Date(e.target.value),
                },
              })
            }
            className="w-full px-3 py-2 text-xs border border-gray-200  focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">{t('priceChart.export.filenameTemplate')}</label>
        <input
          type="text"
          value={settings.filenameTemplate}
          onChange={(e) => setSettings({ ...settings, filenameTemplate: e.target.value })}
          placeholder="{title}_{date}_{time}"
          className="w-full px-3 py-2 text-xs border border-gray-200  focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {t('priceChart.export.filenameTemplateHint')}
        </p>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">{t('priceChart.export.customFilename')}</label>
        <input
          type="text"
          value={settings.customFilename}
          onChange={(e) => setSettings({ ...settings, customFilename: e.target.value })}
          placeholder={generateFilename()}
          className="w-full px-3 py-2 text-xs border border-gray-200  focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.includeMetadata}
            onChange={(e) => setSettings({ ...settings, includeMetadata: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
          <span className="text-xs text-gray-700">{t('priceChart.export.includeMetadata')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={settings.includeWatermark}
            onChange={(e) => setSettings({ ...settings, includeWatermark: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
          <span className="text-xs text-gray-700">{t('priceChart.export.includeWatermark')}</span>
        </label>
      </div>

      <div className="px-4 pt-3 flex gap-2">
        <button
          onClick={() => setShowSettings(false)}
          className="flex-1 px-4 py-2 text-xs text-gray-600 bg-gray-100  hover:bg-gray-200 transition-colors"
        >
          {t('priceChart.export.cancel')}
        </button>
        <button
          onClick={() => pendingFormat && executeExport(pendingFormat, selectedResolution)}
          className="flex-1 px-4 py-2 text-xs text-white bg-blue-600  hover:bg-blue-700 transition-colors"
        >
          {t('priceChart.export.confirmExport')}
        </button>
      </div>
    </div>
  );

  const renderBatchSelector = () => (
    <div className="absolute top-full mt-2 right-0 w-80 bg-white   border border-gray-200 py-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="px-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.batchExport')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.batchExportDescription')}</p>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">{t('priceChart.export.resolution')}</label>
        <select
          value={selectedResolution}
          onChange={(e) => setSelectedResolution(e.target.value as Resolution)}
          className="w-full px-3 py-2 text-xs border border-gray-200  focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map((res) => (
            <option key={res} value={res}>
              {RESOLUTION_CONFIG[res].label}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 py-3">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.selectCharts')} ({selectedCharts.size} {t('priceChart.export.selected')})
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {availableCharts.map((chart) => (
            <label
              key={chart.id}
              className="flex items-center gap-2 p-2  hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCharts.has(chart.id)}
                onChange={() => toggleChartSelection(chart.id)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <span className="text-xs text-gray-700">{chart.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => {
            setShowBatchSelector(false);
            setSelectedCharts(new Set());
          }}
          className="flex-1 px-4 py-2 text-xs text-gray-600 bg-gray-100  hover:bg-gray-200 transition-colors"
        >
          {t('priceChart.export.cancel')}
        </button>
        <button
          onClick={executeBatchExport}
          disabled={selectedCharts.size === 0 || isExporting}
          className="flex-1 px-4 py-2 text-xs text-white bg-blue-600  hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? t('priceChart.export.exporting') : `${t('priceChart.export.title')} (${selectedCharts.size})`}
        </button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="absolute top-full mt-2 right-0 w-80 bg-white   border border-gray-200 py-4 z-50">
      <div className="px-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.preview')}</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="text-xs">
          <span className="text-gray-500">{t('priceChart.export.filename')}:</span>
          <span className="text-gray-900 ml-2">{generateFilename()}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">{t('priceChart.export.dataRange')}:</span>
          <span className="text-gray-900 ml-2">
            {settings.range === 'current' ? t('priceChart.export.currentView') : t('priceChart.export.allData')}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">{t('priceChart.export.recordCount')}:</span>
          <span className="text-gray-900 ml-2">{getFilteredData().length}</span>
        </div>
        {settings.dateRange && (
          <div className="text-xs">
            <span className="text-gray-500">{t('priceChart.export.dateRange')}:</span>
            <span className="text-gray-900 ml-2">
              {settings.dateRange.start.toLocaleDateString()} -{' '}
              {settings.dateRange.end.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowPreview(false)}
          className="w-full px-4 py-2 text-xs text-gray-600 bg-gray-100  hover:bg-gray-200 transition-colors"
        >
          {t('priceChart.export.close')}
        </button>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isExporting}
          className={`p-2  transition-colors ${
            disabled || isExporting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={t('priceChart.export.exportChart')}
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

        {progress.status !== 'idle' && (
          <div className="absolute top-full mt-2 right-0 w-48 bg-white   border border-gray-200 p-2 z-50">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-gray-200  overflow-hidden">
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
          <div className="absolute top-full mt-2 right-0 w-48 bg-white   border border-gray-200 py-2 z-50">
            <div className="px-3 py-1.5 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-700">{t('priceChart.export.selectResolution')}</span>
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

        {showSettings && renderSettingsPanel()}
        {showBatchSelector && renderBatchSelector()}
        {showPreview && renderPreview()}

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 w-56 bg-white   border border-gray-200 py-1 z-50">
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
            {availableCharts.length > 0 && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    setShowBatchSelector(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('priceChart.export.batchExport')}</span>
                    <span className="text-xs text-gray-400">ZIP</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.batchExportDescription')}</p>
                </button>
              </>
            )}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                setShowSettings(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left transition-colors text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('priceChart.export.settings')}</span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.settingsDescription')}</p>
            </button>
            <button
              onClick={() => {
                setShowPreview(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left transition-colors text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('priceChart.export.preview')}</span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.previewDescription')}</p>
            </button>
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
        className={`flex items-center gap-2 px-4 py-2  text-sm font-medium transition-colors ${
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
            <span>{t('priceChart.export.exporting')}</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{t('priceChart.export.title')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {progress.status !== 'idle' && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white   border border-gray-200 p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {progress.status === 'completed' ? t('priceChart.export.exportComplete') : t('priceChart.export.exporting')}
            </span>
            <span className="text-sm text-gray-500">{progress.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200  overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">{progress.message}</p>
        </div>
      )}

      {showResolutionPicker && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white   border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.selectResolution')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.settingsDescription')}</p>
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
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showSettings && renderSettingsPanel()}
      {showBatchSelector && renderBatchSelector()}
      {showPreview && renderPreview()}

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white   border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.title')}</h3>
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
                    <div className="w-10 h-10  bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">
                        {format.format.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{format.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{format.description}</p>
                    </div>
                  </div>
                  {!isDisabled && (
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}

          {availableCharts.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setShowBatchSelector(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10  bg-purple-100 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{t('priceChart.export.batchExport')}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.batchExportDescription')}</p>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </>
          )}

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => {
              setShowSettings(true);
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10  bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-gray-900">{t('priceChart.export.settings')}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.settingsDescription')}</p>
                </div>
              </div>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => {
              setShowPreview(true);
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10  bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-gray-900">{t('priceChart.export.preview')}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.previewDescription')}</p>
                </div>
              </div>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
