'use client';

/**
 * @fileoverview 统一控制面板组件
 * @description 整合所有筛选和选择功能的控制面板，类似 QueryForm
 */

import { useState, useEffect, useCallback } from 'react';

import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  AlertCircle,
  Zap,
  Clock,
  Layers,
  ChevronUp,
} from 'lucide-react';

import { SegmentedControl, DropdownSelect } from '@/components/ui';
import { getPriceOracleProvidersSortedByMarketCap, getOracleConfig } from '@/lib/config/oracles';
import { type OracleProvider } from '@/types/oracle';

import {
  timeRanges,
  oracleNames,
  tradingPairs,
  type PriceOracleProvider,
  priceOracleNames,
  type TimeRange,
} from '../constants';
import { useCommonSymbols } from '../hooks/useCommonSymbols';

import type { OracleFeature } from '../types/index';

interface ControlPanelProps {
  // Symbol selection
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  symbols: string[];

  // Oracle selection
  selectedOracles: PriceOracleProvider[];
  onOracleToggle: (oracle: PriceOracleProvider) => void;
  oracleChartColors: Record<PriceOracleProvider, string>;

  // Time range
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;

  // Actions
  onQuery: () => void;
  isLoading: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;

  // i18n
  t: (key: string, params?: Record<string, string | number>) => string;
}

// 获取预言机特性信息
const getOracleFeatureInfo = (provider: PriceOracleProvider): OracleFeature => {
  const config = getOracleConfig(provider);
  const features: string[] = [];

  if (config.features.hasFirstPartyOracle) features.push('First-Party');
  if (config.features.hasQuantifiableSecurity) features.push('Quantifiable Security');
  if (config.features.hasDisputeResolution) features.push('Dispute Resolution');
  if (config.features.hasDataStreams) features.push('Data Streams');
  if (config.features.hasCrossChain) features.push('Cross-Chain');
  if (config.features.hasCoreFeatures) features.push('Core Features');

  return {
    provider,
    name: config.name,
    symbolCount: config.networkData.dataFeeds,
    avgLatency: config.networkData.avgResponseTime,
    features: features.slice(0, 3), // 最多显示3个特性
    description: config.description,
  };
};

