'use client';

/**
 * 统一导出组件
 *
 * 提供统一的导出按钮样式和位置（页面右上角），支持导出格式选择（CSV、JSON、Excel、PDF），添加导出进度指示
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { motion, AnimatePresence } from 'framer-motion';
import {
  UnifiedExportProps,
  ExportConfig,
  ExportFormat,
  EXPORT_FORMAT_CONFIGS,
  DEFAULT_EXPORT_CONFIG,
} from './types';
import { executeExport } from './exportUtils';
import { useExportHistory } from './useExportHistory';
import { ExportHistoryPanel } from './ExportHistoryPanel';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UnifiedExport');

// 格式图标映射
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
  const t = useTranslations('unifiedExport');
  const locale = useLocale();
  const isZh = locale === 'zh-CN';

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

  // 切换格式
  const handleFormatChange = useCallback((format: ExportFormat) => {
    setConfig((prev) => ({ ...prev, format }));
  }, []);

  // 切换字段选择
  const toggleField = useCallback((key: string) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f)),
    }));
  }, []);

  // 全选/取消全选
  const toggleAllFields = useCallback((selected: boolean) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => ({ ...f, selected })),
    }));
  }, []);

  // 执行导出
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
      // 模拟进度
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const exportConfig: ExportConfig = {
        ...config,
        fields: selectedFields,
      };

      const historyItem = await executeExport(
        data,
        exportConfig,
        dataSource,
        locale,
        chartElement,
        stats
      );

      clearInterval(progressInterval);
      setExportProgress(100);

      addHistoryItem(historyItem);
      onExportComplete?.(historyItem);

      // 延迟关闭配置面板
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
    locale,
    chartElement,
    stats,
    isExporting,
    onExportStart,
    onExportComplete,
    onExportError,
    addHistoryItem,
  ]);

  // 获取已选字段数量
  const selectedFieldsCount = config.fields.filter((f) => f.selected).length;
  const totalFieldsCount = config.fields.length;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 主按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{isExporting ? t('exporting') : t('export')}</span>
        {!isExporting && <ChevronDown className="w-4 h-4" />}
      </button>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && !showConfig && !showHistory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-lg z-50"
          >
            {/* 格式选项 */}
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1">{t('selectFormat')}</p>
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
                  <span>{isZh ? format.labelZh : format.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100" />

            {/* 历史记录入口 */}
            <button
              onClick={() => setShowHistory(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <History className="w-4 h-4 text-gray-400" />
              <span>{t('history')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 配置面板 */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 shadow-xl z-50"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {formatIcons[config.format]}
                <span className="font-medium text-gray-900">
                  {isZh
                    ? EXPORT_FORMAT_CONFIGS.find((f) => f.value === config.format)?.labelZh
                    : EXPORT_FORMAT_CONFIGS.find((f) => f.value === config.format)?.label}
                  {t('exportConfig')}
                </span>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 字段选择 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {t('selectFields')} ({selectedFieldsCount}/{totalFieldsCount})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAllFields(true)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {t('selectAll')}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => toggleAllFields(false)}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    {t('deselectAll')}
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 p-2">
                {config.fields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={field.selected}
                      onChange={() => toggleField(field.key)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      {isZh ? field.labelZh : field.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* 选项 */}
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
                  <span className="text-sm text-gray-700">{t('includeMetadata')}</span>
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
                      <span className="text-sm text-gray-700">{t('includeChart')}</span>
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
                      <span className="text-sm text-gray-700">{t('includeStats')}</span>
                    </label>
                  </>
                )}
              </div>

              {/* 数据预览 */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">{t('dataPreview')}</p>
                <p className="text-sm text-gray-700">
                  {t('recordCount')}: <span className="font-medium">{data.length}</span>
                </p>
                <p className="text-sm text-gray-700">
                  {t('selectedFields')}: <span className="font-medium">{selectedFieldsCount}</span>
                </p>
              </div>
            </div>

            {/* 进度条 */}
            {isExporting && (
              <div className="px-4 pb-2">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
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

            {/* 操作按钮 */}
            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowConfig(false)}
                disabled={isExporting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedFieldsCount === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('exporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('export')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 历史记录面板 */}
      <AnimatePresence>
        {showHistory && (
          <ExportHistoryPanel onClose={() => setShowHistory(false)} dataSource={dataSource} />
        )}
      </AnimatePresence>

      {/* 点击外部关闭 */}
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
