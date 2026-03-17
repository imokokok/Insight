'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icons } from './Icons';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { symbols, oracleColors, chainColors, TIME_RANGES, oracleI18nKeys } from '../constants';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';

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

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles(
      selectedOracles.includes(oracle)
        ? selectedOracles.filter((o) => o !== oracle)
        : [...selectedOracles, oracle]
    );
  };

  const toggleChain = (chain: Blockchain) => {
    setSelectedChains(
      selectedChains.includes(chain)
        ? selectedChains.filter((c) => c !== chain)
        : [...selectedChains, chain]
    );
  };

  const isChainSupported = (chain: Blockchain): boolean => {
    if (selectedOracles.length === 0) return true;
    return supportedChainsBySelectedOracles.has(chain);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icons.currency className="w-4 h-4 text-gray-600" />
          {t('priceQuery.title')}
        </h2>
        <button
          onClick={onQuery}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg shadow-sm hover:shadow"
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Icons.refresh className="w-3 h-3" />
          )}
          {loading ? t('priceQuery.loading') : t('priceQuery.query')}
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* 交易对选择 */}
        <div className="bg-gray-50/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {t('priceQuery.selectors.symbol')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {symbols.slice(0, 12).map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-3 py-1.5 text-xs font-medium transition-all rounded-md ${
                  selectedSymbol === symbol
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* 预言机选择 */}
        <div className="bg-gray-50/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {t('priceQuery.selectors.oracle')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedOracles(getOracleProvidersSortedByMarketCap())}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-100 transition-colors rounded border border-gray-200"
              >
                {t('priceQuery.selectors.selectAll')}
              </button>
              <button
                onClick={() => setSelectedOracles([])}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-100 transition-colors rounded border border-gray-200"
              >
                {t('priceQuery.selectors.deselectAll')}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getOracleProvidersSortedByMarketCap().map((oracle) => {
              const isSelected = selectedOracles.includes(oracle);
              const i18nKey = oracleI18nKeys[oracle];
              return (
                <button
                  key={oracle}
                  onClick={() => toggleOracle(oracle)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all rounded-md ${
                    isSelected
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : oracleColors[oracle] }}
                  />
                  {t(`navbar.${i18nKey}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 区块链选择 */}
        <div className="bg-gray-50/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {t('priceQuery.selectors.blockchain')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const supportedChains = Array.from(supportedChainsBySelectedOracles);
                  if (supportedChains.length > 0) {
                    setSelectedChains(supportedChains);
                  } else {
                    setSelectedChains(Object.values(Blockchain));
                  }
                }}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-100 transition-colors rounded border border-gray-200"
              >
                {t('priceQuery.selectors.selectAll')}
              </button>
              <button
                onClick={() => setSelectedChains([])}
                className="text-[10px] px-2 py-1 text-gray-600 bg-white hover:bg-gray-100 transition-colors rounded border border-gray-200"
              >
                {t('priceQuery.selectors.deselectAll')}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
            {Object.values(Blockchain).map((chain) => {
              const isSelected = selectedChains.includes(chain);
              const isSupported = isChainSupported(chain);
              return (
                <button
                  key={chain}
                  onClick={() => {
                    if (isSupported) {
                      toggleChain(chain);
                    }
                  }}
                  disabled={!isSupported}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium transition-all rounded-md ${
                    !isSupported
                      ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400'
                      : isSelected
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : chainColors[chain] }}
                  />
                  {t(`blockchain.${chain.toLowerCase()}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 时间范围 */}
        <div className="bg-gray-50/50 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2.5">
            {t('priceQuery.selectors.timeRange')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-all rounded-md ${
                  selectedTimeRange === range.value
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {t(`priceQuery.timeRanges.${range.key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 高级选项折叠面板 */}
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-lg hover:bg-gray-50"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {t('priceQuery.selectors.advancedOptions')}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
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
            <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              {/* 对比模式 */}
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

              {/* 对比时间范围 */}
              {compareMode && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <span className="text-[10px] font-medium text-gray-500 block mb-2">
                    {t('priceQuery.selectors.compareTime')}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={`compare-${range.value}`}
                        onClick={() => setCompareTimeRange?.(range.value)}
                        className={`px-2.5 py-1 text-[10px] font-medium transition-all rounded-md ${
                          compareTimeRange === range.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {t(`priceQuery.timeRanges.${range.key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
