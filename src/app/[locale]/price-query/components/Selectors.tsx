'use client';

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
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="mb-6">
        <div id="symbol-selector-label" className="flex items-center gap-2 mb-3">
          <Icons.currency />
          <span className="text-sm font-semibold text-gray-700">
            {t('priceQuery.selectors.symbol')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="symbol-selector-label">
          {symbols.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              aria-label={`${t('priceQuery.selectors.symbol')}: ${symbol}`}
              aria-pressed={selectedSymbol === symbol}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                selectedSymbol === symbol
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div id="oracle-selector-label" className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Icons.oracle />
            <span className="text-sm font-semibold text-gray-700">
              {t('priceQuery.selectors.oracle')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedOracles(getOracleProvidersSortedByMarketCap())}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              全选
            </button>
            <button
              onClick={() => setSelectedOracles([])}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              取消全选
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="oracle-selector-label">
          {getOracleProvidersSortedByMarketCap().map((oracle) => {
            const isSelected = selectedOracles.includes(oracle);
            const i18nKey = oracleI18nKeys[oracle];
            return (
              <button
                key={oracle}
                onClick={() => toggleOracle(oracle)}
                aria-label={`${t('priceQuery.selectors.oracle')}: ${t(`navbar.${i18nKey}`)}`}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                  isSelected
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: oracleColors[oracle] }}
                  aria-hidden="true"
                />
                {t(`navbar.${i18nKey}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Icons.blockchain />
            <span className="text-sm font-semibold text-gray-700">
              {t('priceQuery.selectors.blockchain')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const supportedChains = Array.from(supportedChainsBySelectedOracles);
                if (supportedChains.length > 0) {
                  setSelectedChains(supportedChains);
                } else {
                  setSelectedChains(Object.values(Blockchain));
                }
              }}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              全选
            </button>
            <button
              onClick={() => setSelectedChains([])}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              取消全选
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  !isSupported
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                    : isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: chainColors[chain] }}
                />
                {t(`blockchain.${chain.toLowerCase()}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Icons.clock />
            <span className="text-sm font-semibold text-gray-700 mr-2">
              {t('priceQuery.selectors.timeRange')}
            </span>
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedTimeRange === range.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t(`priceQuery.timeRanges.${range.key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 对比模式控制 */}
        <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            {/* 对比模式切换 */}
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode?.(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">对比模式</span>
            </label>

            {/* 显示基准线 */}
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBaseline}
                onChange={(e) => setShowBaseline?.(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">显示基准线</span>
            </label>
          </div>

          {/* 对比时间范围选择 */}
          {compareMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">对比时间:</span>
              <div className="flex gap-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={`compare-${range.value}`}
                    onClick={() => setCompareTimeRange?.(range.value)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      compareTimeRange === range.value
                        ? 'bg-blue-600 text-white'
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
      </div>

      <div className="flex justify-end">
        <button
          onClick={onQuery}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Icons.refresh />
          )}
          {loading ? t('priceQuery.loading') : t('priceQuery.query')}
        </button>
      </div>
    </div>
  );
}
