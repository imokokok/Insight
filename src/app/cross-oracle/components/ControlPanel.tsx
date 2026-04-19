'use client';

/**
 * @fileoverview Unified control panel component
 * @description Control panel integrating all filter and selection functions, similar to QueryForm
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

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

import { AutoRefreshControl } from '@/app/price-query/components/AutoRefreshControl';
import { SegmentedControl, DropdownSelect } from '@/components/ui';
import { type RefreshInterval as NumericRefreshInterval } from '@/hooks/useAutoRefresh';
import { getPriceOracleProvidersSortedByMarketCap, getOracleConfig } from '@/lib/config/oracles';
import { type OracleProvider } from '@/types/oracle';

import { timeRanges, oracleNames, type TimeRange, type RefreshInterval } from '../constants';
import { useCommonSymbols } from '../hooks/useCommonSymbols';

import type { OracleFeature } from '../types/index';

interface ControlPanelProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  selectedOracles: OracleProvider[];
  onOracleToggle: (oracle: OracleProvider) => void;
  oracleChartColors: Record<string, string>;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onQuery: () => void;
  isLoading: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
  refreshInterval: RefreshInterval;
  onRefreshIntervalChange: (interval: RefreshInterval) => void;
  lastRefreshedAt: Date | null;
  nextRefreshAt: Date | null;
}

// Get oracle feature info
const getOracleFeatureInfo = (provider: OracleProvider): OracleFeature => {
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
    features: features.slice(0, 3),
    descriptionKey: config.descriptionKey,
  };
};

export function ControlPanel({
  selectedSymbol,
  onSymbolChange,
  selectedOracles,
  onOracleToggle,
  oracleChartColors,
  timeRange,
  onTimeRangeChange,
  onQuery,
  isLoading,
  activeFilterCount,
  onClearFilters,
  refreshInterval,
  onRefreshIntervalChange,
  lastRefreshedAt,
  nextRefreshAt,
}: ControlPanelProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [hoveredOracle, setHoveredOracle] = useState<OracleProvider | null>(null);

  const crossOracleToNumericInterval = (interval: RefreshInterval): NumericRefreshInterval => {
    const map: Record<RefreshInterval, NumericRefreshInterval> = {
      off: 0,
      '10s': 10000,
      '30s': 30000,
      '1m': 60000,
      '5m': 300000,
    };
    return map[interval];
  };

  const numericToCrossOracleInterval = (interval: NumericRefreshInterval): RefreshInterval => {
    const map: Record<NumericRefreshInterval, RefreshInterval> = {
      0: 'off',
      10000: '10s',
      30000: '30s',
      60000: '1m',
      300000: '5m',
    };
    return map[interval] || 'off';
  };

  // Use useCommonSymbols hook to get commonly supported symbols
  const { commonSymbols, oracleCountMap, unsupportedOracles } = useCommonSymbols(selectedOracles);

  const currentUnsupportedOracles = useMemo(() => {
    if (!selectedSymbol) return [] as OracleProvider[];
    return unsupportedOracles[selectedSymbol] || [];
  }, [unsupportedOracles, selectedSymbol]);

  // When switching oracles, if the currently selected symbol is not in the new common symbols list, auto-reset
  useEffect(() => {
    if (selectedOracles.length > 0 && commonSymbols.length > 0) {
      if (!commonSymbols.includes(selectedSymbol)) {
        onSymbolChange(commonSymbols[0]);
      }
    }
  }, [selectedOracles, commonSymbols, selectedSymbol, onSymbolChange]);

  // Symbol options for dropdown - use commonly supported symbols
  const symbolOptions = commonSymbols.map((symbol) => ({
    value: symbol,
    label: symbol,
    icon: true,
    color: '#6B7280',
  }));

  // Custom render option, showing oracle count
  const renderSymbolOption = useCallback(
    (option: { value: string; label: string; icon?: boolean; color?: string }) => {
      const oracleCount = oracleCountMap[option.value] || 0;
      return (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: option.color || '#6B7280' }}
            />
            <span>{option.label}</span>
          </div>
          <span className="text-xs text-gray-400">{oracleCount} oracles</span>
        </div>
      );
    },
    [oracleCountMap]
  );

  // Oracle options for multi-select
  const oracleOptions = getPriceOracleProvidersSortedByMarketCap().map((oracle) => ({
    value: oracle,
    label: oracleNames[oracle] || String(oracle),
    icon: true,
    color: oracleChartColors[oracle] || '#6B7280',
  }));

  // Time range options for segmented control
  const timeRangeOptions = timeRanges.map((range) => ({
    value: range.value,
    label: range.label,
  }));

  // Handle oracle toggle - support single oracle toggle
  const handleOracleToggle = (oracle: OracleProvider) => {
    onOracleToggle(oracle);
  };

  // Handle oracle change - support batch select/deselect
  const handleOracleChange = (oracles: OracleProvider[]) => {
    // If the new array is longer than the current one, it means addition
    if (oracles.length > selectedOracles.length) {
      const added = oracles.find((o) => !selectedOracles.includes(o));
      if (added) onOracleToggle(added);
    }
    // If the new array is shorter than the current one, it means removal
    else if (oracles.length < selectedOracles.length) {
      const removed = selectedOracles.find((o) => !oracles.includes(o));
      if (removed) onOracleToggle(removed);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Panel header - optimized for mobile display */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" aria-hidden="true" />
          <span className="hidden sm:inline">Query Configuration</span>
          <span className="sm:hidden">Filters</span>
        </h2>

        {/* Mobile expand/collapse button */}
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="lg:hidden inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-expanded={isMobileExpanded}
        >
          {isMobileExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Collapse</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary-500 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <span className="hidden xs:inline">Expand</span>
            </>
          )}
        </button>
      </div>

      {/* Control panel content - optimized spacing for mobile */}
      <div
        className={`p-3 sm:p-4 space-y-3 sm:space-y-4 ${isMobileExpanded ? '' : 'hidden lg:block'}`}
      >
        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100 rounded-md">
                {activeFilterCount} filters active
              </span>
            </div>
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          </div>
        )}

        {/* Asset selection */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
            Trading Pair
          </label>
          {selectedOracles.length === 0 ? (
            <div className="w-full px-3 py-2 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-lg">
              Select an oracle first
            </div>
          ) : commonSymbols.length === 0 ? (
            <div className="w-full px-3 py-3 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">No common symbols</p>
                  <p className="text-xs text-amber-500 mt-1">Adjust oracle selection</p>
                </div>
              </div>
            </div>
          ) : (
            <DropdownSelect
              options={symbolOptions}
              value={selectedSymbol}
              onChange={(value) => onSymbolChange(value as string)}
              placeholder="Select symbol..."
              searchable
              searchPlaceholder="Search symbol..."
              className="w-full"
              renderOption={(option) =>
                renderSymbolOption(
                  option as { value: string; label: string; icon?: boolean; color?: string }
                )
              }
            />
          )}
        </section>

        {/* Oracle multi-select - with hover tooltip */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Oracles
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const allValues = oracleOptions.map((o) => o.value);
                  if (selectedOracles.length === allValues.length) {
                    handleOracleChange([]);
                  } else {
                    handleOracleChange(allValues as OracleProvider[]);
                  }
                }}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 transition-all duration-200 rounded-md border border-gray-200 active:scale-[0.98]"
              >
                {selectedOracles.length === oracleOptions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Oracle selection button grid */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-lg relative">
            {oracleOptions.map((option) => {
              const selected = selectedOracles.includes(option.value as OracleProvider);
              const featureInfo = getOracleFeatureInfo(option.value as OracleProvider);
              const isUnsupported = currentUnsupportedOracles.includes(
                option.value as OracleProvider
              );

              return (
                <div key={String(option.value)} className="relative">
                  <button
                    onClick={() => handleOracleToggle(option.value as OracleProvider)}
                    onMouseEnter={() => setHoveredOracle(option.value as OracleProvider)}
                    onMouseLeave={() => setHoveredOracle(null)}
                    className={`relative inline-flex items-center gap-1.5 font-medium transition-all duration-200 ease-out rounded-md px-2.5 py-1.5 text-xs ${
                      selected
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                    } ${isUnsupported ? 'opacity-50' : ''} active:scale-[0.98]`}
                    style={{ zIndex: selected ? 1 : 0 }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                    {isUnsupported && (
                      <span className="inline-flex items-center px-1 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-700 rounded leading-none">
                        Not Supported
                      </span>
                    )}
                  </button>

                  {/* Hover tooltip */}
                  {hoveredOracle === option.value && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56">
                      <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 text-xs">
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />

                        {/* Oracle name */}
                        <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          {featureInfo.name}
                        </div>

                        {/* Feature info grid */}
                        <div className="space-y-2">
                          {/* Supported symbol count */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Layers className="w-3.5 h-3.5" />
                              <span>Supported Assets</span>
                            </div>
                            <span className="font-medium text-white">
                              {featureInfo.symbolCount.toLocaleString('en-US')}
                            </span>
                          </div>

                          {/* Average response latency */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Avg Latency</span>
                            </div>
                            <span className="font-medium text-white">
                              {featureInfo.avgLatency}ms
                            </span>
                          </div>

                          {/* Feature tags */}
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
              {selectedOracles.length} oracles selected
            </div>
          )}
        </section>

        {/* Time range selection - more compact layout for mobile */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <SegmentedControl
            options={timeRangeOptions}
            value={timeRange}
            onChange={(value) => onTimeRangeChange(value as TimeRange)}
            label="Time Range"
            size="sm"
            className="flex-wrap"
          />
        </section>

        {/* Auto refresh control */}
        <section className="bg-gray-50/50 rounded-lg p-2.5 sm:p-3 border border-gray-100">
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
            Auto Refresh
          </label>
          <AutoRefreshControl
            refreshInterval={crossOracleToNumericInterval(refreshInterval)}
            onIntervalChange={(interval) =>
              onRefreshIntervalChange(numericToCrossOracleInterval(interval))
            }
            lastRefreshedAt={lastRefreshedAt}
            nextRefreshAt={nextRefreshAt}
            isRefreshing={isLoading}
          />
        </section>

        {/* Query button - optimized for mobile */}
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
                Loading...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" aria-hidden="true" />
                Query
              </>
            )}
          </button>

          {selectedOracles.length === 0 && (
            <p className="mt-2 text-xs text-center text-gray-500">
              Please select at least one oracle
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
