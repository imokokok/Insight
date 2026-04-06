'use client';

import { useCallback, type RefObject } from 'react';

import { useTranslations } from '@/i18n';
import {
  exportChart,
  exportMultipleCharts,
  exportToPDF,
  exportToZIP,
  type ExportOptions,
  type ExportProgress,
  type ChartExportData,
  type Resolution,
  type ExportSettings,
  type PDFExportOptions,
  type BatchExportItem,
} from '@/lib/utils/chartExport';

import { type ExportState } from './useExportState';

export interface UseExportActionsProps {
  chartRef?: RefObject<HTMLElement | HTMLDivElement | null>;
  data: ChartExportData[];
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
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
  state: ExportState;
  setProgress: (progress: ExportProgress) => void;
  setSettings: (settings: ExportSettings) => void;
  setSelectedCharts: (charts: Set<string>) => void;
  setSelectedResolution: (resolution: Resolution) => void;
  setPendingFormat: (format: ExportOptions['format'] | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowResolutionPicker: (show: boolean) => void;
  setShowBatchSelector: (show: boolean) => void;
}

export interface UseExportActionsReturn {
  handleProgress: (progress: ExportProgress) => void;
  generateFilename: () => string;
  getFilteredData: () => ChartExportData[];
  executeExport: (format: ExportOptions['format'], resolution: Resolution) => Promise<void>;
  executeBatchExport: () => Promise<void>;
  handleFormatSelect: (format: ExportOptions['format']) => void;
  handleResolutionSelect: (resolution: Resolution) => void;
  toggleChartSelection: (chartId: string) => void;
  getProgressColor: () => string;
  isExporting: boolean;
}

export function useExportActions({
  chartRef,
  data,
  multipleCharts,
  chartTitle,
  dataSource,
  availableCharts = [],
  onExportComplete,
  onExportError,
  state,
  setProgress,
  setSettings,
  setSelectedCharts,
  setSelectedResolution,
  setPendingFormat,
  setShowSettings,
  setShowResolutionPicker,
  setShowBatchSelector,
}: UseExportActionsProps): UseExportActionsReturn {
  const t = useTranslations();

  const handleProgress = useCallback(
    (p: ExportProgress) => {
      setProgress(p);
    },
    [setProgress]
  );

  const generateFilename = useCallback(() => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const title = chartTitle || 'chart';

    return state.settings.filenameTemplate
      .replace('{title}', title)
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{source}', dataSource || 'unknown');
  }, [state.settings.filenameTemplate, chartTitle, dataSource]);

  const getFilteredData = useCallback(() => {
    if (state.settings.range === 'current') {
      return data;
    }
    if (state.settings.dateRange) {
      return data.filter((item) => {
        const itemDate = item.date ? new Date(item.date as string) : null;
        if (!itemDate) return true;
        return (
          itemDate >= state.settings.dateRange!.start && itemDate <= state.settings.dateRange!.end
        );
      });
    }
    return data;
  }, [data, state.settings.range, state.settings.dateRange]);

  const executeExport = useCallback(
    async (format: ExportOptions['format'], resolution: Resolution) => {
      if (state.progress.status === 'exporting') return;

      setProgress({ status: 'preparing', progress: 0, messageKey: 'priceChart.export.exporting' });
      setShowResolutionPicker(false);
      setShowSettings(false);
      setPendingFormat(null);

      try {
        const exportFilename = state.settings.customFilename || generateFilename();
        const filteredData = getFilteredData();

        const options: ExportOptions = {
          format,
          filename: exportFilename,
          includeMetadata: state.settings.includeMetadata,
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
            includeWatermark: state.settings.includeWatermark,
            includeMetadata: state.settings.includeMetadata,
            metadata: {
              exportedAt: new Date().toISOString(),
              dataSource,
              timeRange: state.settings.dateRange
                ? `${state.settings.dateRange.start.toLocaleDateString()} - ${state.settings.dateRange.end.toLocaleDateString()}`
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
          setProgress({ status: 'idle', progress: 0, messageKey: '' });
        }, 2000);
      } catch (error) {
        setProgress({
          status: 'error',
          progress: 0,
          messageKey: 'priceChart.export.exportFailed',
        });
        onExportError?.(error instanceof Error ? error : new Error('Export failed'));

        setTimeout(() => {
          setProgress({ status: 'idle', progress: 0, messageKey: '' });
        }, 3000);
      }
    },
    [
      state.progress.status,
      state.settings,
      chartRef,
      data,
      multipleCharts,
      handleProgress,
      onExportComplete,
      onExportError,
      chartTitle,
      dataSource,
      generateFilename,
      getFilteredData,
      t,
      setProgress,
      setShowResolutionPicker,
      setShowSettings,
      setPendingFormat,
    ]
  );

