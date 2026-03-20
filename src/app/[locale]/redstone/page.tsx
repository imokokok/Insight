'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RedStoneClient } from '@/lib/oracles/redstone';
import type { RedStoneProviderInfo, RedStoneMetrics } from '@/lib/oracles/redstone';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  StatGrid,
  StatGridItem,
  TabNavigation,
  LoadingState,
  ErrorFallback,
} from '@/components/oracle';
import { RedStoneRiskAssessmentPanel } from '@/components/oracle/panels/RedStoneRiskAssessmentPanel';
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useRedStoneAllData } from '@/hooks/useRedStoneData';
import { useQuery } from '@tanstack/react-query';
import { SegmentedControl, DropdownSelect, MultiSelect } from '@/components/ui/selectors';

type SortOption = 'reputation' | 'dataPoints' | 'lastUpdate';
type FilterOption = 'all' | 'highReputation' | 'mostData';

const redstoneClient = new RedStoneClient();

const SUPPORTED_CHAINS = [
  { chain: Blockchain.ETHEREUM, latency: 80, updateFreq: 60, status: 'active' },
  { chain: Blockchain.ARBITRUM, latency: 65, updateFreq: 30, status: 'active' },
  { chain: Blockchain.OPTIMISM, latency: 70, updateFreq: 30, status: 'active' },
  { chain: Blockchain.POLYGON, latency: 75, updateFreq: 45, status: 'active' },
  { chain: Blockchain.AVALANCHE, latency: 85, updateFreq: 60, status: 'active' },
  { chain: Blockchain.BASE, latency: 60, updateFreq: 30, status: 'active' },
  { chain: Blockchain.BNB_CHAIN, latency: 90, updateFreq: 60, status: 'active' },
  { chain: Blockchain.FANTOM, latency: 95, updateFreq: 60, status: 'active' },
  { chain: Blockchain.LINEA, latency: 70, updateFreq: 45, status: 'active' },
  { chain: Blockchain.MANTLE, latency: 75, updateFreq: 45, status: 'active' },
  { chain: Blockchain.SCROLL, latency: 80, updateFreq: 60, status: 'active' },
  { chain: Blockchain.ZKSYNC, latency: 72, updateFreq: 45, status: 'active' },
];

const ECOSYSTEM_INTEGRATIONS = [
  { name: 'Arweave', description: 'Permanent data storage', category: 'infrastructure' },
  { name: 'Ethereum', description: 'Smart contract platform', category: 'infrastructure' },
  { name: 'Avalanche', description: 'High-throughput blockchain', category: 'infrastructure' },
  { name: 'Aave', description: 'Decentralized lending protocol', category: 'defi' },
  { name: 'Compound', description: 'Algorithmic money markets', category: 'defi' },
  { name: 'Uniswap', description: 'Decentralized exchange', category: 'defi' },
  { name: 'GMX', description: 'Decentralized perpetual exchange', category: 'defi' },
  { name: 'Pendle', description: 'Yield tokenization protocol', category: 'defi' },
  { name: 'Stargate', description: 'Cross-chain liquidity transport', category: 'defi' },
  { name: 'Radiant', description: 'Cross-chain lending protocol', category: 'defi' },
  { name: 'OpenSea', description: 'NFT marketplace', category: 'nft' },
  { name: 'Blur', description: 'NFT marketplace for pro traders', category: 'nft' },
];

function useRedStoneProviders() {
  return useQuery<RedStoneProviderInfo[], Error>({
    queryKey: ['redstone', 'providers'],
    queryFn: () => redstoneClient.getDataProviders(),
    staleTime: 300000,
    gcTime: 600000,
  });
}

function useRedStoneMetrics() {
  return useQuery<RedStoneMetrics, Error>({
    queryKey: ['redstone', 'metrics'],
    queryFn: () => redstoneClient.getRedStoneMetrics(),
    staleTime: 300000,
    gcTime: 600000,
  });
}

