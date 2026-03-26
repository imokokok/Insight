'use client';

/**
 * @fileoverview 统一控制面板组件
 * @description 整合所有筛选和选择功能的控制面板，类似 QueryForm
 */

import { useState } from 'react';

import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

import { SegmentedControl, MultiSelect, DropdownSelect } from '@/components/ui';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { type OracleProvider } from '@/types/oracle';

import { timeRanges, oracleNames, symbols, tradingPairs } from '../constants';

import type { TimeRange, DeviationFilter } from '../constants';

interface ControlPanelProps {
  // Symbol selection
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  symbols: string[];

  // Oracle selection
  selectedOracles: OracleProvider[];
  onOracleToggle: (oracle: OracleProvider) => void;
  oracleChartColors: Record<OracleProvider, string>;

  // Time range
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;

  // Deviation filter
  deviationFilter: DeviationFilter;
  onDeviationFilterChange: (filter: DeviationFilter) => void;

  // Accessibility
  useAccessibleColors: boolean;
  onAccessibleColorsChange: (value: boolean) => void;

  // Actions
  onQuery: () => void;
  isLoading: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;

  // i18n
  t: (key: string, params?: Record<string, string | number>) => string;
}

const deviationFilters: { value: DeviationFilter; label: string; threshold: string }[] = [
  { value: 'all', label: 'All', threshold: '' },
  { value: 'excellent', label: 'Low', threshold: '<0.1%' },
  { value: 'good', label: 'Medium', threshold: '0.1-0.5%' },
  { value: 'poor', label: 'High', threshold: '>0.5%' },
];

export function ControlPanel({
  selectedSymbol,
  onSymbolChange,
  symbols,
  selectedOracles,
  onOracleToggle,
  oracleChartColors,
  timeRange,
  onTimeRangeChange,
  deviationFilter,
  onDeviationFilterChange,
  useAccessibleColors,
  onAccessibleColorsChange,
  onQuery,
  isLoading,
  activeFilterCount,
  onClearFilters,
  t,
}: ControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Symbol options for dropdown
  const symbolOptions = symbols.map((symbol) => {
    const pair = tradingPairs.find((p) => p.symbol === symbol);
    return {
      value: symbol,
      label: symbol,
      icon: true,
      color: pair?.iconColor || '#6B7280',
    };
  });

  // Oracle options for multi-select
  const oracleOptions = getOracleProvidersSortedByMarketCap().map((oracle) => ({
    value: oracle,
    label: oracleNames[oracle],
    icon: true,
    color: oracleChartColors[oracle] || '#6B7280',
  }));

  // Time range options for segmented control
  const timeRangeOptions = timeRanges.map((range) => ({
    value: range,
    label: t(`crossOracle.timeRange.${range}`) || range,
  }));

  // Deviation filter options for dropdown
  const deviationFilterOptions = deviationFilters.map((filter) => ({
    value: filter.value,
    label: `${filter.label} ${filter.threshold}`.trim(),
  }));

  // Handle oracle toggle
  const handleOracleChange = (oracles: OracleProvider[]) => {
    // Find the changed oracle
    const added = oracles.find((o) => !selectedOracles.includes(o));
    const removed = selectedOracles.find((o) => !oracles.includes(o));
    const changed = added || removed;
    if (changed) {
      onOracleToggle(changed);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 面板头部 - 优化移动端显示 */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" aria-hidden="true" />
          <span className="hidden sm:inline">
            {t('controlPanel.title') || 'Query Configuration'}
          </span>
          <span className="sm:hidden">{t('controlPanel.titleShort') || 'Filters'}</span>
        </h2>

        {/* 移动端展开/收起按钮 */}
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="lg:hidden inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-expanded={isMobileExpanded}
        >
          {isMobileExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t('controlPanel.collapse') || 'Collapse'}</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary-500 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <span className="hidden xs:inline">{t('controlPanel.expand') || 'Expand'}</span>
            </>
          )}
        </button>
      </div>

      {/* 控制面板内容 - 移动端优化间距 */}
      <div
        className={`p-3 sm:p-4 space-y-3 sm:space-y-4 ${isMobileExpanded ? '' : 'hidden lg:block'}`}
      >
        {/* 活跃筛选器标签 */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100 rounded-md">
                {activeFilterCount} {t('crossOracle.filter.filtersActive') || 'filters active'}
              </span>
            </div>
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
              {t('crossOracle.filter.clearAll') || 'Clear All'}
            </button>
          </div>
        )}

        {/* 资产选择 */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
            {t('controlPanel.symbol') || 'Trading Pair'}
          </label>
          <DropdownSelect
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => onSymbolChange(value as string)}
            placeholder={t('controlPanel.selectSymbol') || 'Select symbol...'}
            searchable
            searchPlaceholder={t('controlPanel.searchSymbol') || 'Search symbol...'}
            className="w-full"
          />
        </section>

        {/* 预言机多选 - 移动端优化 */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <MultiSelect
            options={oracleOptions}
            value={selectedOracles}
            onChange={(values) => handleOracleChange(values as OracleProvider[])}
            label={t('controlPanel.oracles') || 'Oracles'}
            showSelectAll
            selectAllLabel={t('controlPanel.selectAll') || 'Select All'}
            deselectAllLabel={t('controlPanel.deselectAll') || 'Deselect All'}
          />
        </section>

        {/* 时间范围选择 - 移动端使用更紧凑的布局 */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <SegmentedControl
            options={timeRangeOptions}
            value={timeRange}
            onChange={(value) => onTimeRangeChange(value as TimeRange)}
            label={t('controlPanel.timeRange') || 'Time Range'}
            size="sm"
            className="flex-wrap"
          />
        </section>

        {/* 偏差筛选 */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
            {t('controlPanel.deviationFilter') || 'Deviation Filter'}
          </label>
          <DropdownSelect
            options={deviationFilterOptions}
            value={deviationFilter}
            onChange={(value) => onDeviationFilterChange(value as DeviationFilter)}
            placeholder={t('controlPanel.selectDeviation') || 'Select deviation range...'}
            className="w-full"
          />
        </section>

        {/* 高级选项 */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors py-2 px-3 rounded-md hover:bg-gray-50/80"
            aria-expanded={showAdvanced}
          >
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
              {t('controlPanel.advancedOptions') || 'Advanced Options'}
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-2 p-3 bg-gray-50/80 rounded-lg border border-gray-100 animate-in slide-in-from-top-1 duration-200">
              {/* 无障碍颜色模式 */}
              <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={useAccessibleColors}
                  onChange={(e) => onAccessibleColorsChange(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {t('controlPanel.accessibleColors') || 'Color Blind Friendly Mode'}
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* 查询按钮 - 移动端优化 */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={onQuery}
            disabled={isLoading || selectedOracles.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm active:scale-[0.98] transform"
          >
            {isLoading ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"
                  aria-hidden="true"
                />
                {t('controlPanel.loading') || 'Loading...'}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" aria-hidden="true" />
                {t('controlPanel.query') || 'Query'}
              </>
            )}
          </button>

          {selectedOracles.length === 0 && (
            <p className="mt-2 text-xs text-center text-gray-500">
              {t('controlPanel.selectOracleHint') || 'Please select at least one oracle'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