export function ControlPanel({
  selectedSymbol,
  onSymbolChange,
  symbols: _symbols,
  selectedOracles,
  onOracleToggle,
  oracleChartColors,
  timeRange,
  onTimeRangeChange,
  onQuery,
  isLoading,
  activeFilterCount,
  onClearFilters,
  t,
}: ControlPanelProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [hoveredOracle, setHoveredOracle] = useState<PriceOracleProvider | null>(null);

  // 使用 useCommonSymbols hook 获取共同支持的币种
  const { commonSymbols, oracleCountMap } = useCommonSymbols(selectedOracles);

  // 当切换预言机时，如果当前选择的币种不在新的共同币种列表中，自动重置
  useEffect(() => {
    if (selectedOracles.length > 0 && commonSymbols.length > 0) {
      if (!commonSymbols.includes(selectedSymbol)) {
        onSymbolChange(commonSymbols[0]);
      }
    }
  }, [selectedOracles, commonSymbols, selectedSymbol, onSymbolChange]);

  // Symbol options for dropdown - 使用共同支持的币种
  const symbolOptions = commonSymbols.map((symbol) => {
    const pair = tradingPairs.find((p) => p.symbol === symbol);
    return {
      value: symbol,
      label: symbol,
      icon: true,
      color: pair?.iconColor || '#6B7280',
    };
  });

  // 自定义渲染选项，显示预言机数量
  const renderSymbolOption = useCallback(
    (option: { value: string; label: string; icon?: boolean; color?: string }) => {
      const oracleCount = oracleCountMap[option.value] || 0;
      const pair = tradingPairs.find((p) => p.symbol === option.value);
      return (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: pair?.iconColor || '#6B7280' }}
            />
            <span>{option.label}</span>
          </div>
          <span className="text-xs text-gray-400">{oracleCount} 个预言机</span>
        </div>
      );
    },
    [oracleCountMap]
  );

  // Oracle options for multi-select
  const oracleOptions = getPriceOracleProvidersSortedByMarketCap().map((oracle) => ({
    value: oracle,
    label: priceOracleNames[oracle],
    icon: true,
    color: oracleChartColors[oracle] || '#6B7280',
  }));

  // Time range options for segmented control
  const timeRangeOptions = timeRanges.map((range) => ({
    value: range,
    label: t(`crossOracle.timeRange.${range}`) || range,
  }));

  // Handle oracle toggle - 支持单个预言机切换
  const handleOracleToggle = (oracle: PriceOracleProvider) => {
    onOracleToggle(oracle);
  };

  // Handle oracle change - 支持批量选择/取消选择
  const handleOracleChange = (oracles: PriceOracleProvider[]) => {
    // 如果新数组比当前数组长，说明是添加
    if (oracles.length > selectedOracles.length) {
      const added = oracles.find((o) => !selectedOracles.includes(o));
      if (added) onOracleToggle(added);
    }
    // 如果新数组比当前数组短，说明是移除
    else if (oracles.length < selectedOracles.length) {
      const removed = selectedOracles.find((o) => !oracles.includes(o));
      if (removed) onOracleToggle(removed);
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
          {selectedOracles.length === 0 ? (
            <div className="w-full px-3 py-2 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-lg">
              {t('controlPanel.selectOracleFirst') || '请先选择预言机'}
            </div>
          ) : commonSymbols.length === 0 ? (
            <div className="w-full px-3 py-3 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {t('controlPanel.noCommonSymbols') || '无共同支持的币种'}
                  </p>
                  <p className="text-xs text-amber-500 mt-1">
                    {t('controlPanel.adjustOracleSelection') ||
                      '请调整预言机选择，选择支持相同币种的预言机'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <DropdownSelect
              options={symbolOptions}
              value={selectedSymbol}
              onChange={(value) => onSymbolChange(value as string)}
              placeholder={t('controlPanel.selectSymbol') || 'Select symbol...'}
              searchable
              searchPlaceholder={t('controlPanel.searchSymbol') || 'Search symbol...'}
              className="w-full"
              renderOption={(option) =>
                renderSymbolOption(
                  option as { value: string; label: string; icon?: boolean; color?: string }
                )
              }
            />
          )}
        </section>

        {/* 预言机多选 - 带悬停提示 */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {t('controlPanel.oracles') || 'Oracles'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const allValues = oracleOptions.map((o) => o.value);
                  if (selectedOracles.length === allValues.length) {
                    handleOracleChange([]);
                  } else {
                    handleOracleChange(allValues as PriceOracleProvider[]);
                  }
                }}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 transition-all duration-200 rounded-md border border-gray-200 active:scale-[0.98]"
              >
                {selectedOracles.length === oracleOptions.length
                  ? t('controlPanel.deselectAll') || 'Deselect All'
                  : t('controlPanel.selectAll') || 'Select All'}
              </button>
            </div>
          </div>

          {/* 预言机选择按钮网格 */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-lg relative">
            {oracleOptions.map((option) => {
              const selected = selectedOracles.includes(option.value as PriceOracleProvider);
              const featureInfo = getOracleFeatureInfo(option.value as PriceOracleProvider);

              return (
                <div key={String(option.value)} className="relative">
                  <button
                    onClick={() => handleOracleToggle(option.value as PriceOracleProvider)}
                    onMouseEnter={() => setHoveredOracle(option.value as PriceOracleProvider)}
                    onMouseLeave={() => setHoveredOracle(null)}
                    className={`relative inline-flex items-center gap-1.5 font-medium transition-all duration-200 ease-out rounded-md px-2.5 py-1.5 text-xs ${
                      selected
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                    } active:scale-[0.98]`}
                    style={{ zIndex: selected ? 1 : 0 }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </button>

                  {/* 悬停提示框 */}
                  {hoveredOracle === option.value && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56">
                      <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 text-xs">
                        {/* 提示框箭头 */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />

                        {/* 预言机名称 */}
                        <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          {featureInfo.name}
                        </div>

                        {/* 特性信息网格 */}
                        <div className="space-y-2">
                          {/* 支持币种数量 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Layers className="w-3.5 h-3.5" />
                              <span>Supported Assets</span>
                            </div>
                            <span className="font-medium text-white">
                              {featureInfo.symbolCount.toLocaleString()}
                            </span>
                          </div>

                          {/* 平均响应延迟 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Avg Latency</span>
                            </div>
                            <span className="font-medium text-white">
                              {featureInfo.avgLatency}ms
                            </span>
                          </div>

                          {/* 特性标签 */}
                          {featureInfo.features.length > 0 && (
                            <div className="pt-1">
                              <div className="flex items-center gap-1.5 text-gray-300 mb-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Features</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {featureInfo.features.map((feature: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 bg-gray-700 text-gray-200 rounded text-[10px]"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedOracles.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {selectedOracles.length} {t('controlPanel.oraclesSelected') || 'oracles selected'}
            </div>
          )}
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
