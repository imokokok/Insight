'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { baseColors, chainColors as configChainColors } from '@/lib/config/colors';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { type OracleProvider, Blockchain } from '@/lib/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useCrossChainStore } from '@/stores/crossChainStore';

import { TIME_RANGES, providerNames, chainNames, symbols } from '../constants';
import { type useCrossChainData } from '../useCrossChainData';
import { type ThresholdType } from '../utils';

interface CrossChainFiltersProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CrossChainFilters({ data }: CrossChainFiltersProps) {
  const t = useTranslations();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    selectedProvider,
    setSelectedProvider,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    selectedBaseChain,
    setSelectedBaseChain,
    supportedChains,
    visibleChains,
    toggleChain,
    showMA,
    setShowMA,
    maPeriod,
    setMaPeriod,
    chartKey,
    setChartKey,
    recommendedBaseChain,
  } = data;

  const thresholdConfig = useCrossChainStore((state) => state.thresholdConfig);
  const setThresholdConfig = useCrossChainStore((state) => state.setThresholdConfig);

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

  const chainColors: Record<Blockchain, string> = {
    [Blockchain.ETHEREUM]: configChainColors.ethereum,
    [Blockchain.ARBITRUM]: configChainColors.arbitrum,
    [Blockchain.OPTIMISM]: configChainColors.optimism,
    [Blockchain.POLYGON]: configChainColors.polygon,
    [Blockchain.SOLANA]: configChainColors.solana,
    [Blockchain.AVALANCHE]: configChainColors.avalanche,
    [Blockchain.FANTOM]: configChainColors.fantom,
    [Blockchain.CRONOS]: configChainColors.cronos,
    [Blockchain.JUNO]: configChainColors.juno,
    [Blockchain.COSMOS]: configChainColors.cosmosHub,
    [Blockchain.OSMOSIS]: configChainColors.osmosis,
    [Blockchain.BNB_CHAIN]: configChainColors.bnbChain,
    [Blockchain.BASE]: configChainColors.base,
    [Blockchain.SCROLL]: configChainColors.scroll,
    [Blockchain.ZKSYNC]: configChainColors.zkSync,
    [Blockchain.APTOS]: configChainColors.aptos,
    [Blockchain.SUI]: configChainColors.sui,
    [Blockchain.GNOSIS]: configChainColors.gnosis,
    [Blockchain.MANTLE]: configChainColors.mantle,
    [Blockchain.LINEA]: configChainColors.linea,
    [Blockchain.CELESTIA]: configChainColors.celestia,
    [Blockchain.INJECTIVE]: configChainColors.injective,
    [Blockchain.SEI]: configChainColors.sei,
    [Blockchain.TRON]: configChainColors.tron,
    [Blockchain.TON]: configChainColors.ton,
    [Blockchain.NEAR]: configChainColors.near,
    [Blockchain.AURORA]: configChainColors.aurora,
    [Blockchain.CELO]: configChainColors.celo,
    [Blockchain.STARKNET]: configChainColors.starknet,
    [Blockchain.BLAST]: configChainColors.blast,
    [Blockchain.CARDANO]: configChainColors.cardano,
    [Blockchain.POLKADOT]: configChainColors.polkadot,
    [Blockchain.KAVA]: configChainColors.kava,
    [Blockchain.MOONBEAM]: configChainColors.moonbeam,
    [Blockchain.STARKEX]: configChainColors.starkex,
  };

  const maPeriodOptions = [
    { value: 7, label: '7' },
    { value: 25, label: '25' },
    { value: 99, label: '99' },
  ];

  const thresholdTypeOptions = [
    { value: 'fixed' as ThresholdType, label: t('crossChain.fixedThreshold') },
    { value: 'dynamic' as ThresholdType, label: t('crossChain.dynamicVolatility') },
    { value: 'atr' as ThresholdType, label: t('crossChain.atrIndicator') },
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

  // 计算激活的过滤器数量
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
      {/* Header with Collapse Toggle */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{t('crossChain.filters')}</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md transition-colors hover:bg-gray-200 text-gray-500"
          aria-label={isCollapsed ? t('common.expand') : t('common.collapse')}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="p-4 space-y-4">
          {/* Basic Filters */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('crossChain.oracleProvider')}
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
                {t('crossChain.symbol')}
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
                {t('crossChain.timeRange')}
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
                {t('crossChain.baseChain')}
                {recommendedBaseChain && selectedBaseChain === recommendedBaseChain && (
                  <span className="text-xs font-normal text-blue-600">
                    ({t('crossChain.recommended')})
                  </span>
                )}
              </label>
              <DropdownSelect
                options={baseChainOptions.map((option) => ({
                  ...option,
                  label:
                    option.value === recommendedBaseChain
                      ? `${option.label} (${t('crossChain.recommended')})`
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

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Visible Chains */}
          <div>
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              {t('crossChain.visibleChains')}
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

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Technical Indicators */}
          <div>
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              {t('crossChain.technicalIndicators')}
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMA}
                  onChange={(e) => setShowMA(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('crossChain.showMA')}</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  {t('crossChain.maPeriod')}:
                </label>
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
                {t('crossChain.resetChart')}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Anomaly Detection */}
          <div>
            <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              {t('crossChain.anomalyDetectionConfig')}
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  {t('crossChain.thresholdType')}
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
                    {t('crossChain.fixedThresholdPercent')}
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
                    {t('crossChain.volatilityMultiplier')}
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
                  {t('crossChain.calculationPeriod')}
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
                {thresholdConfig.type === 'fixed' && t('crossChain.fixedThresholdDesc')}
                {thresholdConfig.type === 'dynamic' && t('crossChain.dynamicThresholdDesc')}
                {thresholdConfig.type === 'atr' && t('crossChain.atrThresholdDesc')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrossChainFilters;
