'use client';

/**
 * @fileoverview 查询选择器组件
 * @description 包含资产、预言机、区块链和时间范围选择器
 */

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import { OracleProvider, Blockchain, BLOCKCHAIN_VALUES } from '@/lib/oracles';
import { symbols, oracleColors, chainColors, TIME_RANGES, oracleI18nKeys } from '../constants';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { SegmentedControl, MultiSelect, SelectorOption } from '@/components/ui';

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

  // 只显示被选中预言机支持的链（如果选择了预言机）
  const supportedChains = selectedOracles.length > 0
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 面板头部 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" aria-hidden="true" />
          {t('priceQuery.title')}
        </h2>
        <button
          onClick={onQuery}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm"
        >
          {isLoading ? (
            <div
              className="w-3 h-3 border-2 border-white border-t-transparent animate-spin"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
          )}
          {isLoading ? t('priceQuery.loading') : t('priceQuery.query')}
        </button>
      </div>

      {/* 选择器内容 */}
      <div className="p-4 space-y-4">
        {/* 资产选择 */}
        <section className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <SegmentedControl
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            label={t('priceQuery.selectors.symbol')}
          />
        </section>

        {/* 预言机选择 */}
        <section className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <MultiSelect
            options={oracleOptions}
            value={selectedOracles}
            onChange={(values) => setSelectedOracles(values as OracleProvider[])}
            label={t('priceQuery.selectors.oracle')}
            showSelectAll
            selectAllLabel={t('priceQuery.selectors.selectAll')}
            deselectAllLabel={t('priceQuery.selectors.deselectAll')}
          />
        </section>

        {/* 区块链选择 */}
        <section className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
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
        </section>

        {/* 时间范围选择 */}
        <section className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
          <SegmentedControl
            options={timeRangeOptions}
            value={selectedTimeRange}
            onChange={(value) => setSelectedTimeRange(value as number)}
            label={t('priceQuery.selectors.timeRange')}
          />
        </section>

        {/* 高级选项 */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors py-2 px-3 rounded-md hover:bg-gray-50/80"
            aria-expanded={showAdvanced}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {t('priceQuery.selectors.advancedOptions')}
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-2 p-3 bg-gray-50/80 rounded-lg border border-gray-100 animate-in slide-in-from-top-1 duration-200">
              {/* 对比模式 */}
              <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={isCompareMode}
                  onChange={(e) => setIsCompareMode?.(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t('priceQuery.selectors.compareMode')}
                </span>
              </label>

              {/* 显示基准线 */}
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
              {isCompareMode && (
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
