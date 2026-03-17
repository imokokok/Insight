'use client';

import { useTranslations } from 'next-intl';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { TIME_RANGES, providerNames, chainNames, symbols } from '../constants';
import { useCrossChainData } from '../useCrossChainData';
import { useCrossChainStore } from '@/stores/crossChainStore';
import { ThresholdType } from '../utils';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { baseColors, chainColors as configChainColors } from '@/lib/config/colors';

interface CrossChainFiltersProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CrossChainFilters({ data }: CrossChainFiltersProps) {
  const t = useTranslations();
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

  const providerOptions = getOracleProvidersSortedByMarketCap().map((provider) => ({
    value: provider,
    label: providerNames[provider],
  }));

  const symbolOptions = symbols.map((symbol) => ({
    value: symbol,
    label: symbol,
  }));

  const _refreshOptions = [
    { value: 0, label: t('crossChain.autoRefreshOff') },
    { value: 30000, label: t('crossChain.autoRefresh30s') },
    { value: 60000, label: t('crossChain.autoRefresh1m') },
    { value: 300000, label: t('crossChain.autoRefresh5m') },
  ];

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
  };

  return (
    <div>
      <div
        className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b"
        style={{ borderColor: baseColors.gray[200] }}
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide"
            style={{ color: baseColors.gray[500] }}
          >
            {t('crossChain.oracleProvider')}
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as OracleProvider)}
            className="px-3 py-2 text-sm border bg-white focus:outline-none min-w-[140px]"
            style={{ borderColor: baseColors.gray[300] }}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide"
            style={{ color: baseColors.gray[500] }}
          >
            {t('crossChain.symbol')}
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-2 text-sm border bg-white focus:outline-none min-w-[100px]"
            style={{ borderColor: baseColors.gray[300] }}
          >
            {symbolOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide"
            style={{ color: baseColors.gray[500] }}
          >
            {t('crossChain.timeRange')}
          </label>
          <div className="flex items-center p-1" style={{ backgroundColor: baseColors.gray[100] }}>
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedTimeRange === range.value ? 'bg-white border' : ''
                }`}
                style={{
                  color:
                    selectedTimeRange === range.value
                      ? baseColors.primary[600]
                      : baseColors.gray[600],
                  borderColor:
                    selectedTimeRange === range.value ? baseColors.gray[300] : 'transparent',
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide flex items-center gap-2"
            style={{ color: baseColors.gray[500] }}
          >
            {t('crossChain.baseChain')}
            {recommendedBaseChain && selectedBaseChain === recommendedBaseChain && (
              <span className="text-xs font-normal" style={{ color: baseColors.primary[500] }}>
                ({t('crossChain.recommended')})
              </span>
            )}
          </label>
          <select
            value={selectedBaseChain || ''}
            onChange={(e) => setSelectedBaseChain(e.target.value as Blockchain)}
            className="px-3 py-2 text-sm border bg-white focus:outline-none min-w-[140px]"
            style={{ borderColor: baseColors.gray[300] }}
          >
            {baseChainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value === recommendedBaseChain ? ` (${t('crossChain.recommended')})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 pb-6 border-b" style={{ borderColor: baseColors.gray[200] }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[900] }}>
          {t('crossChain.visibleChains')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain) => {
            const isVisible = visibleChains.includes(chain);
            return (
              <button
                key={chain}
                onClick={() => toggleChain(chain)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                  isVisible ? 'text-white' : 'bg-white border hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: isVisible ? baseColors.primary[600] : 'white',
                  borderColor: isVisible ? baseColors.primary[600] : baseColors.gray[300],
                  color: isVisible ? 'white' : baseColors.gray[700],
                }}
              >
                <span
                  className="w-2 h-2"
                  style={{ backgroundColor: isVisible ? baseColors.gray[50] : chainColors[chain] }}
                />
                {chainNames[chain]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 pb-6 border-b" style={{ borderColor: baseColors.gray[200] }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[900] }}>
          {t('crossChain.technicalIndicators')}
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA}
                onChange={(e) => setShowMA(e.target.checked)}
                className="w-4 h-4 rounded-none focus:ring-blue-500"
                style={{ color: baseColors.primary[600], borderColor: baseColors.gray[300] }}
              />
              <span className="text-sm" style={{ color: baseColors.gray[700] }}>
                {t('crossChain.showMA')}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: baseColors.gray[500] }}
            >
              {t('crossChain.maPeriod')}:
            </label>
            <select
              value={maPeriod}
              onChange={(e) => setMaPeriod(Number(e.target.value))}
              disabled={!showMA}
              className="px-3 py-1.5 text-sm border bg-white focus:outline-none min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: baseColors.gray[300] }}
            >
              <option value={7}>7</option>
              <option value={25}>25</option>
              <option value={99}>99</option>
            </select>
          </div>
          <button
            onClick={() => {
              setShowMA(false);
              setMaPeriod(7);
              setChartKey(chartKey + 1);
            }}
            className="px-3 py-1.5 text-sm border transition-colors"
            style={{ borderColor: baseColors.gray[300], color: baseColors.gray[700] }}
          >
            {t('crossChain.resetChart')}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[900] }}>
          {t('crossChain.anomalyDetectionConfig')}
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: baseColors.gray[500] }}
            >
              {t('crossChain.thresholdType')}
            </label>
            <select
              value={thresholdConfig.type}
              onChange={(e) =>
                setThresholdConfig({
                  ...thresholdConfig,
                  type: e.target.value as ThresholdType,
                })
              }
              className="px-3 py-2 text-sm border bg-white focus:outline-none min-w-[140px]"
              style={{ borderColor: baseColors.gray[300] }}
            >
              <option value="fixed">{t('crossChain.fixedThreshold')}</option>
              <option value="dynamic">{t('crossChain.dynamicVolatility')}</option>
              <option value="atr">{t('crossChain.atrIndicator')}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: baseColors.gray[500] }}
            >
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
              className="px-3 py-2 text-sm border bg-white focus:outline-none w-24"
              style={{ borderColor: baseColors.gray[300] }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: baseColors.gray[500] }}
            >
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
              className="px-3 py-2 text-sm border bg-white focus:outline-none w-24"
              style={{ borderColor: baseColors.gray[300] }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-xs uppercase tracking-wide"
              style={{ color: baseColors.gray[500] }}
            >
              {t('crossChain.calculationPeriod')}
            </label>
            <select
              value={thresholdConfig.volatilityWindow}
              onChange={(e) =>
                setThresholdConfig({
                  ...thresholdConfig,
                  volatilityWindow: Number(e.target.value),
                })
              }
              className="px-3 py-2 text-sm border bg-white focus:outline-none min-w-[100px]"
              style={{ borderColor: baseColors.gray[300] }}
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </div>

          <div className="text-xs max-w-xs" style={{ color: baseColors.gray[500] }}>
            {thresholdConfig.type === 'fixed' && t('crossChain.fixedThresholdDesc')}
            {thresholdConfig.type === 'dynamic' && t('crossChain.dynamicThresholdDesc')}
            {thresholdConfig.type === 'atr' && t('crossChain.atrThresholdDesc')}
          </div>
        </div>
      </div>
    </div>
  );
}
