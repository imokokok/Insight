'use client';

import { useState } from 'react';
import { ExportConfig as ExportConfigType } from '../types';
import { useI18n } from '@/lib/i18n/provider';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Calendar,
  Filter,
  Check,
} from 'lucide-react';

interface ExportConfigProps {
  config: ExportConfigType;
  onUpdate?: (config: ExportConfigType) => void;
  onExport?: () => void;
  loading?: boolean;
}

export default function ExportConfig({
  config,
  onUpdate,
  onExport,
  loading = false,
}: ExportConfigProps) {
  const { locale } = useI18n();
  const [localConfig, setLocalConfig] = useState<ExportConfigType>(config);

  const handleUpdate = (updates: Partial<ExportConfigType>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onUpdate?.(newConfig);
  };

  const toggleMetric = (metric: string) => {
    const newMetrics = localConfig.metrics.includes(metric)
      ? localConfig.metrics.filter((m) => m !== metric)
      : [...localConfig.metrics, metric];
    handleUpdate({ metrics: newMetrics });
  };

  const availableMetrics = [
    { key: 'tvs', label: locale === 'zh-CN' ? 'TVS' : 'TVS' },
    { key: 'tvl', label: locale === 'zh-CN' ? 'TVL' : 'TVL' },
    { key: 'volume', label: locale === 'zh-CN' ? '交易量' : 'Volume' },
    { key: 'fees', label: locale === 'zh-CN' ? '费用' : 'Fees' },
    { key: 'revenue', label: locale === 'zh-CN' ? '收入' : 'Revenue' },
    { key: 'users', label: locale === 'zh-CN' ? '用户数' : 'Users' },
  ];

  const getFormatIcon = (format: ExportConfigType['format']) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'json':
        return <FileJson className="w-4 h-4" />;
      case 'xlsx':
        return <FileCode className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* 格式选择 */}
      <div>
        <label className="text-sm text-gray-700 mb-2 block">
          {locale === 'zh-CN' ? '导出格式' : 'Export Format'}
        </label>
        <div className="flex gap-2">
          {(['csv', 'json', 'xlsx'] as const).map((format) => (
            <button
              key={format}
              onClick={() => handleUpdate({ format })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                localConfig.format === format
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getFormatIcon(format)}
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 时间范围 */}
      <div>
        <label className="text-sm text-gray-700 mb-2 block">
          {locale === 'zh-CN' ? '时间范围' : 'Time Range'}
        </label>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => handleUpdate({ timeRange: range })}
              className={`px-2.5 py-1 rounded-md text-sm transition-colors ${
                localConfig.timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' && (locale === 'zh-CN' ? '7天' : '7D')}
              {range === '30d' && (locale === 'zh-CN' ? '30天' : '30D')}
              {range === '90d' && (locale === 'zh-CN' ? '90天' : '90D')}
              {range === '1y' && (locale === 'zh-CN' ? '1年' : '1Y')}
              {range === 'all' && (locale === 'zh-CN' ? '全部' : 'All')}
            </button>
          ))}
        </div>
      </div>

      {/* 指标选择 */}
      <div>
        <label className="text-sm text-gray-700 mb-2 block">
          {locale === 'zh-CN' ? '包含指标' : 'Include Metrics'}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availableMetrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-sm transition-colors ${
                localConfig.metrics.includes(metric.key)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {localConfig.metrics.includes(metric.key) && <Check className="w-3 h-3" />}
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* 选项 */}
      <div className="space-y-2 py-2 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localConfig.includeMetadata}
            onChange={(e) => handleUpdate({ includeMetadata: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            {locale === 'zh-CN' ? '包含元数据' : 'Include metadata'}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localConfig.includeCharts}
            onChange={(e) => handleUpdate({ includeCharts: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            {locale === 'zh-CN' ? '包含图表' : 'Include charts'}
          </span>
        </label>
      </div>

      {/* 导出按钮 */}
      <button
        onClick={onExport}
        disabled={loading || localConfig.metrics.length === 0}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
            {locale === 'zh-CN' ? '导出中...' : 'Exporting...'}
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {locale === 'zh-CN' ? '导出数据' : 'Export Data'}
          </>
        )}
      </button>
    </div>
  );
}
