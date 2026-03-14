'use client';

import { OracleProvider } from '@/types/oracle';
import { oracleNames, TimeRange, DeviationFilter, timeRanges } from '../constants';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  deviationFilter: DeviationFilter;
  onDeviationFilterChange: (filter: DeviationFilter) => void;
  oracleFilter: OracleProvider | 'all';
  onOracleFilterChange: (filter: OracleProvider | 'all') => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  getFilterSummary: () => string[];
  t: (key: string) => string;
}

export function FilterPanel({
  isOpen,
  onClose,
  timeRange,
  onTimeRangeChange,
  deviationFilter,
  onDeviationFilterChange,
  oracleFilter,
  onOracleFilterChange,
  activeFilterCount,
  onClearFilters,
  getFilterSummary,
  t,
}: FilterPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="p-4">
        {activeFilterCount > 0 && (
          <div className="mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                当前筛选
              </span>
              <button
                onClick={onClearFilters}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                清除全部
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getFilterSummary().map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            时间范围
          </label>
          <div className="flex flex-wrap gap-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(`crossOracle.timeRange.${range}`) || range}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            偏差范围
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'all' as const, label: '全部' },
              { value: 'excellent' as const, label: '<0.1%' },
              { value: 'good' as const, label: '0.1-0.5%' },
              { value: 'poor' as const, label: '>0.5%' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => onDeviationFilterChange(filter.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  deviationFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            预言机筛选
          </label>
          <select
            value={oracleFilter}
            onChange={(e) => onOracleFilterChange(e.target.value as OracleProvider | 'all')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部预言机</option>
            {getOracleProvidersSortedByMarketCap().map((oracle) => (
              <option key={oracle} value={oracle}>
                {oracleNames[oracle]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {activeFilterCount > 0 ? `已应用 ${activeFilterCount} 个筛选` : '无筛选条件'}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          确定
        </button>
      </div>
    </div>
  );
}
