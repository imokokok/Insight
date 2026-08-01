'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { TIME_RANGES, providerNames, chainNames, symbols } from '@/lib/constants';
import { getAssetClass, ASSET_CLASS_CATEGORIES } from '@/lib/oracles/constants/supportedSymbols';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type OracleProvider } from '@/types/oracle';

import { useSupportedChains } from '../useCrossChainData';

import { ChainSelector } from './ChainSelector';

export function CrossChainFilters() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { symbols: dynamicSymbols, categories } = useDynamicSymbols();

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

  const symbolOptions = (dynamicSymbols.length > 0 ? dynamicSymbols : symbols).map((symbol) => ({
    value: symbol,
    label: symbol,
    category: categories[symbol] || getAssetClass(symbol),
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
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 text-slate-500"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          aria-expanded={!isCollapsed}
          aria-controls="filters-content"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <div
        id="filters-content"
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
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
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Symbol
              </label>
              <DropdownSelect
                options={symbolOptions}
                value={selectedSymbol}
                onChange={(value) => setSelectedSymbol(value)}
                className="w-full"
                categories={ASSET_CLASS_CATEGORIES}
                defaultCategory="crypto"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
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
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                Base Chain
                {recommendedBaseChain && selectedBaseChain === recommendedBaseChain && (
                  <span className="text-[11px] font-medium text-blue-600">(Recommended)</span>
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

          <div className="border-t border-slate-100" />

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
