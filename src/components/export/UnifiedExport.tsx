'use client';

import { useState, useRef, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Table,
  ChevronDown,
  X,
  Loader2,
  History,
} from 'lucide-react';

import { createLogger } from '@/lib/utils/logger';

import { ExportHistoryPanel } from './ExportHistoryPanel';
import { executeExport } from './exportUtils';
import {
  type UnifiedExportProps,
  type ExportConfig,
  type ExportFormat,
  EXPORT_FORMAT_CONFIGS,
  DEFAULT_EXPORT_CONFIG,
} from './types';
import { useExportHistory } from './useExportHistory';

const logger = createLogger('UnifiedExport');

const formatIcons: Record<string, React.ReactNode> = {
  csv: <Table className="w-4 h-4" />,
  json: <FileJson className="w-4 h-4" />,
  excel: <FileSpreadsheet className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
};

export function UnifiedExport({
  data,
  dataSource,
  fields,
  chartElement,
  stats,
  disabled = false,
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
}: UnifiedExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [config, setConfig] = useState<ExportConfig>({
    ...DEFAULT_EXPORT_CONFIG,
    fields: fields.map((f) => ({ ...f, selected: true })),
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addHistoryItem } = useExportHistory();

  const handleFormatChange = useCallback((format: ExportFormat) => {
    setConfig((prev) => ({ ...prev, format }));
  }, []);

  const toggleField = useCallback((key: string) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f)),
    }));
  }, []);

  const toggleAllFields = useCallback((selected: boolean) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => ({ ...f, selected })),
    }));
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    const selectedFields = config.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) {
      logger.warn('No fields selected for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    onExportStart?.();

    try {
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const exportConfig: ExportConfig = {
        ...config,
        fields: selectedFields,
      };

      const historyItem = await executeExport(data, exportConfig, dataSource, chartElement, stats);

      clearInterval(progressInterval);
      setExportProgress(100);

      addHistoryItem(historyItem);
      onExportComplete?.(historyItem);

      setTimeout(() => {
        setShowConfig(false);
        setIsOpen(false);
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    } catch (error) {
      logger.error('Export failed', error as Error);
      onExportError?.(error as Error);
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [
    config,
    data,
    dataSource,
    chartElement,
    stats,
    isExporting,
    onExportStart,
    onExportComplete,
    onExportError,
    addHistoryItem,
  ]);

  const selectedFieldsCount = config.fields.filter((f) => f.selected).length;
  const totalFieldsCount = config.fields.length;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        {!isExporting && <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isOpen && !showConfig && !showHistory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          >
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1">Select Format</p>
              {EXPORT_FORMAT_CONFIGS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => {
                    handleFormatChange(format.value);
                    setShowConfig(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400">{formatIcons[format.value]}</span>
                  <span>{format.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100" />

            <button
              onClick={() => setShowHistory(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <History className="w-4 h-4 text-gray-400" />
              <span>History</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {formatIcons[config.format]}
                <span className="font-medium text-gray-900">
                  {EXPORT_FORMAT_CONFIGS.find((f) => f.value === config.format)?.label} Export
                </span>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Select Fields ({selectedFieldsCount}/{totalFieldsCount})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAllFields(true)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => toggleAllFields(false)}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2">
                {config.fields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={field.selected}
                      onChange={() => toggleField(field.key)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeMetadata}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, includeMetadata: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-gray-700">Include Metadata</span>
                </label>

                {config.format === 'pdf' && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.includeChart}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, includeChart: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-gray-700">Include Chart</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.includeStats}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, includeStats: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-gray-700">Include Statistics</span>
                    </label>
                  </>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Data Preview</p>
                <p className="text-sm text-gray-700">
                  Records: <span className="font-medium">{data.length}</span>
                </p>
                <p className="text-sm text-gray-700">
                  Selected Fields: <span className="font-medium">{selectedFieldsCount}</span>
                </p>
              </div>
            </div>

            {isExporting && (
              <div className="px-4 pb-2">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${exportProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">{exportProgress}%</p>
              </div>
            )}

            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowConfig(false)}
                disabled={isExporting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedFieldsCount === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <ExportHistoryPanel onClose={() => setShowHistory(false)} dataSource={dataSource} />
        )}
      </AnimatePresence>

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowConfig(false);
            setShowHistory(false);
          }}
        />
      )}
    </div>
  );
}
