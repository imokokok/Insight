import { type ReactNode } from 'react';

import {
  PriceStream,
  DataQualityScorePanel,
  ConfidenceIntervalChart,
  ConfidenceAlertPanel,
  AccuracyAnalysisPanel,
  UpdateFrequencyHeatmap,
  LatencyTrendChart,
  CrossChainPriceConsistency,
  EcosystemPanel,
} from '@/components/oracle';

import { type PanelConfig, type PanelRenderContext } from './types';

const getStats = (context: PanelRenderContext) => {
  const { config, t } = context;

  return [
    {
      title: t('pythNetwork.stats.updateFrequencyPerSecond'),
      value: '2.5',
      suffix: t('pythNetwork.stats.updatesPerSecond'),
      change: '+12%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: t('pythNetwork.stats.avgConfidenceWidth'),
      value: '0.15',
      suffix: '%',
      change: '-5%',
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
      title: t('pythNetwork.stats.publisherCount'),
      value: '90+',
      change: '+8%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: t('pythNetwork.stats.crossChainSupport'),
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
  ];
};

const renderMarketTab = (context: PanelRenderContext): ReactNode => {
  const { config, priceData } = context;

  const price = priceData?.price ?? config.marketData.change24hValue ?? 0;
  const confidenceInterval = priceData?.confidenceInterval ?? {
    bid: price * 0.999,
    ask: price * 1.001,
    widthPercentage: 0.15,
  };

  return (
    <>
      <div className="mb-6">
        <PriceStream
          symbol={config.symbol}
          initialPrice={config.marketData.change24hValue}
          updateInterval={100}
        />
      </div>
      <div className="mb-6">
        <DataQualityScorePanel symbol={config.symbol} />
      </div>
      <div className="mb-6">
        <ConfidenceIntervalChart
          price={price}
          confidenceInterval={confidenceInterval}
          showTrend={true}
        />
      </div>
      <div className="mb-6">
        <ConfidenceAlertPanel symbol={config.symbol} />
      </div>
      <div className="mb-6">
        <AccuracyAnalysisPanel />
      </div>
    </>
  );
};

const renderNetworkTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  return (
    <>
      <div className="mb-6">
        <UpdateFrequencyHeatmap
          hourlyActivity={config.networkData.hourlyActivity}
          updateFrequency={config.networkData.updateFrequency}
        />
      </div>
      <div className="mb-6">
        <LatencyTrendChart symbol={config.symbol} />
      </div>
      <div className="mb-6">
        <CrossChainPriceConsistency symbol={config.symbol} />
      </div>
    </>
  );
};

const renderEcosystemTab = (context: PanelRenderContext): ReactNode => {
  return (
    <div className="mb-6">
      <EcosystemPanel />
    </div>
  );
};

export const pythPanelConfig: PanelConfig = {
  getStats,
  renderMarketTab,
  renderNetworkTab,
  renderEcosystemTab,
};

export default pythPanelConfig;
