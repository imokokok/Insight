'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ExportFormat, DataType, ExportOptions, ExportScope, Resolution } from '@/hooks/useUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  defaultTimeRange?: string;
  availableDataTypes?: DataType[];
  showBatchExport?: boolean;
  chartTitle?: string;
  dataSource?: string;
}

const DEFAULT_DATA_TYPES: DataType[] = ['all', 'price', 'historical', 'network'];

export function ExportModal({
  isOpen,
  onClose,
  onExport,
  defaultTimeRange = '24H',
  availableDataTypes = DEFAULT_DATA_TYPES,
  showBatchExport = false,
  chartTitle,
  dataSource,
}: ExportModalProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dataType, setDataType] = useState<DataType>('all');
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [scope, setScope] = useState<ExportScope>('current');
  const [resolution, setResolution] = useState<Resolution>('standard');
  const [batchExport, setBatchExport] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);

  useEffect(() => {
    setTimeRange(defaultTimeRange);
  }, [defaultTimeRange]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      format,
      dataType,
      timeRange,
      includeMetadata,
      dateRange: showCustomDateRange ? dateRange : undefined,
      scope,
      resolution,
      batchExport,
      chartTitle,
      dataSource,
      showTimestamp,
    };
    onExport(options);
    onClose();
  }, [format, dataType, timeRange, includeMetadata, showCustomDateRange, dateRange, scope, resolution, batchExport, chartTitle, dataSource, showTimestamp, onExport, onClose]);

  const dataTypeLabels: Record<DataType, string> = {
    all: t('chainlink.exportModal.dataTypes.all'),
    price: t('chainlink.exportModal.dataTypes.price'),
    historical: t('chainlink.exportModal.dataTypes.historical'),
    network: t('chainlink.exportModal.dataTypes.network'),
  };

  const formatLabels: Record<ExportFormat, string> = {
    json: 'JSON',
    csv: 'CSV',
    excel: 'Excel',
  };

  const scopeLabels: Record<ExportScope, string> = {
    current: '当前视图',
    all: '全部数据',
    custom: '自定义范围',
  };

  const resolutionLabels: Record<Resolution, string> = {
    standard: '标准 (2x)',
    high: '高清 (4x)',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {t('chainlink.exportModal.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chainlink.exportModal.format')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(formatLabels) as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      format === fmt
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatLabels[fmt]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出范围
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(scopeLabels) as ExportScope[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      scope === s
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {scopeLabels[s]}
                  </button>
                ))}
              </div>
            </div>

            {(format === 'png' || format === 'svg') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分辨率
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(resolutionLabels) as Resolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        resolution === res
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {resolutionLabels[res]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chainlink.exportModal.dataType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableDataTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setDataType(type)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      dataType === type
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {dataTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chainlink.exportModal.timeRange')}
              </label>
              <div className="flex flex-wrap gap-2">
                {['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setShowCustomDateRange(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      timeRange === range && !showCustomDateRange
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t(`chainlink.timeRange.${range}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={() => setShowCustomDateRange(!showCustomDateRange)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('chainlink.exportModal.customDateRange')}
              </button>
              
              {showCustomDateRange && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t('chainlink.exportModal.startDate')}
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t('chainlink.exportModal.endDate')}
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeMetadata"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="includeMetadata" className="text-sm text-gray-700">
                  {t('chainlink.exportModal.includeMetadata')}
                </label>
              </div>

              {(format === 'png' || format === 'svg') && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showTimestamp"
                    checked={showTimestamp}
                    onChange={(e) => setShowTimestamp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="showTimestamp" className="text-sm text-gray-700">
                    包含时间戳和数据来源
                  </label>
                </div>
              )}

              {showBatchExport && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="batchExport"
                    checked={batchExport}
                    onChange={(e) => setBatchExport(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="batchExport" className="text-sm text-gray-700">
                    批量导出所有数据
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t('chainlink.exportModal.cancel')}
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('chainlink.exportModal.export')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
