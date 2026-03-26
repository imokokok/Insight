'use client';

import { useState, useMemo } from 'react';

import { useTranslations } from '@/i18n';
import { type OracleProvider, type Blockchain } from '@/lib/oracles';

import { type QueryResult } from '../constants';

import { Icons } from './Icons';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportField {
  key: string;
  label: string;
  enabled: boolean;
}

export interface ExportConfigData {
  format: ExportFormat;
  fields: ExportField[];
  timeRange: {
    start: number | null;
    end: number | null;
  };
  includeChart: boolean;
  includeStats: boolean;
}

interface ExportConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfigData) => void;
  queryResults: QueryResult[];
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  selectedChains: Blockchain[];
  selectedTimeRange: number;
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_FIELDS: ExportField[] = [
  { key: 'oracle', label: 'oracle', enabled: true },
  { key: 'blockchain', label: 'blockchain', enabled: true },
  { key: 'price', label: 'price', enabled: true },
  { key: 'timestamp', label: 'timestamp', enabled: true },
  { key: 'change24h', label: 'change24h', enabled: true },
  { key: 'confidence', label: 'confidence', enabled: true },
  { key: 'source', label: 'source', enabled: false },
];

export function ExportConfig({
  isOpen,
  onClose,
  onExport,
  queryResults,
  selectedSymbol,
  selectedOracles,
  selectedChains,
  selectedTimeRange,
}: ExportConfigProps) {
  const t = useTranslations();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [fields, setFields] = useState<ExportField[]>(DEFAULT_FIELDS);
  const [includeChart, setIncludeChart] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [timeRangeStart, setTimeRangeStart] = useState<string>('');
  const [timeRangeEnd, setTimeRangeEnd] = useState<string>('');

  const toggleField = (key: string) => {
    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, enabled: !field.enabled } : field))
    );
  };

  const enabledFieldsCount = useMemo(() => fields.filter((f) => f.enabled).length, [fields]);

  const estimatedRecords = useMemo(() => {
    return queryResults.length;
  }, [queryResults]);

  const estimatedFileSize = useMemo(() => {
    const baseSize = 1024;
    const recordSize = enabledFieldsCount * 50;
    const totalSize = baseSize + estimatedRecords * recordSize;

    if (format === 'pdf') {
      return totalSize * 3 + (includeChart ? 500 * 1024 : 0);
    } else if (format === 'json') {
      return totalSize * 1.5;
    }
    return totalSize;
  }, [enabledFieldsCount, estimatedRecords, format, includeChart]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleExport = () => {
    const config: ExportConfigData = {
      format,
      fields: fields.filter((f) => f.enabled),
      timeRange: {
        start: timeRangeStart ? new Date(timeRangeStart).getTime() : null,
        end: timeRangeEnd ? new Date(timeRangeEnd).getTime() : null,
      },
      includeChart,
      includeStats,
    };
    onExport(config);
    onClose();
  };

  const handleSelectAllFields = () => {
    setFields((prev) => prev.map((f) => ({ ...f, enabled: true })));
  };

  const handleDeselectAllFields = () => {
    setFields((prev) => prev.map((f) => ({ ...f, enabled: false })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border border-gray-200">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icons.download />
            {t('exportConfig.title') || '数据导出配置'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
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

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {t('exportConfig.format') || '导出格式'}
            </h3>
            <div className="flex gap-3">
              {(['csv', 'json', 'pdf'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 text-sm font-medium border transition-colors ${
                    format === f
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {t('exportConfig.fields') || '导出字段'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllFields}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  {t('exportConfig.selectAll') || '全选'}
                </button>
                <button
                  onClick={handleDeselectAllFields}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  {t('exportConfig.deselectAll') || '取消全选'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fields.map((field) => (
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => toggleField(field.key)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t(`priceQuery.export.${field.label}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {t('exportConfig.timeRange') || '时间范围（可选）'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t('exportConfig.startTime') || '开始时间'}
                </label>
                <input
                  type="datetime-local"
                  value={timeRangeStart}
                  onChange={(e) => setTimeRangeStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-primary-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t('exportConfig.endTime') || '结束时间'}
                </label>
                <input
                  type="datetime-local"
                  value={timeRangeEnd}
                  onChange={(e) => setTimeRangeEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-primary-600"
                />
              </div>
            </div>
          </div>

          {format === 'pdf' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t('exportConfig.pdfOptions') || 'PDF 选项'}
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeChart}
                    onChange={(e) => setIncludeChart(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t('exportConfig.includeChart') || '包含价格图表'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStats}
                    onChange={(e) => setIncludeStats(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t('exportConfig.includeStats') || '包含统计摘要'}
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {t('exportConfig.preview') || '导出预览'}
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>{t('exportConfig.symbol') || '查询币种:'}</span>
                <span className="font-medium">{selectedSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exportConfig.oracleCount') || '预言机数量:'}</span>
                <span className="font-medium">{selectedOracles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exportConfig.chainCount') || '区块链数量:'}</span>
                <span className="font-medium">{selectedChains.length}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exportConfig.timeRangeLabel') || '时间范围:'}</span>
                <span className="font-medium">{selectedTimeRange}h</span>
              </div>
              <div className="flex justify-between">
                <span>{t('exportConfig.estimatedRecords') || '预计记录数:'}</span>
                <span className="font-medium">
                  {estimatedRecords} {t('exportConfig.records') || '条'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('exportConfig.fieldCount') || '导出字段数:'}</span>
                <span className="font-medium">
                  {enabledFieldsCount} {t('exportConfig.fields') || '个'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                <span>{t('exportConfig.estimatedSize') || '预计文件大小:'}</span>
                <span className="font-medium text-gray-900">
                  {formatFileSize(estimatedFileSize)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {t('actions.cancel') || '取消'}
          </button>
          <button
            onClick={handleExport}
            disabled={enabledFieldsCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('exportConfig.export') || '导出'} {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
