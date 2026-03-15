'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { ChainlinkClient } from '@/lib/oracles/chainlink';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  TabNavigation,
  LoadingState,
  ErrorFallback,
} from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useChainlinkAllData } from '@/hooks/useChainlinkData';

export default function ChainlinkPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.CHAINLINK);
  const client = useMemo(() => new ChainlinkClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useChainlinkAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
    },
    filename: `chainlink-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const activeNodes = networkStats?.activeNodes ?? 1847;
    const dataFeeds = networkStats?.dataFeeds ?? 1243;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;
    const totalValueSecured = config.marketData.marketCap;

    return [
      {
        title: t('chainlink.stats.decentralizedNodes'),
        value: activeNodes > 0 ? `${activeNodes.toLocaleString()}+` : '-',
        change: '+5%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
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
        changeType: 'neutral' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        ),
      },
      {
        title: t('chainlink.stats.dataFeeds'),
        value: dataFeeds > 0 ? `${dataFeeds.toLocaleString()}+` : '-',
        change: '+12%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        title: t('chainlink.stats.totalValueSecured'),
        value: `$${(totalValueSecured / 1e9).toFixed(1)}B+`,
        change: '+8%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      },
    ];
  }, [networkStats, config, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={t('chainlink.title')}
        subtitle={t('chainlink.subtitle')}
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            oracleTabs={config.tabs}
            themeColor={config.themeColor}
          />
        </div>
      </div>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

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
                <DashboardCard title={t('chainlink.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('chainlink.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('chainlink.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('chainlink.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('chainlink.stats.circulatingSupply')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M LINK
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('chainlink.stats.stakingApr')}</span>
                      <span className="text-sm font-semibold text-green-600">4.32%</span>
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

          {activeTab === 'ecosystem' && (
            <div className="space-y-6">
              <DashboardCard title={t('chainlink.ecosystem.title')}>
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-300 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {t('chainlink.ecosystem.overview')}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto text-sm">
                    {t('chainlink.ecosystem.description', {
                      name: config.name,
                      count: config.supportedChains.length,
                    })}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {config.supportedChains.map((chain, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                      >
                        {chain}
                      </span>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <DashboardCard title={t('chainlink.risk.title')}>
                <p className="text-gray-600">{t('chainlink.risk.description')}</p>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'cross-oracle' && (
            <div className="space-y-6">
              <DashboardCard title={t('chainlink.crossOracle.title')}>
                <p className="text-gray-600">{t('chainlink.crossOracle.description')}</p>
              </DashboardCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
