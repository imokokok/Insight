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

    const progressInterval = setInterval(() => {
      setExportProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      const exportConfig: ExportConfig = {
        ...config,
        fields: selectedFields,
      };

      const historyItem = await executeExport(data, exportConfig, dataSource, chartElement, stats);

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
    } finally {
      clearInterval(progressInterval);
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
        className="flex items-center gap-2 border border-transparent px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:border-slate-900/15 hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="absolute right-0 top-full z-50 mt-1 w-64 border border-slate-900/20 bg-[#f8f7f4]"
          >
            <div className="p-2">
              <p className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-blue-700">
                Select Format
              </p>
              {EXPORT_FORMAT_CONFIGS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => {
                    handleFormatChange(format.value);
                    setShowConfig(true);
                  }}
                  className="flex w-full items-center gap-3 border-t border-slate-900/10 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700">
                    {formatIcons[format.value]}
                  </span>
                  <span>{format.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowHistory(true)}
              className="flex w-full items-center gap-3 border-t border-slate-900/15 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-white"
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
            className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] border border-slate-900/20 bg-[#f8f7f4]"
          >
            <div className="flex items-center justify-between border-b border-slate-900/15 px-4 py-3">
              <div className="flex items-center gap-2">
                {formatIcons[config.format]}
                <span className="font-medium text-gray-900">
                  {EXPORT_FORMAT_CONFIGS.find((f) => f.value === config.format)?.label} Export
                </span>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="flex h-8 w-8 items-center justify-center border border-slate-900/15 text-slate-500 transition-colors hover:border-blue-600 hover:text-blue-700"
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

              <div className="max-h-48 overflow-y-auto border-y border-slate-900/15">
                {config.fields.map((field) => (
                  <label
                    key={field.key}
                    className="flex cursor-pointer items-center gap-2 border-b border-slate-900/10 px-2 py-2 last:border-b-0 hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={field.selected}
                      onChange={() => toggleField(field.key)}
                      className="border-gray-300 text-primary-600 focus:ring-blue-600"
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
                    className="border-gray-300 text-primary-600 focus:ring-blue-600"
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
                        className="border-gray-300 text-primary-600 focus:ring-blue-600"
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
                        className="border-gray-300 text-primary-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-gray-700">Include Statistics</span>
                    </label>
                  </>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 border-y border-slate-900/15 bg-white/55">
                <div className="border-r border-slate-900/15 p-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Records
                  </p>
                  <p className="font-mono text-lg font-semibold text-slate-900">{data.length}</p>
                </div>
                <div className="p-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Fields
                  </p>
                  <p className="font-mono text-lg font-semibold text-slate-900">
                    {selectedFieldsCount}
                  </p>
                </div>
              </div>
            </div>

            {isExporting && (
              <div className="px-4 pb-2">
                <div className="h-1 overflow-hidden bg-slate-200">
                  <motion.div
                    className="h-full bg-primary-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${exportProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">{exportProgress}%</p>
              </div>
            )}

            <div className="flex gap-2 border-t border-slate-900/15 p-4">
              <button
                onClick={() => setShowConfig(false)}
                disabled={isExporting}
                className="flex-1 border border-slate-900/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedFieldsCount === 0}
                className="flex flex-1 items-center justify-center gap-2 border border-primary-600 bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
