'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Server, Link2, TrendingUp, Shield } from 'lucide-react';
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
import { WINkLinkRiskPanel } from '@/components/oracle/panels/WINkLinkRiskPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useWINkLinkAllData } from '@/hooks/useWINkLinkData';

export default function WINkLinkPage() {
  const t = useTranslations();
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
    riskMetrics,
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
    const tronIntegrationCount = tronIntegration?.integratedDApps?.length ?? 0;
    const stakingApr = staking?.averageApr ?? 15.5;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;

    return [
      {
        title: t('winklink.stats.activeNodes'),
        value: activeNodes > 0 ? `${activeNodes}+` : '-',
        change: '+5%',
        changeType: 'positive' as const,
        icon: <Server className="w-5 h-5" />,
      },
      {
        title: t('winklink.stats.tronIntegrations'),
        value: tronIntegrationCount > 0 ? `${tronIntegrationCount}` : '-',
        change: '+8',
        changeType: 'positive' as const,
        icon: <Link2 className="w-5 h-5" />,
      },
      {
        title: t('winklink.stats.stakingApr'),
        value: `${stakingApr}%`,
        change: '+2.5%',
        changeType: 'positive' as const,
        icon: <TrendingUp className="w-5 h-5" />,
      },
      {
        title: t('winklink.stats.networkUptime'),
        value: `${nodeUptime}%`,
        change: '+0.05%',
        changeType: 'positive' as const,
        icon: <Shield className="w-5 h-5" />,
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
    <div className="min-h-screen bg-insight rounded-lg">
      <PageHeader
        title={t('winklink.title')}
        subtitle={t('winklink.subtitle')}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-white border border-gray-200 rounded-lg">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} isFirst={index === 0} />
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
                      <span className="text-sm text-gray-600">
                        {t('winklink.stats.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e9).toFixed(1)}B WIN
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {t('winklink.stats.stakingApr')}
                      </span>
                      <span className="text-sm font-semibold text-success-600">
                        {staking?.averageApr ?? 15.5}%
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

          {activeTab === 'staking' && staking && <WINkLinkStakingPanel data={staking} />}

          {activeTab === 'gaming' && gaming && <WINkLinkGamingPanel data={gaming} />}

          {activeTab === 'risk' && riskMetrics && <WINkLinkRiskPanel data={riskMetrics} />}
        </div>
      </main>
    </div>
  );
}
