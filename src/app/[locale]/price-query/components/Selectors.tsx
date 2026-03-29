'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';

import { SegmentedControl, MultiSelect, type SelectorOption } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { type OracleProvider, type Blockchain, BLOCKCHAIN_VALUES } from '@/lib/oracles';

import { symbols, oracleColors, chainColors, TIME_RANGES, oracleI18nKeys } from '../constants';

interface SelectorsProps {
  selectedOracles: OracleProvider[];
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  selectedChains: Blockchain[];
  setSelectedChains: (chains: Blockchain[]) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  isLoading: boolean;
  onQuery: () => void;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  isCompareMode?: boolean;
  setIsCompareMode?: (mode: boolean) => void;
  compareTimeRange?: number;
  setCompareTimeRange?: (timeRange: number) => void;
  showBaseline?: boolean;
  setShowBaseline?: (show: boolean) => void;
}

/**
 * 查询选择器组件
 *
 * @param props - 组件属性
 * @returns 选择器面板 JSX 元素
 */
export function Selectors({
  selectedOracles,
  setSelectedOracles,
  selectedChains,
  setSelectedChains,
  selectedSymbol,
  setSelectedSymbol,
  selectedTimeRange,
  setSelectedTimeRange,
  isLoading,
  onQuery,
  supportedChainsBySelectedOracles,
  isCompareMode = false,
  setIsCompareMode,
  compareTimeRange = 24,
  setCompareTimeRange,
  showBaseline = false,
  setShowBaseline,
}: SelectorsProps) {
  const t = useTranslations();
  const [showAdvanced, setShowAdvanced] = useState(true);

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

  // 只显示被选中预言机支持的链（如果选择了预言机）
  const supportedChains =
    selectedOracles.length > 0
      ? BLOCKCHAIN_VALUES.filter((chain) => supportedChainsBySelectedOracles.has(chain))
      : BLOCKCHAIN_VALUES;

  const chainOptions: SelectorOption<Blockchain>[] = supportedChains.map((chain) => ({
    value: chain,
    label: t(`blockchain.${chain.toLowerCase()}`),
    color: chainColors[chain],
    icon: (
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chainColors[chain] }} />
    ),
  }));

  const timeRangeOptions: SelectorOption<number>[] = TIME_RANGES.map((range) => ({
    value: range.value,
    label: t(`priceQuery.timeRanges.${range.key}`),
  }));

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      role="region"
      aria-label={t('priceQuery.selectors.panelLabel')}
    >
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" aria-hidden="true" />
          {t('priceQuery.title')}
        </h2>
        <button
          onClick={onQuery}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? t('priceQuery.loading') : t('priceQuery.query')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isLoading ? (
            <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
          )}
          {isLoading ? t('priceQuery.loading') : t('priceQuery.query')}
        </button>
      </div>

      <div className="p-4">
        <section className="py-3 first:pt-0" aria-labelledby="symbol-label">
          <SegmentedControl
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            label={t('priceQuery.selectors.symbol')}
            aria-label={t('priceQuery.selectors.symbolLabel')}
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="oracle-label">
          <MultiSelect
            options={oracleOptions}
            value={selectedOracles}
            onChange={(values) => setSelectedOracles(values as OracleProvider[])}
            label={t('priceQuery.selectors.oracle')}
            aria-label={t('priceQuery.selectors.oracleLabel')}
            showSelectAll
            selectAllLabel={t('priceQuery.selectors.selectAll')}
            deselectAllLabel={t('priceQuery.selectors.deselectAll')}
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="blockchain-label">
          <MultiSelect
            options={chainOptions}
            value={selectedChains}
            onChange={(values) => setSelectedChains(values as Blockchain[])}
            label={t('priceQuery.selectors.blockchain')}
            aria-label={t('priceQuery.selectors.blockchainLabel')}
            showSelectAll
            selectAllLabel={t('priceQuery.selectors.selectAll')}
            deselectAllLabel={t('priceQuery.selectors.deselectAll')}
            maxVisible={20}
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="timerange-label">
          <SegmentedControl
            options={timeRangeOptions}
            value={selectedTimeRange}
            onChange={(value) => setSelectedTimeRange(value as number)}
            label={t('priceQuery.selectors.timeRange')}
            aria-label={t('priceQuery.selectors.timeRangeLabel')}
          />
        </section>

        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors py-2 px-3 rounded-md hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-expanded={showAdvanced}
            aria-controls="advanced-options-panel"
            id="advanced-options-toggle"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {t('priceQuery.selectors.advancedOptions')}
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
            )}
          </button>

          <div
            id="advanced-options-panel"
            role="region"
            aria-labelledby="advanced-options-toggle"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvanced ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
          >
            <div className="space-y-2 p-3 bg-gray-50/50 rounded-lg border border-gray-100">
              <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={isCompareMode}
                  onChange={(e) => setIsCompareMode?.(e.target.checked)}
                  aria-describedby="compare-mode-desc"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t('priceQuery.selectors.compareMode')}
                </span>
              </label>
              <span id="compare-mode-desc" className="sr-only">
                {t('priceQuery.selectors.compareModeDesc')}
              </span>

              <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={showBaseline}
                  onChange={(e) => setShowBaseline?.(e.target.checked)}
                  aria-describedby="baseline-desc"
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t('priceQuery.selectors.showBaseline')}
                </span>
              </label>
              <span id="baseline-desc" className="sr-only">
                {t('priceQuery.selectors.baselineDesc')}
              </span>

              {isCompareMode && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <SegmentedControl
                    options={timeRangeOptions}
                    value={compareTimeRange}
                    onChange={(value) => setCompareTimeRange?.(value as number)}
                    label={t('priceQuery.selectors.compareTime')}
                    aria-label={t('priceQuery.selectors.compareTimeLabel')}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
