'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { PythClient } from '@/lib/oracles/pythNetwork';
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
import { usePythAllData } from '@/hooks/usePythData';

export default function PythNetworkPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.PYTH);
  const client = useMemo(() => new PythClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    publishers,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = usePythAllData({
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
    filename: `pyth-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const updateFrequency = networkStats?.updateFrequency ?? 1;
    const publisherCount = publishers?.length ?? 90;
    const crossChainSupport = config.supportedChains.length;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;

    return [
      {
        title: t('pyth.stats.updateFrequency'),
        value: `${updateFrequency}s`,
        change: '+12%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        title: t('pyth.stats.publisherCount'),
        value: `${publisherCount}+`,
        change: '+8%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      {
        title: t('pyth.stats.crossChainSupport'),
        value: `${crossChainSupport}+`,
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
        title: t('pyth.stats.networkUptime'),
        value: `${nodeUptime}%`,
        change: '+0.05%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ];
  }, [networkStats, publishers, config, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-dune">
      <PageHeader
        title={t('pyth.title')}
        subtitle={t('pyth.subtitle')}
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="bg-dune border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            oracleTabs={config.tabs}
            themeColor={config.themeColor}
          />
        </div>
      </div>

      <main className="flex-1 bg-dune">
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
                <DashboardCard title={t('pyth.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('pyth.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('pyth.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('pyth.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('pyth.stats.circulatingSupply')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e9).toFixed(1)}B PYTH
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('pyth.stats.updateFrequency')}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {networkStats?.updateFrequency ?? 1}s
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

          {activeTab === 'publishers' && (
            <div className="space-y-6">
              <DashboardCard title={t('pyth.publishers.title')}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishers?.map((publisher) => (
                    <div key={publisher.id} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900">{publisher.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('pyth.publishers.stake')}: {(publisher.stake / 1e6).toFixed(1)}M PYTH
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('pyth.publishers.accuracy')}: {publisher.accuracy}%
                      </p>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'price-feeds' && (
            <div className="space-y-6">
              <DashboardCard title={t('pyth.priceFeeds.title')}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { category: t('pyth.priceFeeds.categories.crypto'), count: 350, icon: '₿' },
                    { category: t('pyth.priceFeeds.categories.equities'), count: 80, icon: '📈' },
                    { category: t('pyth.priceFeeds.categories.commodities'), count: 45, icon: '🛢️' },
                    { category: t('pyth.priceFeeds.categories.forex'), count: 45, icon: '💱' },
                  ].map((feed) => (
                    <div key={feed.category} className="p-4 bg-gray-50 rounded-lg text-center">
                      <div className="text-2xl mb-2">{feed.icon}</div>
                      <h4 className="font-semibold text-gray-900">{feed.category}</h4>
                      <p className="text-2xl font-bold text-violet-600 mt-1">{feed.count}</p>
                      <p className="text-xs text-gray-500">{t('pyth.priceFeeds.priceFeeds')}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-violet-50 rounded-lg">
                  <p className="text-sm text-violet-800">
                    {t('pyth.priceFeeds.totalDescription', { count: 520 })}
                  </p>
                </div>
              </DashboardCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
