'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { RedStoneClient } from '@/lib/oracles/redstone';
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
import { useRedStoneAllData } from '@/hooks/useRedStoneData';

export default function RedStonePage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('market');

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ];
  }, [networkStats, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={t('redstone.title')}
        subtitle={t('redstone.subtitle')}
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
                      <span className="text-sm text-gray-600">{t('redstone.stats.avgResponse')}</span>
                      <span className="text-sm font-semibold text-green-600">
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

          {activeTab === 'ecosystem' && ecosystem && (
            <div className="space-y-6">
              <DashboardCard title={t('redstone.ecosystem.title')}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ecosystem.integrations?.map((integration, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'risk' && riskMetrics && (
            <div className="space-y-6">
              <DashboardCard title={t('redstone.risk.title')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{t('redstone.risk.centralization')}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${riskMetrics.centralizationRisk}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{riskMetrics.centralizationRisk}%</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{t('redstone.risk.liquidity')}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${riskMetrics.liquidityRisk}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{riskMetrics.liquidityRisk}%</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{t('redstone.risk.technical')}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${riskMetrics.technicalRisk}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{riskMetrics.technicalRisk}%</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{t('redstone.risk.overall')}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${riskMetrics.overallRisk}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{riskMetrics.overallRisk}%</p>
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'cross-oracle' && (
            <div className="space-y-6">
              <DashboardCard title={t('redstone.crossOracle.title')}>
                <p className="text-gray-600">{t('redstone.crossOracle.description')}</p>
              </DashboardCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
