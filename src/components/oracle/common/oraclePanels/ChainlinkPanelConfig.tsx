import { ReactNode } from 'react';
import { PanelConfig, PanelRenderContext } from './types';
import { OracleProvider } from '@/types/oracle';
import { RSIIndicator } from '../../indicators/RSIIndicator';
import { MACDIndicator } from '../../indicators/MACDIndicator';
import { GasFeeTrendChart } from '../../charts/GasFeeTrendChart';
import { LatencyDistributionHistogram } from '@/components/oracle';
import { RiskAssessmentPanel, DataQualityPanel } from '@/components/oracle';

const getStats = (context: PanelRenderContext) => {
  const { config, t } = context;

  return [
    {
      title: t('chainlink.stats.decentralizedNodes'),
      value: `${config.networkData.activeNodes.toLocaleString()}+`,
      change: '+5%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
    },
    {
      title: t('chainlink.stats.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      title: t('chainlink.stats.dataFeeds'),
      value: `${config.networkData.dataFeeds.toLocaleString()}+`,
      change: '+12%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      title: t('chainlink.stats.totalValueSecured'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(1)}B+`,
      change: '+8%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
  ];
};

const getKPIData = (context: PanelRenderContext) => {
  const { config, priceData } = context;

  const price = priceData?.price ?? config.marketData.change24hValue;
  const priceChange24h = config.marketData.change24hValue;
  const priceChangePercent = config.marketData.change24hPercent;
  const updateFrequency = config.networkData.updateFrequency;

  let networkHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (config.networkData.nodeUptime < 95) {
    networkHealth = 'critical';
  } else if (config.networkData.avgResponseTime > 500 || config.networkData.nodeUptime < 99) {
    networkHealth = 'warning';
  }

  const completeness = 95;
  const latencyScore = Math.max(0, 100 - config.networkData.avgResponseTime / 10);
  const sourceScore = Math.min(100, (8 / 10) * 100);
  const dataQualityScore = completeness * 0.4 + latencyScore * 0.3 + sourceScore * 0.3;

  return {
    price,
    priceChange24h,
    priceChangePercent,
    updateFrequency,
    networkHealth,
    dataQualityScore,
  };
};

const getDataQualityData = (context: PanelRenderContext) => {
  const { config } = context;

  return {
    completeness: 95,
    latency: config.networkData.avgResponseTime,
    sourceCount: 8,
  };
};

const getDataSourceCredibilityData = (context: PanelRenderContext) => {
  return [
    {
      id: '1',
      name: 'Binance',
      accuracy: 98,
      responseSpeed: 95,
      consistency: 97,
      availability: 99,
      contribution: 25,
    },
    {
      id: '2',
      name: 'Coinbase',
      accuracy: 97,
      responseSpeed: 94,
      consistency: 96,
      availability: 99,
      contribution: 22,
    },
    {
      id: '3',
      name: 'Kraken',
      accuracy: 96,
      responseSpeed: 93,
      consistency: 95,
      availability: 98,
      contribution: 18,
    },
    {
      id: '4',
      name: 'Huobi',
      accuracy: 95,
      responseSpeed: 92,
      consistency: 94,
      availability: 97,
      contribution: 15,
    },
    {
      id: '5',
      name: 'OKX',
      accuracy: 94,
      responseSpeed: 91,
      consistency: 93,
      availability: 96,
      contribution: 12,
    },
    {
      id: '6',
      name: 'KuCoin',
      accuracy: 93,
      responseSpeed: 90,
      consistency: 92,
      availability: 95,
      contribution: 8,
    },
  ];
};

const renderMarketTab = (context: PanelRenderContext): ReactNode => {
  const { config, historicalData } = context;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <RSIIndicator
        data={historicalData.map((h) => ({
          time: new Date(h.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: h.timestamp,
          price: h.price,
          close: h.price,
        }))}
        period={14}
        height={220}
      />
      <MACDIndicator
        data={historicalData.map((h) => ({
          time: new Date(h.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: h.timestamp,
          price: h.price,
          close: h.price,
        }))}
        fastPeriod={12}
        slowPeriod={26}
        signalPeriod={9}
        height={220}
      />
    </div>
  );
};

const renderNetworkTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  return (
    <>
      <div className="mb-6">
        <GasFeeTrendChart height={280} />
      </div>
      <div className="mb-6">
        <LatencyDistributionHistogram
          data={Array.from({ length: 1000 }, () => Math.random() * 400 + 50)}
          oracleName={config.name}
        />
      </div>
    </>
  );
};

const renderRiskTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  return (
    <>
      <div className="mb-6">
        <RiskAssessmentPanel provider={config.provider} />
      </div>
      <div className="mb-6">
        <DataQualityPanel symbol={config.symbol} basePrice={config.marketData.high24h} />
      </div>
    </>
  );
};

export const chainlinkPanelConfig: PanelConfig = {
  getStats,
  getKPIData,
  getDataQualityData,
  getDataSourceCredibilityData,
  renderMarketTab,
  renderNetworkTab,
  renderRiskTab,
};

export default chainlinkPanelConfig;
