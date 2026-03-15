'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { WINkLinkClient } from '@/lib/oracles/winklink';
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
import { WINkLinkTRONEcosystemPanel as WINkLinkTRONIntegrationPanel } from '@/components/oracle/panels/WINkLinkTRONEcosystemPanel';
import { WINkLinkStakingPanel } from '@/components/oracle/panels/WINkLinkStakingPanel';
import { WINkLinkGamingDataPanel as WINkLinkGamingPanel } from '@/components/oracle/panels/WINkLinkGamingDataPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useWINkLinkAllData } from '@/hooks/useWINkLinkData';

export default function WINkLinkPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.WINKLINK);
  const client = useMemo(() => new WINkLinkClient(), []);

  const {
    price,
    historicalData,
    tronIntegration,
    staking,
    gaming,
    networkStats,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useWINkLinkAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      tron: tronIntegration,
      staking,
      gaming,
    },
    filename: `winklink-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const activeNodes = networkStats?.activeNodes ?? 120;
    const tronIntegrationCount = tronIntegration?.integrations ?? 0;
    const stakingApr = staking?.stakingApr ?? 15.5;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;

    return [
      {
        title: t('winklink.stats.activeNodes'),
        value: activeNodes > 0 ? `${activeNodes}+` : '-',
        change: '+5%',
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
        title: t('winklink.stats.tronIntegrations'),
        value: tronIntegrationCount > 0 ? `${tronIntegrationCount}` : '-',
        change: '+8',
        changeType: 'positive' as const,
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
        title: t('winklink.stats.stakingApr'),
        value: `${stakingApr}%`,
        change: '+2.5%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
      {
        title: t('winklink.stats.networkUptime'),
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
  }, [networkStats, tronIntegration, staking, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={t('winklink.title')}
        subtitle={t('winklink.subtitle')}
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
                <DashboardCard title={t('winklink.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('winklink.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('winklink.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('winklink.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('winklink.stats.circulatingSupply')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e9).toFixed(1)}B WIN
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('winklink.stats.stakingApr')}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {staking?.stakingApr ?? 15.5}%
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

          {activeTab === 'tron' && tronIntegration && (
            <WINkLinkTRONIntegrationPanel data={tronIntegration} />
          )}

          {activeTab === 'staking' && staking && (
            <WINkLinkStakingPanel data={staking} />
          )}

          {activeTab === 'gaming' && gaming && (
            <WINkLinkGamingPanel data={gaming} />
          )}
        </div>
      </main>
    </div>
  );
}
