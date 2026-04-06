'use client';

import { type RefObject } from 'react';

import { useTranslations } from '@/i18n';
import { getSupportedExportFormats, type ChartExportData } from '@/lib/utils/chartExport';

import { BatchSelector } from './components/BatchSelector';
import { ExportButton } from './components/ExportButton';
import { ExportPreview } from './components/ExportPreview';
import { ExportSettingsPanel } from './components/ExportSettings';
import { FormatMenu } from './components/FormatMenu';
import { ProgressBar } from './components/ProgressBar';
import { ResolutionPicker } from './components/ResolutionPicker';
import { useExportActions } from './hooks/useExportActions';
import { useExportState } from './hooks/useExportState';

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
  dateRange?: { start: Date; end: Date };
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
  onDateRangeChange: _onDateRangeChange,
}: ChartExportButtonProps) {
  const t = useTranslations();
  const supportedFormats = getSupportedExportFormats();

  const {
    state,
    dropdownRef,
    setIsOpen,
    setShowSettings,
    setShowResolutionPicker,
    setShowBatchSelector,
    setShowPreview,
    setSelectedResolution,
    setPendingFormat,
    setProgress,
    setSettings,
    setSelectedCharts,
  } = useExportState({ filename, dateRange });

  const {
    generateFilename,
    getFilteredData,
    executeExport,
    executeBatchExport,
    handleFormatSelect,
    handleResolutionSelect,
    toggleChartSelection,
    getProgressColor,
    isExporting,
  } = useExportActions({
    chartRef,
    data,
    multipleCharts,
    chartTitle,
    dataSource,
    availableCharts,
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
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <ExportButton
        isExporting={isExporting}
        disabled={disabled}
        isOpen={state.isOpen}
        onClick={() => setIsOpen(!state.isOpen)}
        compact={compact}
      />

      <ProgressBar
        progress={state.progress.progress}
        status={state.progress.status}
        messageKey={state.progress.messageKey}
        messageParams={state.progress.messageParams}
        getProgressColor={getProgressColor}
        compact={compact}
      />

      {state.showResolutionPicker && (
        <ResolutionPicker
          selectedResolution={state.selectedResolution}
          onSelect={handleResolutionSelect}
          compact={compact}
        />
      )}

      {state.showSettings && (
        <ExportSettingsPanel
          settings={state.settings}
          pendingFormat={state.pendingFormat}
          selectedResolution={state.selectedResolution}
          onSettingsChange={setSettings}
          onExport={executeExport}
          onClose={() => setShowSettings(false)}
          generateFilename={generateFilename}
        />
      )}

      {state.showBatchSelector && (
        <BatchSelector
          availableCharts={availableCharts}
          selectedCharts={state.selectedCharts}
          selectedResolution={state.selectedResolution}
          isExporting={isExporting}
          onToggleChart={toggleChartSelection}
          onResolutionChange={setSelectedResolution}
          onExport={executeBatchExport}
          onCancel={() => {
            setShowBatchSelector(false);
            setSelectedCharts(new Set());
          }}
        />
      )}

      {state.showPreview && (
        <ExportPreview
          settings={state.settings}
          generateFilename={generateFilename}
          getFilteredData={getFilteredData}
          onClose={() => setShowPreview(false)}
        />
      )}

      {state.isOpen && (
        <FormatMenu
          supportedFormats={supportedFormats}
          hasChartRef={!!chartRef?.current}
          hasMultipleCharts={!!multipleCharts && multipleCharts.length > 0}
          hasAvailableCharts={availableCharts.length > 0}
          onFormatSelect={handleFormatSelect}
          onBatchExport={() => {
            setShowBatchSelector(true);
            setIsOpen(false);
          }}
          onOpenSettings={() => {
            setShowSettings(true);
            setIsOpen(false);
          }}
          onOpenPreview={() => {
            setShowPreview(true);
            setIsOpen(false);
          }}
          compact={compact}
        />
      )}
    </div>
  );
}
