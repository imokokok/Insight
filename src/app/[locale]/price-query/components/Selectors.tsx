'use client';

import { useState, useMemo } from 'react';

import { Search, RefreshCw } from 'lucide-react';

import { SegmentedControl, DropdownSelect, type SelectorOption } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { type OracleProvider, type Blockchain, BLOCKCHAIN_VALUES } from '@/lib/oracles';

import { symbols, oracleColors, chainColors, TIME_RANGES, oracleI18nKeys } from '../constants';
import { useOracleSymbols } from '../hooks/useOracleSymbols';

interface SelectorsProps {
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  isLoading: boolean;
  onQuery: () => void;
  supportedChainsBySelectedOracles: Set<Blockchain>;
}

/**
 * 查询选择器组件
 *
 * @param props - 组件属性
 * @returns 选择器面板 JSX 元素
 */
export function Selectors({
  selectedOracle,
  setSelectedOracle,
  selectedChain,
  setSelectedChain,
  selectedSymbol,
  setSelectedSymbol,
  selectedTimeRange,
  setSelectedTimeRange,
  isLoading,
  onQuery,
  supportedChainsBySelectedOracles,
}: SelectorsProps) {
  const t = useTranslations();
  const [_showAdvanced, _setShowAdvanced] = useState(false);

  // 使用 useOracleSymbols Hook 获取预言机相关的币种和链信息
  const {
    supportedSymbols,
    isSymbolSupported,
    getSupportedChainsForSymbol: _getSupportedChainsForSymbol,
    getSymbolsForChain,
  } = useOracleSymbols(selectedOracle ? [selectedOracle] : []);

  // 链选项生成逻辑
  const chainOptions: SelectorOption<Blockchain>[] = useMemo(() => {
    let availableChains: Blockchain[];

    if (!selectedOracle) {
      // 没有选择预言机时，显示所有链
      availableChains = [...BLOCKCHAIN_VALUES];
    } else {
      // 使用选中预言机支持的所有链
      availableChains = BLOCKCHAIN_VALUES.filter((chain) =>
        supportedChainsBySelectedOracles.has(chain)
      );
    }

    return availableChains.map((chain) => ({
      value: chain,
      label: t(`blockchain.${chain.toLowerCase()}`),
      color: chainColors[chain],
      icon: (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: chainColors[chain] }}
        />
      ),
    }));
  }, [selectedOracle, supportedChainsBySelectedOracles, t]);

  // 币种选项生成逻辑：
  // - 当选择了预言机和链时，只显示该链上支持的币种
  // - 当只选择了预言机时，显示该预言机支持的所有币种
  // - 当没有选择预言机时，显示所有币种
  const symbolOptions: SelectorOption<string>[] = useMemo(() => {
    // 如果没有选择预言机，显示所有币种
    if (!selectedOracle) {
      return symbols.slice(0, 12).map((symbol) => ({
        value: symbol,
        label: symbol,
      }));
    }

    // 如果选择了预言机和链，只显示该链支持的币种
    if (selectedChain) {
      const symbolsForChain = getSymbolsForChain(selectedChain);
      return symbolsForChain.map((symbol) => ({
        value: symbol,
        label: symbol,
      }));
    }

    // 如果只选择了预言机，显示该预言机支持的所有币种
    return supportedSymbols.map((symbol) => ({
      value: symbol,
      label: symbol,
    }));
  }, [selectedOracle, selectedChain, supportedSymbols, getSymbolsForChain]);

  // 检查当前选中的币种是否被当前链支持
  const _isCurrentSymbolSupported = useMemo(() => {
    if (!selectedOracle) return true;
    if (selectedChain) {
      return isSymbolSupported(selectedSymbol, selectedChain);
    }
    return isSymbolSupported(selectedSymbol);
  }, [selectedOracle, selectedChain, selectedSymbol, isSymbolSupported]);

  const oracleOptions: SelectorOption<OracleProvider>[] =
    getPriceOracleProvidersSortedByMarketCap().map((oracle) => ({
      value: oracle,
      label: t(`navbar.${oracleI18nKeys[oracle]}`),
      color: oracleColors[oracle],
      icon: (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: oracleColors[oracle] }}
        />
      ),
    }));

  const timeRangeOptions: SelectorOption<number>[] = TIME_RANGES.map((range) => ({
    value: range.value,
    label: t(`priceQuery.timeRanges.${range.key}`),
  }));

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200"
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
        <section className="py-3 first:pt-0" aria-labelledby="oracle-label">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {t('priceQuery.selectors.oracle')}
          </label>
          <DropdownSelect
            options={oracleOptions}
            value={selectedOracle}
            onChange={(value) => {
              const newOracle = value as OracleProvider;
              setSelectedOracle(newOracle);
              // 切换预言机时重置链
              setSelectedChain(null);
              // 币种由 usePriceQueryData 中的 useEffect 自动处理查询
            }}
            placeholder={t('priceQuery.selectors.selectOracle')}
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="blockchain-label">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {t('priceQuery.selectors.blockchain')}
          </label>
          <DropdownSelect
            options={chainOptions}
            value={selectedChain}
            onChange={(value) => {
              const newChain = value as Blockchain;
              setSelectedChain(newChain);
              // 切换链时，如果当前币种在新链上不支持，选择该链的第一个支持的币种
              if (newChain && selectedSymbol && !isSymbolSupported(selectedSymbol, newChain)) {
                const symbolsForNewChain = getSymbolsForChain(newChain);
                if (symbolsForNewChain.length > 0) {
                  setSelectedSymbol(symbolsForNewChain[0]);
                }
              }
            }}
            placeholder={t('priceQuery.selectors.selectBlockchain')}
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="symbol-label">
          <SegmentedControl
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            label={t('priceQuery.selectors.symbol')}
            aria-label={t('priceQuery.selectors.symbolLabel')}
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
      </div>
    </div>
  );
}
