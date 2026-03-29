'use client';

import { useState, useCallback, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileJson,
  FileText,
  Table,
  ChevronDown,
  X,
  Loader2,
  Image,
  Layers,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useTranslations, useLocale } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AdvancedDataExport');

export type ExportFormat = 'csv' | 'json' | 'pdf';
export type DateRangePreset = '1h' | '24h' | '7d' | '30d' | 'custom';
export type DataType = 'price' | 'network' | 'providers' | 'all';

export interface ExportField {
  key: string;
  label: string;
  labelZh: string;
  selected: boolean;
}

export interface ExportConfig {
  format: ExportFormat;
  dateRange: {
    preset: DateRangePreset;
    start?: Date;
    end?: Date;
  };
  dataTypes: DataType[];
  fields: ExportField[];
  includeChart: boolean;
  includeMetadata: boolean;
  batchExport: boolean;
}

export interface ExportResult {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

interface AdvancedDataExportProps {
  data: {
    price?: unknown;
    historical?: unknown[];
    network?: unknown;
    providers?: unknown[];
    metrics?: unknown;
  };
  chartRef?: React.RefObject<HTMLDivElement>;
  onExport?: (config: ExportConfig) => Promise<ExportResult>;
  disabled?: boolean;
  compact?: boolean;
}

const FORMAT_CONFIGS = [
  {
    value: 'csv' as ExportFormat,
    label: 'CSV',
    labelZh: 'CSV',
    icon: <Table className="w-4 h-4" />,
    description: '表格格式，适合数据分析',
    descriptionZh: '表格格式，适合数据分析',
  },
  {
    value: 'json' as ExportFormat,
    label: 'JSON',
    labelZh: 'JSON',
    icon: <FileJson className="w-4 h-4" />,
    description: '结构化数据，适合开发',
    descriptionZh: '结构化数据，适合开发',
  },
  {
    value: 'pdf' as ExportFormat,
    label: 'PDF',
    labelZh: 'PDF',
    icon: <FileText className="w-4 h-4" />,
    description: '报告格式，适合分享',
    descriptionZh: '报告格式，适合分享',
  },
];

const DATE_RANGE_PRESETS = [
  { value: '1h' as DateRangePreset, label: '1 Hour', labelZh: '1小时' },
  { value: '24h' as DateRangePreset, label: '24 Hours', labelZh: '24小时' },
  { value: '7d' as DateRangePreset, label: '7 Days', labelZh: '7天' },
  { value: '30d' as DateRangePreset, label: '30 Days', labelZh: '30天' },
  { value: 'custom' as DateRangePreset, label: 'Custom', labelZh: '自定义' },
];

const DATA_TYPE_OPTIONS = [
  { value: 'price' as DataType, label: 'Price Data', labelZh: '价格数据' },
  { value: 'network' as DataType, label: 'Network Stats', labelZh: '网络统计' },
  { value: 'providers' as DataType, label: 'Providers', labelZh: '数据提供者' },
  { value: 'all' as DataType, label: 'All Data', labelZh: '全部数据' },
];

const DEFAULT_FIELDS: ExportField[] = [
  { key: 'timestamp', label: 'Timestamp', labelZh: '时间戳', selected: true },
  { key: 'price', label: 'Price', labelZh: '价格', selected: true },
  { key: 'volume', label: 'Volume', labelZh: '交易量', selected: true },
  { key: 'change24h', label: '24h Change', labelZh: '24h变化', selected: true },
  { key: 'marketCap', label: 'Market Cap', labelZh: '市值', selected: false },
];

export function AdvancedDataExport({
  data: _data,
  chartRef: _chartRef,
  onExport,
  disabled = false,
  compact = false,
}: AdvancedDataExportProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isZh = locale === 'zh-CN';

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'format' | 'options' | 'exporting'>('format');
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    dateRange: { preset: '24h' },
    dataTypes: ['all'],
    fields: DEFAULT_FIELDS,
    includeChart: false,
    includeMetadata: true,
    batchExport: false,
  });
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setConfig((prev) => ({ ...prev, format }));
    setCurrentStep('options');
  }, []);

  const handleDateRangeChange = useCallback((preset: DateRangePreset) => {
    setConfig((prev) => ({
      ...prev,
      dateRange: { preset },
    }));
  }, []);

  const handleCustomDateChange = useCallback((type: 'start' | 'end', value: string) => {
    setConfig((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        preset: 'custom',
        [type]: value ? new Date(value) : undefined,
      },
    }));
  }, []);

  const handleDataTypeToggle = useCallback((dataType: DataType) => {
    setConfig((prev) => {
      if (dataType === 'all') {
        return { ...prev, dataTypes: ['all'] };
      }
      const newDataTypes = prev.dataTypes.includes(dataType)
        ? prev.dataTypes.filter((t) => t !== dataType && t !== 'all')
        : [...prev.dataTypes.filter((t) => t !== 'all'), dataType];
      return { ...prev, dataTypes: newDataTypes.length > 0 ? newDataTypes : ['all'] };
    });
  }, []);

  const handleFieldToggle = useCallback((key: string) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f)),
    }));
  }, []);

  const handleExport = useCallback(async () => {
    setCurrentStep('exporting');
    setExportProgress(0);
    setExportResult(null);

    const progressInterval = setInterval(() => {
      setExportProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      const result = await onExport?.(config);
      clearInterval(progressInterval);
      setExportProgress(100);
      setExportResult(result || { success: true });

      setTimeout(() => {
        setIsOpen(false);
        setCurrentStep('format');
        setExportProgress(0);
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      logger.error('Export failed', error as Error);
      setExportResult({ success: false, error: (error as Error).message });
    }
  }, [config, onExport]);

  const handleBack = useCallback(() => {
    setCurrentStep('format');
  }, []);

  const selectedFieldsCount = config.fields.filter((f) => f.selected).length;

  const getFormatConfig = (format: ExportFormat) => FORMAT_CONFIGS.find((f) => f.value === format);

  const renderFormatSelection = () => (
    <div className="p-3">
      <p className="text-xs text-gray-500 px-2 py-1 mb-2">
        {t('redstone.export.selectFormat') || '选择导出格式'}
      </p>
      {FORMAT_CONFIGS.map((format) => (
        <button
          key={format.value}
          onClick={() => handleFormatSelect(format.value)}
          className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600">{format.icon}</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {isZh ? format.labelZh : format.label}
            </div>
            <div className="text-xs text-gray-500">
              {isZh ? format.descriptionZh : format.description}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg] mt-2" />
        </button>
      ))}
    </div>
  );

  const renderOptions = () => {
    const formatConfig = getFormatConfig(config.format);
    return (
      <div className="w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-gray-100">{formatConfig?.icon}</div>
            <span className="font-medium text-gray-900">
              {isZh ? formatConfig?.labelZh : formatConfig?.label}{' '}
              {t('redstone.export.config') || '导出配置'}
            </span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {t('redstone.export.dateRange') || '日期范围'}
            </label>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDateRangeChange(preset.value)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    config.dateRange.preset === preset.value
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isZh ? preset.labelZh : preset.label}
                </button>
              ))}
            </div>
            {config.dateRange.preset === 'custom' && (
              <div className="flex gap-2 mt-2">
                <input
                  type="datetime-local"
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={t('redstone.export.startDate') || '开始日期'}
                />
                <input
                  type="datetime-local"
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={t('redstone.export.endDate') || '结束日期'}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {t('redstone.export.dataTypes') || '数据类型'}
            </label>
            <div className="flex flex-wrap gap-2">
              {DATA_TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleDataTypeToggle(type.value)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    config.dataTypes.includes(type.value)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isZh ? type.labelZh : type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                {t('redstone.export.fields') || '导出字段'} ({selectedFieldsCount}/
                {config.fields.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      fields: prev.fields.map((f) => ({ ...f, selected: true })),
                    }))
                  }
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  {t('common.selectAll') || '全选'}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      fields: prev.fields.map((f) => ({ ...f, selected: false })),
                    }))
                  }
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  {t('common.deselectAll') || '取消全选'}
                </button>
              </div>
            </div>
            <div className="space-y-1 border border-gray-100 rounded-lg p-2 max-h-32 overflow-y-auto">
              {config.fields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={field.selected}
                    onChange={() => handleFieldToggle(field.key)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">
                    {isZh ? field.labelZh : field.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeMetadata}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, includeMetadata: e.target.checked }))
                }
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">
                {t('redstone.export.includeMetadata') || '包含元数据'}
              </span>
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
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <Image className="w-4 h-4" aria-hidden="true" />
                    {t('redstone.export.includeChart') || '包含图表'}
                  </span>
                </label>
              </>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.batchExport}
                onChange={(e) => setConfig((prev) => ({ ...prev, batchExport: e.target.checked }))}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Layers className="w-4 h-4" />
                {t('redstone.export.batchExport') || '批量导出'}
              </span>
            </label>
          </div>
        </div>

        {currentStep === 'exporting' && (
          <div className="px-4 pb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${exportProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">{exportProgress}%</p>
          </div>
        )}

        <div className="flex gap-2 p-4 border-t border-gray-100">
          <Button variant="secondary" onClick={handleBack} className="flex-1">
            {t('common.back') || '返回'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={currentStep === 'exporting' || selectedFieldsCount === 0}
            className="flex-1 gap-2"
          >
            {currentStep === 'exporting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('redstone.export.exporting') || '导出中...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('common.export') || '导出'}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderExporting = () => (
    <div className="w-80 p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        {exportProgress < 100 ? (
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        ) : (
          <Check className="w-8 h-8 text-green-500" />
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 mb-2">
        {exportProgress < 100
          ? t('redstone.export.exporting') || '正在导出...'
          : t('redstone.export.completed') || '导出完成'}
      </p>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-red-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${exportProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-xs text-gray-500">{exportProgress}%</p>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {compact ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || currentStep === 'exporting'}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title={t('common.export') || 'Export'}
        >
          {currentStep === 'exporting' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || currentStep === 'exporting'}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all disabled:opacity-50"
        >
          {currentStep === 'exporting' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{t('common.export') || '导出'}</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                setCurrentStep('format');
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {currentStep === 'format' && renderFormatSelection()}
              {currentStep === 'options' && renderOptions()}
              {currentStep === 'exporting' && renderExporting()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useAdvancedExport(data: AdvancedDataExportProps['data']) {
  const exportData = useCallback(
    async (config: ExportConfig): Promise<ExportResult> => {
      const { format, dateRange, dataTypes, fields, includeMetadata, includeChart } = config;

      let exportPayload: Record<string, unknown> = {};

      if (dataTypes.includes('all')) {
        exportPayload = data as Record<string, unknown>;
      } else {
        if (dataTypes.includes('price')) exportPayload = { ...exportPayload, price: data.price };
        if (dataTypes.includes('network'))
          exportPayload = { ...exportPayload, network: data.network };
        if (dataTypes.includes('providers'))
          exportPayload = { ...exportPayload, providers: data.providers };
      }

      const selectedFields = fields.filter((f) => f.selected).map((f) => f.key);

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');

      let fileName = `redstone-export-${dateStr}-${timeStr}`;

      if (dateRange.preset !== 'custom') {
        fileName += `-${dateRange.preset}`;
      }

      if (format === 'json') {
        const payload = includeMetadata
          ? {
              metadata: {
                exportDate: now.toISOString(),
                dateRange: dateRange.preset,
                dataTypes,
                fields: selectedFields,
              },
              data: exportPayload,
            }
          : exportPayload;

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, `${fileName}.json`);

        return { success: true, fileName: `${fileName}.json`, fileSize: blob.size };
      }

      if (format === 'csv') {
        const csvContent = convertToCSV(exportPayload, selectedFields, includeMetadata);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `${fileName}.csv`);

        return { success: true, fileName: `${fileName}.csv`, fileSize: blob.size };
      }

      if (format === 'pdf') {
        const pdfContent = generatePDFReport(exportPayload, {
          includeMetadata,
          includeChart,
          dateRange: dateRange.preset,
          selectedFields,
        });
        const blob = new Blob([pdfContent], { type: 'text/html;charset=utf-8;' });
        downloadBlob(blob, `${fileName}.html`);

        return { success: true, fileName: `${fileName}.html`, fileSize: blob.size };
      }

      return { success: false, error: 'Unsupported format' };
    },
    [data]
  );

  return { exportData };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convertToCSV(data: unknown, selectedFields: string[], includeMetadata: boolean): string {
  const lines: string[] = [];

  if (includeMetadata) {
    lines.push('# RedStone Oracle Data Export');
    lines.push(`# Export Date: ${new Date().toISOString()}`);
    lines.push(`# Fields: ${selectedFields.join(', ')}`);
    lines.push('#');
  }

  if (typeof data === 'object' && data !== null) {
    const dataObj = data as Record<string, unknown>;

    if (dataObj.historical && Array.isArray(dataObj.historical)) {
      const historical = dataObj.historical as Record<string, unknown>[];
      if (historical.length > 0) {
        const headers = Object.keys(historical[0]).filter((k) =>
          selectedFields.length > 0 ? selectedFields.includes(k) : true
        );
        lines.push(headers.join(','));
        historical.forEach((item) => {
          const row = headers.map((h) => {
            const val = item[h];
            if (typeof val === 'string') return `"${val}"`;
            return String(val ?? '');
          });
          lines.push(row.join(','));
        });
      }
    } else {
      const entries = Object.entries(dataObj);
      lines.push('Key,Value');
      entries.forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          lines.push(`${key},"${JSON.stringify(value).replace(/"/g, '""')}"`);
        } else {
          lines.push(`${key},"${String(value).replace(/"/g, '""')}"`);
        }
      });
    }
  }

  return lines.join('\n');
}

function generatePDFReport(
  data: unknown,
  options: {
    includeMetadata: boolean;
    includeChart: boolean;
    dateRange: string;
    selectedFields: string[];
  }
): string {
  const { includeMetadata, dateRange, selectedFields } = options;

  return `
<!DOCTYPE html>
<html>
<head>
  <title>RedStone Oracle Data Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #ef4444; }
    .metadata { background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-radius: 8px; }
    .data { white-space: pre-wrap; font-family: monospace; }
  </style>
</head>
<body>
  <h1>RedStone Oracle Data Report</h1>
  ${
    includeMetadata
      ? `
    <div class="metadata">
      <p><strong>Export Date:</strong> ${new Date().toISOString()}</p>
      <p><strong>Date Range:</strong> ${dateRange}</p>
      <p><strong>Fields:</strong> ${selectedFields.join(', ')}</p>
    </div>
  `
      : ''
  }
  <div class="data">${JSON.stringify(data, null, 2)}</div>
</body>
</html>
  `.trim();
}
