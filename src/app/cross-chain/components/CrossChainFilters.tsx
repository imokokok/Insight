'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type OracleProvider } from '@/types/oracle';

import { TIME_RANGES, providerNames, chainNames, symbols, chainColors } from '../constants';
import { useSupportedChains } from '../useCrossChainData';
import { type ThresholdType } from '../utils';

export function CrossChainFilters() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const setSelectedProvider = useCrossChainSelectorStore((s) => s.setSelectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useCrossChainSelectorStore((s) => s.setSelectedSymbol);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const setSelectedTimeRange = useCrossChainSelectorStore((s) => s.setSelectedTimeRange);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const setSelectedBaseChain = useCrossChainSelectorStore((s) => s.setSelectedBaseChain);

  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  const showMA = useCrossChainUIStore((s) => s.showMA);
  const setShowMA = useCrossChainUIStore((s) => s.setShowMA);
  const maPeriod = useCrossChainUIStore((s) => s.maPeriod);
  const setMaPeriod = useCrossChainUIStore((s) => s.setMaPeriod);
  const chartKey = useCrossChainUIStore((s) => s.chartKey);
  const setChartKey = useCrossChainUIStore((s) => s.setChartKey);
  const toggleChain = useCrossChainUIStore((s) => s.toggleChain);

  const recommendedBaseChain = useCrossChainDataStore((s) => s.recommendedBaseChain);

  const supportedChains = useSupportedChains();

  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);
  const setThresholdConfig = useCrossChainConfigStore((s) => s.setThresholdConfig);

  const providerOptions = getPriceOracleProvidersSortedByMarketCap().map((provider) => ({
    value: provider,
    label: providerNames[provider],
  }));

  const symbolOptions = symbols.map((symbol) => ({
    value: symbol,
    label: symbol,
  }));

  const filteredChains = supportedChains.filter((chain) => visibleChains.includes(chain));
  const baseChainOptions = filteredChains.map((chain) => ({
    value: chain,
    label: chainNames[chain],
  }));

  const maPeriodOptions = [
    { value: 7, label: '7' },
    { value: 25, label: '25' },
    { value: 99, label: '99' },
  ];

  const thresholdTypeOptions = [
    { value: 'fixed' as ThresholdType, label: 'Fixed Threshold' },
    { value: 'dynamic' as ThresholdType, label: 'Dynamic Volatility' },
    { value: 'atr' as ThresholdType, label: 'ATR Indicator' },
  ];

  const calculationPeriodOptions = [
    { value: 7, label: '7' },
    { value: 14, label: '14' },
    { value: 20, label: '20' },
    { value: 30, label: '30' },
  ];

  const timeRangeOptions = TIME_RANGES.map((range) => ({
    value: range.value,
    label: range.label,
  }));

  const activeFilterCount = [
    selectedProvider !== 'chainlink',
    selectedSymbol !== 'ETH',
    selectedTimeRange !== 24,
    selectedBaseChain !== null,
    visibleChains.length !== supportedChains.length,
    showMA,
    thresholdConfig.type !== 'fixed',
  ].filter(Boolean).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md transition-colors hover:bg-gray-200 text-gray-500"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Oracle Provider
              </label>
              <DropdownSelect
                options={providerOptions}
                value={selectedProvider}
                onChange={(value) => setSelectedProvider(value as OracleProvider)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Symbol
              </label>
              <DropdownSelect
                options={symbolOptions}
                value={selectedSymbol}
                onChange={(value) => setSelectedSymbol(value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Time Range
              </label>
              <SegmentedControl
                options={timeRangeOptions}
                value={selectedTimeRange}
                onChange={(value) => setSelectedTimeRange(value as number)}
                size="sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                Base Chain
                {recommendedBaseChain && selectedBaseChain === recommendedBaseChain && (
                  <span className="text-xs font-normal text-blue-600">(Recommended)</span>
                )}
              </label>
              <DropdownSelect
                options={baseChainOptions.map((option) => ({
                  ...option,
                  label:
                    option.value === recommendedBaseChain
                      ? `${option.label} (Recommended)`
                      : option.label,
                }))}
                value={selectedBaseChain ?? ''}
                onChange={(value) => {
                  if (isBlockchain(value)) {
                    setSelectedBaseChain(value);
                  } else if (value === '') {
                    setSelectedBaseChain(null);
                  }
                }}
                className="w-full"
              />
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              Visible Chains
              <span className="ml-1 text-gray-400">
                ({visibleChains.length}/{supportedChains.length})
              </span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {supportedChains.map((chain) => {
                const isVisible = visibleChains.includes(chain);
                return (
                  <button
                    key={chain}
                    onClick={() => toggleChain(chain)}
                    className={`px-2 py-1 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 rounded-md ${
                      isVisible
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isVisible ? 'white' : chainColors[chain],
                      }}
                    />
                    {chainNames[chain]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              Technical Indicators
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMA}
                  onChange={(e) => setShowMA(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Moving Average</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">MA Period:</label>
                <DropdownSelect
                  options={maPeriodOptions}
                  value={maPeriod}
                  onChange={(value) => setMaPeriod(value as number)}
                  disabled={!showMA}
                  className="w-20"
                />
              </div>
              <button
                onClick={() => {
                  setShowMA(false);
                  setMaPeriod(7);
                  setChartKey(chartKey + 1);
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-md transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
              >
                Reset Chart
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              Anomaly Detection Config
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Threshold Type
                </label>
                <DropdownSelect
                  options={thresholdTypeOptions}
                  value={thresholdConfig.type}
                  onChange={(value) =>
                    setThresholdConfig({
                      ...thresholdConfig,
                      type: value as ThresholdType,
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Fixed Threshold %
                  </label>
                  <input
                    type="number"
                    value={thresholdConfig.fixedThreshold}
                    onChange={(e) =>
                      setThresholdConfig({
                        ...thresholdConfig,
                        fixedThreshold: Number(e.target.value),
                      })
                    }
                    step={0.1}
                    min={0.1}
                    max={10}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Volatility Multiplier
                  </label>
                  <input
                    type="number"
                    value={thresholdConfig.atrMultiplier}
                    onChange={(e) =>
                      setThresholdConfig({
                        ...thresholdConfig,
                        atrMultiplier: Number(e.target.value),
                      })
                    }
                    step={0.5}
                    min={0.5}
                    max={5}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Calculation Period
                </label>
                <DropdownSelect
                  options={calculationPeriodOptions}
                  value={thresholdConfig.volatilityWindow}
                  onChange={(value) =>
                    setThresholdConfig({
                      ...thresholdConfig,
                      volatilityWindow: value as number,
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                {thresholdConfig.type === 'fixed' &&
                  'Fixed threshold for detecting price anomalies'}
                {thresholdConfig.type === 'dynamic' &&
                  'Dynamic threshold based on price volatility'}
                {thresholdConfig.type === 'atr' && 'ATR-based threshold for adaptive detection'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