export default function RedStonePage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('market');
  const [sortBy, setSortBy] = useState<SortOption>('reputation');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedProvider, setSelectedProvider] = useState<RedStoneProviderInfo | null>(null);

  const config = getOracleConfig(OracleProvider.REDSTONE);
  const client = useMemo(() => new RedStoneClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    ecosystem,
    riskMetrics,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useRedStoneAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { data: providers, isLoading: providersLoading } = useRedStoneProviders();
  const { data: metrics, isLoading: metricsLoading } = useRedStoneMetrics();

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
      ecosystem,
    },
    filename: `redstone-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const activeNodes = networkStats?.activeNodes ?? 25;
    const dataFeeds = networkStats?.dataFeeds ?? 1000;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;
    const avgResponseTime = networkStats?.avgResponseTime ?? 200;

    return [
      {
        title: t('redstone.stats.activeNodes'),
        value: activeNodes > 0 ? `${activeNodes}` : '-',
        change: '+2',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        ),
      },
      {
        title: t('redstone.stats.dataFeeds'),
        value: dataFeeds > 0 ? `${dataFeeds}+` : '-',
        change: '+50',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        ),
      },
      {
        title: t('redstone.stats.avgResponse'),
        value: `${avgResponseTime}ms`,
        change: '-15ms',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
      },
      {
        title: t('redstone.stats.networkUptime'),
        value: `${nodeUptime}%`,
        change: '+0.05%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
    ];
  }, [networkStats, t]);

  const sortedProviders = useMemo(() => {
    if (!providers) return [];
    let filtered = [...providers];

    if (filterBy === 'highReputation') {
      filtered = filtered.filter((p) => p.reputation >= 0.9);
    } else if (filterBy === 'mostData') {
      filtered = filtered.filter((p) => p.dataPoints >= 500000);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation - a.reputation;
        case 'dataPoints':
          return b.dataPoints - a.dataPoints;
        case 'lastUpdate':
          return b.lastUpdate - a.lastUpdate;
        default:
          return 0;
      }
    });
  }, [providers, sortBy, filterBy]);

  const ecosystemByCategory = useMemo(() => {
    const categories: Record<string, typeof ECOSYSTEM_INTEGRATIONS> = {};
    ECOSYSTEM_INTEGRATIONS.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });
    return categories;
  }, []);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-insight rounded-lg">
      <PageHeader
        title={t('redstone.title')}
        subtitle={t('redstone.subtitle')}
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="bg-insight border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            oracleTabs={config.tabs}
            themeColor={config.themeColor}
          />
        </div>
      </div>

      <main className="flex-1 bg-insight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <StatGrid className="mb-6">
            {stats.map((stat, index) => (
              <StatGridItem key={index} {...stat} />
            ))}
          </StatGrid>

          {activeTab === 'market' && (
            <>
              <div className="mb-6">
                <MarketDataPanel
                  client={client}
                  chain={config.defaultChain}
                  config={config.marketData}
                  iconBgColor={config.iconBgColor}
                  icon={config.icon}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title={t('redstone.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('redstone.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('redstone.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('redstone.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('redstone.stats.dataFeeds')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {networkStats?.dataFeeds ?? 1000}+
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {t('redstone.stats.avgResponse')}
                      </span>
                      <span className="text-sm font-semibold text-success-600">
                        {networkStats?.avgResponseTime ?? 200}ms
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </>
          )}

          {activeTab === 'network' && (
            <div className="space-y-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-6">
              {/* Stats Cards - Clean Finance Style */}
              <StatGrid>
                <StatGridItem
                  title={t('redstone.providers.dataSources')}
                  value={String(providers?.length || 4)}
                  change="+1"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.providers.updateFrequency')}
                  value="~60s"
                  change="-5s"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.providers.dataQuality')}
                  value="99.8%"
                  change="+0.1%"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.dataStreams.avgReputation')}
                  value={`${
                    metrics?.avgProviderReputation
                      ? (metrics.avgProviderReputation * 100).toFixed(1)
                      : '93.5'
                  }%`}
                  change="+0.5%"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  }
                />
              </StatGrid>

              {/* Controls */}
              <DashboardCard title={t('redstone.providers.title')}>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t('redstone.providers.sortBy')}:</span>
                    <SegmentedControl
                      options={[
                        { value: 'reputation', label: t('redstone.providers.reputation') },
                        { value: 'dataPoints', label: t('redstone.providers.dataPoints') },
                        { value: 'lastUpdate', label: t('redstone.providers.lastUpdate') },
                      ]}
                      value={sortBy}
                      onChange={(value) => setSortBy(value as SortOption)}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t('redstone.providers.filter')}:</span>
                    <SegmentedControl
                      options={[
                        { value: 'all', label: t('redstone.providers.all') },
                        { value: 'highReputation', label: t('redstone.providers.highReputation') },
                        { value: 'mostData', label: t('redstone.providers.mostData') },
                      ]}
                      value={filterBy}
                      onChange={(value) => setFilterBy(value as FilterOption)}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Providers List - Clean Finance Style */}
                <div className="border border-gray-200 divide-y divide-gray-200 rounded-lg">
                  {providersLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      {t('redstone.providers.loading')}
                    </div>
                  ) : (
                    sortedProviders.map((provider, index) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-400 w-6">
                            #{index + 1}
                          </span>
                          <div>
                            <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                            <p className="text-xs text-gray-500">
                              {t('redstone.providers.dataPoints')}:{' '}
                              {provider.dataPoints.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-900">
                                {(provider.reputation * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-gray-500">
                                {t('redstone.providers.reputation')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {new Date(provider.lastUpdate).toLocaleTimeString()}
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashboardCard>

              {/* Provider Detail Modal */}
              {selectedProvider && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-md w-full p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{selectedProvider.name}</h3>
                      <button
                        onClick={() => setSelectedProvider(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{t('redstone.providers.reputation')}</span>
                        <span className="font-semibold">
                          {(selectedProvider.reputation * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{t('redstone.providers.dataPoints')}</span>
                        <span className="font-semibold">
                          {selectedProvider.dataPoints.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{t('redstone.providers.lastUpdate')}</span>
                        <span className="font-semibold">
                          {new Date(selectedProvider.lastUpdate).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">ID</span>
                        <span className="font-mono text-sm">{selectedProvider.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'data-streams' && (
            <div className="space-y-6">
              {/* Data Stream Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {t('redstone.dataStreams.streamCount')}
                  </h4>
                  <p className="text-2xl font-bold text-danger-600 mt-2">1,250+</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('redstone.dataStreams.activeDataStreams')}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {t('redstone.dataStreams.freshnessScore')}
                  </h4>
                  <p className="text-2xl font-bold text-success-600 mt-2">
                    {metrics?.dataFreshnessScore ? metrics.dataFreshnessScore.toFixed(1) : '98.5'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{t('redstone.dataStreams.outOf100')}</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {t('redstone.dataStreams.modularFee')}
                  </h4>
                  <p className="text-2xl font-bold text-primary-600 mt-2">
                    {metrics?.modularFee ? (metrics.modularFee * 100).toFixed(3) : '0.015'}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('redstone.dataStreams.perUpdate')}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {t('redstone.dataStreams.providerCount')}
                  </h4>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {metrics?.providerCount || 18}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('redstone.dataStreams.activeProviders')}
                  </p>
                </div>
              </div>

              {/* Data Stream Details */}
              <DashboardCard title={t('redstone.dataStreams.title')}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {t('redstone.dataStreams.streamTypes')}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t('redstone.dataStreams.priceFeeds')}
                          </span>
                          <span className="text-sm font-medium">1,000+</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t('redstone.dataStreams.customData')}
                          </span>
                          <span className="text-sm font-medium">150+</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t('redstone.dataStreams.l2Data')}
                          </span>
                          <span className="text-sm font-medium">100+</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {t('redstone.dataStreams.updateFrequencyTitle')}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t('redstone.dataStreams.highFrequency')}
                          </span>
                          <span className="text-sm font-medium">~10s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t('redstone.dataStreams.standard')}
                          </span>
                          <span className="text-sm font-medium">~60s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t('redstone.dataStreams.lowFrequency')}
                          </span>
                          <span className="text-sm font-medium">~300s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'cross-chain' && (
            <div className="space-y-6">
              {/* Cross Chain Stats - Clean Finance Style */}
              <StatGrid>
                <StatGridItem
                  title={t('redstone.crossChain.supportedChains')}
                  value={String(SUPPORTED_CHAINS.length)}
                  change="+2"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.stats.avgResponse')}
                  value="75ms"
                  change="-5ms"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.crossChain.fastestChain')}
                  value="Base"
                  change="60ms"
                  changeType="neutral"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.crossChain.uptime')}
                  value="99.9%"
                  change="+0.01%"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
              </StatGrid>

              {/* Chain List - Clean Finance Style */}
              <DashboardCard title={t('redstone.crossChain.chainList')}>
                <div className="border border-gray-200 divide-y divide-gray-200 rounded-lg">
                  {SUPPORTED_CHAINS.map((chain, index) => (
                    <div
                      key={chain.chain}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-400 w-6">#{index + 1}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{chain.chain}</h4>
                          <p className="text-xs text-gray-500">
                            {t('redstone.crossChain.updateFrequency')}: {chain.updateFreq}s
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-900">
                              {chain.latency}ms
                            </span>
                            <span className="text-xs text-gray-500">
                              {t('redstone.crossChain.latency')}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs border rounded-md ${
                            chain.status === 'active'
                              ? 'border-green-200 text-success-700 bg-success-50'
                              : 'border-gray-200 text-gray-600 bg-gray-50'
                          }`}
                        >
                          {chain.status === 'active'
                            ? t('redstone.crossChain.active')
                            : t('redstone.crossChain.inactive')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'ecosystem' && (
            <div className="space-y-6">
              {/* Ecosystem Stats - Clean Finance Style */}
              <StatGrid>
                <StatGridItem
                  title={t('redstone.ecosystem.integrations')}
                  value={`${ECOSYSTEM_INTEGRATIONS.length}+`}
                  change="+3"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.ecosystem.defiProtocols')}
                  value={String(ecosystemByCategory.defi?.length || 6)}
                  change="+1"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.ecosystem.categories.infrastructure')}
                  value={String(ecosystemByCategory.infrastructure?.length || 3)}
                  change="+1"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  }
                />
                <StatGridItem
                  title={t('redstone.ecosystem.nftAndGaming')}
                  value={String(
                    (ecosystemByCategory.nft?.length || 2) +
                      (ecosystemByCategory.gaming?.length || 0)
                  )}
                  change="+1"
                  changeType="positive"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
              </StatGrid>

              {/* Categorized Integrations - Clean Finance Style */}
              {Object.entries(ecosystemByCategory).map(([category, items]) => (
                <DashboardCard
                  key={category}
                  title={t(`redstone.ecosystem.categories.${category}`)}
                >
                  <div className="border border-gray-200 divide-y divide-gray-200 rounded-lg">
                    {items.map((integration, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                          <p className="text-sm text-gray-600 mt-0.5">{integration.description}</p>
                        </div>
                        <span className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 bg-gray-50">
                          {t(`redstone.ecosystem.categories.${integration.category}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                </DashboardCard>
              ))}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <RedStoneRiskAssessmentPanel />
            </div>
          )}

          {activeTab === 'cross-oracle' && (
            <div className="space-y-6">
              <DashboardCard title={t('redstone.crossOracle.title')}>
                <CrossOracleComparison />
              </DashboardCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
