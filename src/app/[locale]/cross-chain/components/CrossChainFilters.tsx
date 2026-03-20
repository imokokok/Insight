'use client';

import { useTranslations } from 'next-intl';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { TIME_RANGES, providerNames, chainNames, symbols } from '../constants';
import { useCrossChainData } from '../useCrossChainData';
import { useCrossChainStore } from '@/stores/crossChainStore';
import { ThresholdType } from '../utils';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { baseColors, chainColors as configChainColors } from '@/lib/config/colors';
import { DropdownSelect, SegmentedControl } from '@/components/ui/selectors';

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
          <DropdownSelect
            options={providerOptions}
            value={selectedProvider}
            onChange={(value) => setSelectedProvider(value as OracleProvider)}
            className="min-w-[140px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide"
            style={{ color: baseColors.gray[500] }}
          >
            {t('crossChain.symbol')}
          </label>
          <DropdownSelect
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value)}
            className="min-w-[100px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide"
            style={{ color: baseColors.gray[500] }}
          >
            {t('crossChain.timeRange')}
          </label>
          <SegmentedControl
            options={timeRangeOptions}
            value={selectedTimeRange}
            onChange={(value) => setSelectedTimeRange(value as number)}
            size="sm"
          />
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
          <DropdownSelect
            options={baseChainOptions.map((option) => ({
              ...option,
              label:
                option.value === recommendedBaseChain
                  ? `${option.label} (${t('crossChain.recommended')})`
                  : option.label,
            }))}
            value={selectedBaseChain || ''}
            onChange={(value) => setSelectedBaseChain(value as Blockchain)}
            className="min-w-[140px]"
          />
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
                className="w-4 h-4 rounded-none focus:ring-primary-500"
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
            <DropdownSelect
              options={maPeriodOptions}
              value={maPeriod}
              onChange={(value) => setMaPeriod(value as number)}
              disabled={!showMA}
              className="min-w-[80px]"
            />
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
            <DropdownSelect
              options={thresholdTypeOptions}
              value={thresholdConfig.type}
              onChange={(value) =>
                setThresholdConfig({
                  ...thresholdConfig,
                  type: value as ThresholdType,
                })
              }
              className="min-w-[140px]"
            />
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
            <DropdownSelect
              options={calculationPeriodOptions}
              value={thresholdConfig.volatilityWindow}
              onChange={(value) =>
                setThresholdConfig({
                  ...thresholdConfig,
                  volatilityWindow: value as number,
                })
              }
              className="min-w-[100px]"
            />
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
