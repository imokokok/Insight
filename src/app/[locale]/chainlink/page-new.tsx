'use client';

import { OracleProvider } from '@/types/oracle';
import { OraclePageTemplate, OracleViewProps } from '@/components/oracle/shared/OraclePageTemplateNew';
import { useOraclePage } from '@/hooks/oracles/useOraclePage';
import { ChainlinkHero } from './components/ChainlinkHero';
import { ChainlinkSidebar } from './components/ChainlinkSidebar';
import { ChainlinkMarketView } from './components/ChainlinkMarketView';
import { ChainlinkNetworkView } from './components/ChainlinkNetworkView';
import { ChainlinkNodesView } from './components/ChainlinkNodesView';
import { ChainlinkDataFeedsView } from './components/ChainlinkDataFeedsView';
import { ChainlinkServicesView } from './components/ChainlinkServicesView';
import { ChainlinkEcosystemView } from './components/ChainlinkEcosystemView';
import { ChainlinkRiskView } from './components/ChainlinkRiskView';

const views = [
  {
    id: 'market',
    labelKey: 'chainlink.menu.marketData',
    component: ({ config, data, isLoading }: OracleViewProps) => (
      <ChainlinkMarketView
        config={config}
        price={data.price ?? null}
        historicalData={data.historicalData ?? []}
        isLoading={isLoading}
      />
    ),
    default: true,
  },
  {
    id: 'network',
    labelKey: 'chainlink.menu.networkHealth',
    component: ({ config, data, isLoading }: OracleViewProps) => (
      <ChainlinkNetworkView
        config={config}
        networkStats={data.networkStats ?? null}
        isLoading={isLoading}
      />
    ),
  },
  {
    id: 'nodes',
    labelKey: 'chainlink.menu.nodes',
    component: () => <ChainlinkNodesView />,
  },
  {
    id: 'data-feeds',
    labelKey: 'chainlink.menu.dataFeeds',
    component: () => <ChainlinkDataFeedsView />,
  },
  {
    id: 'services',
    labelKey: 'chainlink.menu.services',
    component: () => <ChainlinkServicesView />,
  },
  {
    id: 'ecosystem',
    labelKey: 'chainlink.menu.ecosystem',
    component: () => <ChainlinkEcosystemView />,
  },
  {
    id: 'risk',
    labelKey: 'chainlink.menu.riskAssessment',
    component: () => <ChainlinkRiskView />,
  },
];

export default function ChainlinkPageNew() {
  const {
    activeTab,
    setActiveTab,
    config,
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    exportData,
  } = useOraclePage({
    provider: OracleProvider.CHAINLINK,
  });

  return (
    <OraclePageTemplate
      provider={OracleProvider.CHAINLINK}
      hero={{ component: ChainlinkHero }}
      sidebar={{ component: ChainlinkSidebar }}
      views={views}
      data={{
        price,
        historicalData,
        networkStats,
      }}
      state={{
        isLoading,
        isError,
        error,
        isRefreshing,
        lastUpdated,
      }}
      actions={{
        refresh,
        exportData,
      }}
    />
  );
}
