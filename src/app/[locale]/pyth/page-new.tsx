'use client';

import {
  OraclePageTemplate,
  type OracleViewProps,
} from '@/components/oracle/shared/OraclePageTemplateNew';
import { useOraclePage } from '@/hooks/oracles/useOraclePage';
import { OracleProvider } from '@/types/oracle';

import { PythHero } from './components/PythHero';
import { PythMarketView } from './components/PythMarketView';
import { PythNetworkView } from './components/PythNetworkView';
import { PythPriceFeedsView } from './components/PythPriceFeedsView';
import { PythPublishersView } from './components/PythPublishersView';
import { PythRiskView } from './components/PythRiskView';
import { PythSidebar } from './components/PythSidebar';
import { PythValidatorsView } from './components/PythValidatorsView';

const views = [
  {
    id: 'market',
    labelKey: 'pyth.menu.marketData',
    component: ({ config, data, isLoading }: OracleViewProps) => (
      <PythMarketView
        config={config}
        price={data.price ?? null}
        historicalData={data.historicalData ?? []}
        networkStats={data.networkStats ?? null}
        isLoading={isLoading}
      />
    ),
    default: true,
  },
  {
    id: 'network',
    labelKey: 'pyth.menu.networkHealth',
    component: ({ config, data, isLoading }: OracleViewProps) => (
      <PythNetworkView
        config={config}
        networkStats={data.networkStats ?? null}
        isLoading={isLoading}
      />
    ),
  },
  {
    id: 'publishers',
    labelKey: 'pyth.menu.publishers',
    component: ({ data, isLoading }: OracleViewProps) => (
      <PythPublishersView publishers={data.publishers ?? []} isLoading={isLoading} />
    ),
  },
  {
    id: 'validators',
    labelKey: 'pyth.menu.validators',
    component: ({ data, isLoading }: OracleViewProps) => (
      <PythValidatorsView validators={data.validators ?? []} isLoading={isLoading} />
    ),
  },
  {
    id: 'price-feeds',
    labelKey: 'pyth.menu.priceFeeds',
    component: () => <PythPriceFeedsView />,
  },
  {
    id: 'risk',
    labelKey: 'pyth.menu.riskAssessment',
    component: () => <PythRiskView />,
  },
];

export default function PythPageNew() {
  const {
    config,
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    exportData,
  } = useOraclePage({
    provider: OracleProvider.PYTH,
  });

  return (
    <OraclePageTemplate
      provider={OracleProvider.PYTH}
      hero={{ component: PythHero }}
      sidebar={{ component: PythSidebar }}
      views={views}
      data={{
        price,
        historicalData,
        networkStats,
        publishers,
        validators,
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