  const executeBatchExport = useCallback(async () => {
    if (state.selectedCharts.size === 0 || state.progress.status === 'exporting') return;

    setProgress({ status: 'preparing', progress: 0, messageKey: 'priceChart.export.exporting' });
    setShowBatchSelector(false);

    try {
      const exportFilename = state.settings.customFilename || generateFilename();
      const chartsToExport: BatchExportItem[] = [];

      availableCharts.forEach((chart) => {
        if (state.selectedCharts.has(chart.id)) {
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
            resolution: state.selectedResolution,
            includeMetadata: state.settings.includeMetadata,
          },
        },
        handleProgress
      );

      onExportComplete?.();

      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0, messageKey: '' });
        setSelectedCharts(new Set());
      }, 2000);
    } catch (error) {
      setProgress({
        status: 'error',
        progress: 0,
        messageKey: 'priceChart.export.exportFailed',
      });
      onExportError?.(error instanceof Error ? error : new Error('Batch export failed'));

      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0, messageKey: '' });
      }, 3000);
    }
  }, [
    state.selectedCharts,
    state.progress.status,
    state.settings,
    state.selectedResolution,
    availableCharts,
    handleProgress,
    onExportComplete,
    onExportError,
    generateFilename,
    setProgress,
    setShowBatchSelector,
    setSelectedCharts,
  ]);

  const handleFormatSelect = useCallback(
    (format: ExportOptions['format']) => {
      if (format === 'png' || format === 'svg') {
        setPendingFormat(format);
        setShowResolutionPicker(true);
      } else if (format === 'pdf') {
        setPendingFormat(format);
        setShowSettings(true);
      } else {
        executeExport(format, 'standard');
      }
    },
    [executeExport, setPendingFormat, setShowResolutionPicker, setShowSettings]
  );

  const handleResolutionSelect = useCallback(
    (resolution: Resolution) => {
      setSelectedResolution(resolution);
      if (state.pendingFormat) {
        executeExport(state.pendingFormat, resolution);
      }
    },
    [state.pendingFormat, executeExport, setSelectedResolution]
  );

  const toggleChartSelection = useCallback(
    (chartId: string) => {
      const newSelected = new Set(state.selectedCharts);
      if (newSelected.has(chartId)) {
        newSelected.delete(chartId);
      } else {
        newSelected.add(chartId);
      }
      setSelectedCharts(newSelected);
    },
    [state.selectedCharts, setSelectedCharts]
  );

  const getProgressColor = useCallback(() => {
    switch (state.progress.status) {
      case 'completed':
        return 'bg-success-500';
      case 'error':
        return 'bg-danger-500';
      default:
        return 'bg-primary-500';
    }
  }, [state.progress.status]);

  const isExporting =
    state.progress.status === 'preparing' || state.progress.status === 'exporting';

  return {
    handleProgress,
    generateFilename,
    getFilteredData,
    executeExport,
    executeBatchExport,
    handleFormatSelect,
    handleResolutionSelect,
    toggleChartSelection,
    getProgressColor,
    isExporting,
  };
}
