'use client';

import { OracleProvider } from '@/types/oracle';
import { oracleNames, TimeRange, DeviationFilter, timeRanges } from '../constants';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { DropdownSelect } from '@/components/ui/selectors';

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
  t: (key: string, params?: Record<string, string | number>) => string;
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

  const oracleOptions = [
    { value: 'all' as const, label: t('crossOracle.filter.allOracles') },
    ...getOracleProvidersSortedByMarketCap().map((oracle) => ({
      value: oracle as OracleProvider | 'all',
      label: oracleNames[oracle],
    })),
  ];

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 z-50">
      <div className="p-4">
        {activeFilterCount > 0 && (
          <div className="mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('crossOracle.filter.currentFilters')}
              </span>
              <button
                onClick={onClearFilters}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('crossOracle.filter.clearAll')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getFilterSummary().map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {t('crossOracle.filter.timeRange')}
          </label>
          <div className="flex flex-wrap gap-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                  timeRange === range
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t(`crossOracle.timeRange.${range}`) || range}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {t('crossOracle.filter.deviationRange')}
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'all' as const, label: t('crossOracle.filter.all') },
              { value: 'excellent' as const, label: '<0.1%' },
              { value: 'good' as const, label: '0.1-0.5%' },
              { value: 'poor' as const, label: '>0.5%' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => onDeviationFilterChange(filter.value)}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                  deviationFilter === filter.value
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {t('crossOracle.filter.oracleFilter')}
          </label>
          <DropdownSelect
            options={oracleOptions}
            value={oracleFilter}
            onChange={onOracleFilterChange}
            className="w-full"
          />
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {activeFilterCount > 0
            ? t('crossOracle.filter.filtersApplied', { count: activeFilterCount })
            : t('crossOracle.filter.noFilters')}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          {t('crossOracle.filter.confirm')}
        </button>
      </div>
    </div>
  );
}
