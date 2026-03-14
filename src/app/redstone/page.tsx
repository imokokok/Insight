'use client';

import { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { RedStoneClient } from '@/lib/oracles';
import {
  OraclePageTemplate,
  RedStoneMetricsPanel,
  TabNavigation,
  PageHeader,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  PriceChart,
} from '@/components/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useGlobalTimeRange } from '@/contexts/TimeRangeContext';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('RedStonePage');

export default function RedStonePage() {
  const { t } = useI18n();
  const config = getOracleConfig(OracleProvider.REDSTONE);
  const client = useMemo(() => new RedStoneClient(), []);
  const { timeRange } = useGlobalTimeRange();
  const [activeTab, setActiveTab] = useState('market');

  const fetchData = useCallback(async () => {
    try {
      await Promise.all([
        client.getPrice(config.symbol, config.defaultChain),
        client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
      ]);
    } catch (err) {
      logger.error('Error fetching RedStone data', err as Error);
    }
  }, [client, config]);

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: fetchData,
    minLoadingTime: 500,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      timeRange,
    },
    filename: 'redstone-data',
  });

  const stats = useMemo(
    () => [
      {
        title: '数据提供者',
        value: '25+',
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
        title: '支持资产',
        value: '1000+',
        change: '+15%',
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
        title: '支持链数',
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
        title: '数据新鲜度',
        value: '98.5',
        suffix: '/100',
        change: '+2%',
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
    ],
    [config.supportedChains.length]
  );

  const networkStatusData = useMemo(
    () => [
      {
        label: '活跃节点',
        value: config.networkData.activeNodes.toLocaleString(),
        status: 'healthy' as const,
      },
      {
        label: '数据流',
        value: config.networkData.dataFeeds.toLocaleString(),
        status: 'healthy' as const,
      },
      {
        label: '响应时间',
        value: `${config.networkData.avgResponseTime}ms`,
        status: config.networkData.avgResponseTime < 200 ? 'healthy' : 'warning',
      },
      {
        label: '正常运行',
        value: `${config.networkData.nodeUptime}%`,
        status: 'healthy' as const,
      },
    ],
    [config.networkData]
  );

  const dataSources = useMemo(
    () => [
      {
        name: 'RedStone Core',
        status: 'active' as const,
        latency: `${config.networkData.latency}ms`,
      },
      {
        name: config.defaultChain,
        status: 'active' as const,
        latency: `${config.networkData.avgResponseTime}ms`,
      },
      {
        name: '数据提供者 A',
        status: 'active' as const,
        latency: `${Math.round(config.networkData.avgResponseTime * 1.1)}ms`,
      },
      {
        name: '数据提供者 B',
        status: 'active' as const,
        latency: `${Math.round(config.networkData.avgResponseTime * 1.2)}ms`,
      },
    ],
    [config]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`${config.name} 数据分析`}
        subtitle="模块化预言机解决方案"
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} provider={OracleProvider.REDSTONE} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'market' && '市场数据'}
              {activeTab === 'network' && '网络健康'}
              {activeTab === 'ecosystem' && '生态系统与核心指标'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              最后更新: 刚刚 • 周期: {timeRange}
            </p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title="价格图表" className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title="快速统计">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">24h 交易量</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">市值</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(1)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">流通供应量</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M {config.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">模块化费用</span>
                      <span className="text-sm font-semibold text-green-600">$0.0001</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">网络正常运行</span>
                      <span className="text-sm font-semibold text-green-600">
                        {config.networkData.nodeUptime}%
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DashboardCard title="网络状态" className="lg:col-span-2">
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
                            {item.status === 'healthy' ? '正常' : '警告'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </DashboardCard>

                <DashboardCard title="数据源">
                  <div className="space-y-3">
                    {dataSources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              source.status === 'active' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
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

          {activeTab === 'network' && (
            <div className="mb-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {activeTab === 'ecosystem' && (
            <RedStoneMetricsPanel client={client} />
          )}
        </div>
      </main>
    </div>
  );
}
