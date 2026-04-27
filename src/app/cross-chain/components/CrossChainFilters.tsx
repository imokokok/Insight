'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type OracleProvider } from '@/types/oracle';

import { TIME_RANGES, providerNames, chainNames, symbols } from '../constants';
import { useSupportedChains } from '../useCrossChainData';

import { ChainSelector } from './ChainSelector';

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
  const toggleChain = useCrossChainUIStore((s) => s.toggleChain);

  const recommendedBaseChain = useCrossChainDataStore((s) => s.recommendedBaseChain);

  const supportedChains = useSupportedChains();

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

          <ChainSelector
            supportedChains={supportedChains}
            visibleChains={visibleChains}
            onToggleChain={toggleChain}
          />
        </div>
      </div>
    </div>
  );
}
