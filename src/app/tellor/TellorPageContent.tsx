'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { TellorClient } from '@/lib/oracles/tellor';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
} from '@/components/oracle';
import { TellorPriceStreamPanel } from '@/components/oracle/panels/TellorPriceStreamPanel';
import { TellorMarketDepthPanel } from '@/components/oracle/panels/TellorMarketDepthPanel';
import { TellorMultiChainAggregationPanel } from '@/components/oracle/panels/TellorMultiChainAggregationPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useTellorAllData } from '@/hooks/useTellorData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TellorPageContent');

type TellorTab = 'market' | 'network' | 'price-stream' | 'market-depth' | 'multi-chain';

const TABS: { id: TellorTab; labelKey: string }[] = [
  { id: 'market', labelKey: 'tellor.tabs.market' },
  { id: 'network', labelKey: 'tellor.tabs.network' },
  { id: 'price-stream', labelKey: 'tellor.tabs.priceStream' },
  { id: 'market-depth', labelKey: 'tellor.tabs.marketDepth' },
  { id: 'multi-chain', labelKey: 'tellor.tabs.multiChain' },
];

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{t('tellor.error.loadingFailed')}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{error.message || t('tellor.error.loadingFailed')}</p>
        <button
          onClick={onRetry}
          className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
        <p className="text-gray-500">{t('tellor.loading')}</p>
      </div>
    </div>
  );
}

export function TellorPageContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TellorTab>('market');

  const config = getOracleConfig(OracleProvider.TELLOR);
  const client = useMemo(() => new TellorClient(), []);

  const {
    price,
    historicalData,
    priceStream,
    marketDepth,
    multiChainAggregation,
    networkStats,
    liquidity,
    staking,
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
      timeRange: '24H',
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ];
  }, [networkStats, liquidity, staking, t]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError && !isLoading) {
    const firstError = errors[0];
    logger.error('Tellor data fetch error', firstError);
    return <ErrorFallback error={firstError} onRetry={refetchAll} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={t('tellor.title')}
        subtitle={t('tellor.subtitle')}
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </nav>
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
                      <span className="text-sm text-gray-600">{t('tellor.stats.circulatingSupply')}</span>
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

          {activeTab === 'network' && (
            <div className="space-y-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {activeTab === 'price-stream' && priceStream.length > 0 && (
            <TellorPriceStreamPanel data={priceStream} />
          )}

          {activeTab === 'price-stream' && priceStream.length === 0 && (
            <DashboardCard>
              <p className="text-gray-500 text-center py-8">{t('tellor.noPriceStreamData')}</p>
            </DashboardCard>
          )}

          {activeTab === 'market-depth' && marketDepth && (
            <TellorMarketDepthPanel data={marketDepth} />
          )}

          {activeTab === 'market-depth' && !marketDepth && (
            <DashboardCard>
              <p className="text-gray-500 text-center py-8">{t('tellor.noMarketDepthData')}</p>
            </DashboardCard>
          )}

          {activeTab === 'multi-chain' && multiChainAggregation && (
            <TellorMultiChainAggregationPanel data={multiChainAggregation} />
          )}

          {activeTab === 'multi-chain' && !multiChainAggregation && (
            <DashboardCard>
              <p className="text-gray-500 text-center py-8">{t('tellor.noMultiChainData')}</p>
            </DashboardCard>
          )}
        </div>
      </main>
    </div>
  );
}

export { TellorPageContent as TellarPageContent };
