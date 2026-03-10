'use client';

import { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/lib/types/oracle';
import {
  TabNavigation,
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  TimeRange,
} from '@/components/oracle';
import { useRefresh, useExport } from '@/hooks';

interface OraclePageTemplateProps {
  config: OracleConfig;
}

export function OraclePageTemplate({ config }: OraclePageTemplateProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState('market');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [price, history] = await Promise.all([
        config.client.getPrice(config.symbol, config.defaultChain),
        config.client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
      ]);
      setPriceData(price);
      setHistoricalData(history);
    } catch (error) {
      console.error(`Error fetching ${config.name} data:`, error);
    }
  }, [config]);

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: fetchData,
    minLoadingTime: 500,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price: priceData,
      historical: historicalData,
      timeRange,
    },
    filename: `${config.provider}-data-${timeRange}`,
  });

  const stats = useMemo(
    () => [
      {
        title: t('chainlink.stats.decentralizedNodes'),
        value: `${config.networkData.activeNodes.toLocaleString()}+`,
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
        value: `${config.networkData.dataFeeds.toLocaleString()}+`,
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
        value: `$${(config.marketData.marketCap / 1e9).toFixed(1)}B+`,
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
    ],
    [t, config]
  );

  const networkStatusData = useMemo(
    () => [
      {
        label: t('chainlink.networkHealth.activeNodes'),
        value: config.networkData.activeNodes.toLocaleString(),
        status: 'healthy' as const,
      },
      {
        label: t('chainlink.stats.dataFeeds'),
        value: config.networkData.dataFeeds.toLocaleString(),
        status: 'healthy' as const,
      },
      {
        label: t('chainlink.networkHealth.responseTime'),
        value: `${config.networkData.avgResponseTime}ms`,
        status:
          config.networkData.avgResponseTime < 200 ? ('healthy' as const) : ('warning' as const),
      },
      {
        label: t('chainlink.successRate'),
        value: `${config.networkData.nodeUptime}%`,
        status: 'healthy' as const,
      },
    ],
    [t, config]
  );

  const dataSources = useMemo(
    () => [
      {
        name: `${config.name} Market`,
        status: 'active' as const,
        latency: `${config.networkData.latency}ms`,
      },
      {
        name: config.defaultChain,
        status: 'active' as const,
        latency: `${config.networkData.avgResponseTime}ms`,
      },
      {
        name: 'Secondary Feed',
        status: 'active' as const,
        latency: `${Math.round(config.networkData.avgResponseTime * 1.2)}ms`,
      },
      {
        name: 'Backup Node',
        status: 'syncing' as const,
        latency: `${Math.round(config.networkData.avgResponseTime * 1.5)}ms`,
      },
    ],
    [config]
  );

  const getPageTitle = useCallback(() => {
    switch (activeTab) {
      case 'market':
        return t('chainlink.pageTitles.market');
      case 'network':
        return t('chainlink.pageTitles.network');
      case 'ecosystem':
        return t('chainlink.pageTitles.ecosystem');
      case 'risk':
        return t('chainlink.pageTitles.risk');
      default:
        return '';
    }
  }, [activeTab, t]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`${config.name} ${t('chainlink.analytics')}`}
        subtitle={t('chainlink.platform')}
        icon={config.icon}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('chainlink.lastUpdated')}: {t('chainlink.justNow')} • {t('chainlink.period')}:{' '}
              {timeRange}
            </p>
          </div>

          {activeTab === 'market' && (
            <div className="mb-6">
              <MarketDataPanel
                client={config.client}
                chain={config.defaultChain}
                config={config.marketData}
                iconBgColor={config.iconBgColor}
              />
            </div>
          )}

          {activeTab === 'network' && (
            <div className="mb-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {(activeTab === 'market' || activeTab === 'network') && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title={t('chainlink.priceChart.title')} className="lg:col-span-2">
                  <PriceChart
                    client={config.client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    initialTimeRange={timeRange}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('chainlink.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('chainlink.24hVolume')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('chainlink.marketData.marketCap')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(1)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('chainlink.marketData.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M {config.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('chainlink.stakingApr')}</span>
                      <span className="text-sm font-semibold text-green-600">4.32%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('chainlink.networkUptime')}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {config.networkData.nodeUptime}%
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DashboardCard title={t('chainlink.networkStatus')} className="lg:col-span-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {networkStatusData.map((item, index) => (
                      <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1 truncate">{item.label}</p>
                        <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                          />
                          <span className="text-xs text-gray-500">
                            {item.status === 'healthy'
                              ? t('chainlink.normal')
                              : t('chainlink.networkHealth.warning')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </DashboardCard>

                <DashboardCard title={t('chainlink.dataSource')}>
                  <div className="space-y-3">
                    {dataSources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              source.status === 'active'
                                ? 'bg-green-500'
                                : 'bg-yellow-500 animate-pulse'
                            }`}
                          />
                          <span className="text-sm text-gray-700 truncate">{source.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                          {source.latency}
                        </span>
                      </div>
                    ))}
                  </div>
                </DashboardCard>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
