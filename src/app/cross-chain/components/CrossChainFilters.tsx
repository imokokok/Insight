'use client';

import { useI18n } from '@/lib/i18n/provider';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { TIME_RANGES, providerNames, chainNames, symbols } from '../constants';
import { useCrossChainData } from '../useCrossChainData';
import { useCrossChainStore } from '@/stores/crossChainStore';
import { ThresholdType } from '../utils';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';

interface CrossChainFiltersProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CrossChainFilters({ data }: CrossChainFiltersProps) {
  const { t } = useI18n();
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

  const refreshOptions = [
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
    [Blockchain.ETHEREUM]: '#6366F1',
    [Blockchain.ARBITRUM]: '#06B6D4',
    [Blockchain.OPTIMISM]: '#EF4444',
    [Blockchain.POLYGON]: '#A855F7',
    [Blockchain.SOLANA]: '#10B981',
    [Blockchain.AVALANCHE]: '#E84133',
    [Blockchain.FANTOM]: '#1969FF',
    [Blockchain.CRONOS]: '#002D74',
    [Blockchain.JUNO]: '#DC1FFF',
    [Blockchain.COSMOS]: '#2E3148',
    [Blockchain.OSMOSIS]: '#FAAB3B',
    [Blockchain.BNB_CHAIN]: '#F3BA2F',
    [Blockchain.BASE]: '#0052FF',
    [Blockchain.SCROLL]: '#EEDFF0',
    [Blockchain.ZKSYNC]: '#8C8DFC',
    [Blockchain.APTOS]: '#4CD7D0',
    [Blockchain.SUI]: '#6FBCF0',
    [Blockchain.GNOSIS]: '#04795B',
    [Blockchain.MANTLE]: '#000000',
    [Blockchain.LINEA]: '#000000',
    [Blockchain.CELESTIA]: '#2B2B2B',
    [Blockchain.INJECTIVE]: '#00F2FE',
    [Blockchain.SEI]: '#B100CD',
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('crossChain.oracleProvider')}
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as OracleProvider)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[140px]"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('crossChain.symbol')}
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[100px]"
          >
            {symbolOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('crossChain.timeRange')}
          </label>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  selectedTimeRange === range.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-2">
            {t('crossChain.baseChain')}
            {recommendedBaseChain && selectedBaseChain === recommendedBaseChain && (
              <span className="text-xs text-blue-500 font-normal">
                ({t('crossChain.recommended')})
              </span>
            )}
          </label>
          <select
            value={selectedBaseChain || ''}
            onChange={(e) => setSelectedBaseChain(e.target.value as Blockchain)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[140px]"
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

      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">{t('crossChain.visibleChains')}</h3>
        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain) => {
            const isVisible = visibleChains.includes(chain);
            return (
              <button
                key={chain}
                onClick={() => toggleChain(chain)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                  isVisible
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isVisible ? 'white' : chainColors[chain] }}
                />
                {chainNames[chain]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {t('crossChain.technicalIndicators')}
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA}
                onChange={(e) => setShowMA(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('crossChain.showMA')}</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              {t('crossChain.maPeriod')}:
            </label>
            <select
              value={maPeriod}
              onChange={(e) => setMaPeriod(Number(e.target.value))}
              disabled={!showMA}
              className="px-3 py-1.5 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('crossChain.resetChart')}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">异常检测阈值配置</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">阈值类型</label>
            <select
              value={thresholdConfig.type}
              onChange={(e) =>
                setThresholdConfig({
                  ...thresholdConfig,
                  type: e.target.value as ThresholdType,
                })
              }
              className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[140px]"
            >
              <option value="fixed">固定阈值</option>
              <option value="dynamic">动态波动率</option>
              <option value="atr">ATR指标</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">固定阈值 (%)</label>
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
              className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 w-24"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">波动率倍数</label>
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
              className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 w-24"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">计算周期</label>
            <select
              value={thresholdConfig.volatilityWindow}
              onChange={(e) =>
                setThresholdConfig({
                  ...thresholdConfig,
                  volatilityWindow: Number(e.target.value),
                })
              }
              className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[100px]"
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 max-w-xs">
            {thresholdConfig.type === 'fixed' && '使用固定百分比作为异常检测阈值'}
            {thresholdConfig.type === 'dynamic' && '基于历史波动率(CV)动态调整阈值'}
            {thresholdConfig.type === 'atr' && '使用ATR(平均真实波幅)指标计算动态阈值'}
          </div>
        </div>
      </div>
    </div>
  );
}
