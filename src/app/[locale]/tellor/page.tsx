'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TellorClient } from '@/lib/oracles/tellor';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  DashboardCard,
  StatCard,
  TabNavigation,
  LoadingState,
  ErrorFallback,
} from '@/components/oracle';
import { TellorPriceStreamPanel } from '@/components/oracle/panels/TellorPriceStreamPanel';
import { TellorMarketDepthPanel } from '@/components/oracle/panels/TellorMarketDepthPanel';
import { TellorMultiChainAggregationPanel } from '@/components/oracle/panels/TellorMultiChainAggregationPanel';
import { TellorReportersPanel } from '@/components/oracle/panels/TellorReportersPanel';
import { TellorRiskPanel } from '@/components/oracle/panels/TellorRiskPanel';
import { TellorNetworkPanel } from '@/components/oracle/panels/TellorNetworkPanel';
import { TellorEcosystemPanel } from '@/components/oracle/panels/TellorEcosystemPanel';
import { TellorStakingCalculator } from '@/components/oracle/panels/TellorStakingCalculator';
import { TellorDisputesPanel } from '@/components/oracle/panels/TellorDisputesPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useTellorAllData } from '@/hooks/useTellorData';

export default function TellorPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.TELLOR);
  const client = useMemo(() => new TellorClient(), []);

  const {
    price,
    historicalData,
    priceStream,
    marketDepth,
    multiChainAggregation,
    networkStats,
    networkHealth,
    liquidity,
    staking,
    reporters,
    risk,
    ecosystem,
    disputes,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useTellorAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      priceStream,
      marketDepth,
      multiChainAggregation,
    },
    filename: `tellor-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const activeNodes = networkStats?.activeNodes ?? 72;
    const totalLiquidity = liquidity?.totalLiquidity ?? 850000000;
    const stakingApr = staking?.stakingApr ?? 10.2;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;

    return [
      {
        title: t('tellor.stats.activeNodes'),
        value: activeNodes > 0 ? `${activeNodes}+` : '-',
        change: '+3%',
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
        title: t('tellor.stats.totalLiquidity'),
        value: totalLiquidity > 0 ? `$${(totalLiquidity / 1e9).toFixed(2)}B` : '-',
        change: '+8%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        title: t('tellor.stats.stakingApr'),
        value: `${stakingApr}%`,
        change: '+0.5%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        ),
      },
      {
        title: t('tellor.stats.networkUptime'),
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
  }, [networkStats, liquidity, staking, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-dune">
      <PageHeader
        title={t('tellor.title')}
        subtitle={t('tellor.subtitle')}
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
                <DashboardCard title={t('tellor.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('tellor.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('tellor.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('tellor.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('tellor.stats.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M TRB
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('tellor.stats.stakingApr')}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {staking?.stakingApr ?? 10.2}%
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </>
          )}

          {activeTab === 'network' && networkHealth && <TellorNetworkPanel data={networkHealth} />}

          {activeTab === 'reporters' && reporters && <TellorReportersPanel data={reporters} />}

          {activeTab === 'disputes' && disputes && <TellorDisputesPanel data={disputes} />}

          {activeTab === 'staking' && <TellorStakingCalculator />}

          {activeTab === 'price-stream' && priceStream.length > 0 && (
            <TellorPriceStreamPanel data={priceStream} />
          )}

          {activeTab === 'market-depth' && marketDepth && (
            <TellorMarketDepthPanel data={marketDepth} />
          )}

          {activeTab === 'multi-chain' && multiChainAggregation && (
            <TellorMultiChainAggregationPanel data={multiChainAggregation} />
          )}

          {activeTab === 'risk' && risk && <TellorRiskPanel data={risk} />}

          {activeTab === 'ecosystem' && ecosystem && <TellorEcosystemPanel data={ecosystem} />}
        </div>
      </main>
    </div>
  );
}
