'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icons } from './Icons';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { symbols, oracleColors, chainColors, TIME_RANGES, oracleI18nKeys } from '../constants';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { SegmentedControl, MultiSelect, SelectorOption } from '@/components/ui/selectors';

interface SelectorsProps {
  selectedOracles: OracleProvider[];
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  selectedChains: Blockchain[];
  setSelectedChains: (chains: Blockchain[]) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  loading: boolean;
  onQuery: () => void;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  compareMode?: boolean;
  setCompareMode?: (mode: boolean) => void;
  compareTimeRange?: number;
  setCompareTimeRange?: (timeRange: number) => void;
  showBaseline?: boolean;
  setShowBaseline?: (show: boolean) => void;
}

export function Selectors({
  selectedOracles,
  setSelectedOracles,
  selectedChains,
  setSelectedChains,
  selectedSymbol,
  setSelectedSymbol,
  selectedTimeRange,
  setSelectedTimeRange,
  loading,
  onQuery,
  supportedChainsBySelectedOracles,
  compareMode = false,
  setCompareMode,
  compareTimeRange = 24,
  setCompareTimeRange,
  showBaseline = false,
  setShowBaseline,
}: SelectorsProps) {
  const t = useTranslations();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const symbolOptions: SelectorOption<string>[] = symbols.slice(0, 12).map((symbol) => ({
    value: symbol,
    label: symbol,
  }));

  const oracleOptions: SelectorOption<OracleProvider>[] = getOracleProvidersSortedByMarketCap().map(
    (oracle) => ({
      value: oracle,
      label: t(`navbar.${oracleI18nKeys[oracle]}`),
      color: oracleColors[oracle],
      icon: (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: oracleColors[oracle] }}
        />
      ),
    })
  );

  const chainOptions: SelectorOption<Blockchain>[] = Object.values(Blockchain).map((chain) => ({
    value: chain,
    label: t(`blockchain.${chain.toLowerCase()}`),
    color: chainColors[chain],
    disabled: selectedOracles.length > 0 && !supportedChainsBySelectedOracles.has(chain),
    icon: (
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chainColors[chain] }} />
    ),
  }));

  const timeRangeOptions: SelectorOption<number>[] = TIME_RANGES.map((range) => ({
    value: range.value,
    label: t(`priceQuery.timeRanges.${range.key}`),
  }));

  const handleSelectAllChains = () => {
    const supportedChains = Array.from(supportedChainsBySelectedOracles);
    if (supportedChains.length > 0) {
      setSelectedChains(supportedChains);
    } else {
      setSelectedChains(Object.values(Blockchain));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icons.currency className="w-4 h-4 text-gray-500" />
          {t('priceQuery.title')}
        </h2>
        <button
          onClick={onQuery}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Icons.refresh className="w-3 h-3" />
          )}
          {loading ? t('priceQuery.loading') : t('priceQuery.query')}
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <SegmentedControl
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            label={t('priceQuery.selectors.symbol')}
          />
        </div>

        <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <MultiSelect
            options={oracleOptions}
            value={selectedOracles}
            onChange={(values) => setSelectedOracles(values as OracleProvider[])}
            label={t('priceQuery.selectors.oracle')}
            showSelectAll
            selectAllLabel={t('priceQuery.selectors.selectAll')}
            deselectAllLabel={t('priceQuery.selectors.deselectAll')}
          />
        </div>

        <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <MultiSelect
            options={chainOptions}
            value={selectedChains}
            onChange={(values) => setSelectedChains(values as Blockchain[])}
            label={t('priceQuery.selectors.blockchain')}
            showSelectAll
            selectAllLabel={t('priceQuery.selectors.selectAll')}
            deselectAllLabel={t('priceQuery.selectors.deselectAll')}
            maxVisible={20}
          />
        </div>

        <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <SegmentedControl
            options={timeRangeOptions}
            value={selectedTimeRange}
            onChange={(value) => setSelectedTimeRange(value as number)}
            label={t('priceQuery.selectors.timeRange')}
          />
        </div>

        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors py-2 px-3 rounded-lg hover:bg-gray-50/80"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {t('priceQuery.selectors.advancedOptions')}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-2 p-3 bg-gray-50/80 rounded-lg border border-gray-100 animate-in slide-in-from-top-1 duration-200">
              <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode?.(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t('priceQuery.selectors.compareMode')}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={showBaseline}
                  onChange={(e) => setShowBaseline?.(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t('priceQuery.selectors.showBaseline')}
                </span>
              </label>

              {compareMode && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <SegmentedControl
                    options={timeRangeOptions}
                    value={compareTimeRange}
                    onChange={(value) => setCompareTimeRange?.(value as number)}
                    label={t('priceQuery.selectors.compareTime')}
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
