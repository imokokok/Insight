'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { API3Client } from '@/lib/oracles/api3';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  TimeRange,
} from '@/components/oracle';
import { AirnodeDeploymentPanel } from '@/components/oracle/AirnodeDeploymentPanel';
import { DapiCoveragePanel } from '@/components/oracle/DapiCoveragePanel';
import { CoveragePoolPanel } from '@/components/oracle/CoveragePoolPanel';
import { StakingMetricsPanel } from '@/components/oracle/StakingMetricsPanel';
import { FirstPartyOracleAdvantages } from '@/components/oracle/FirstPartyOracleAdvantages';
import { DataQualityScoreCard } from '@/components/oracle/DataQualityScoreCard';
import { LatencyDistributionHistogram } from '@/components/oracle/LatencyDistributionHistogram';
import { UpdateFrequencyHeatmap } from '@/components/oracle/UpdateFrequencyHeatmap';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider, Blockchain, PriceData } from '@/lib/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { DapiPriceDeviationMonitor } from '@/components/oracle/DapiPriceDeviationMonitor';
import { DataSourceTraceabilityPanel } from '@/components/oracle/DataSourceTraceabilityPanel';
import { CoveragePoolTimeline } from '@/components/oracle/CoveragePoolTimeline';
import { DapiPriceDeviation, DataSourceInfo, CoveragePoolEvent } from '@/lib/oracles/api3';

type AP3Tab = 'market' | 'network' | 'airnode' | 'coverage' | 'advantages';

const TABS: { id: AP3Tab; label: string }[] = [
  { id: 'market', label: '市场数据' },
  { id: 'network', label: '网络健康' },
  { id: 'airnode', label: 'Airnode' },
  { id: 'coverage', label: '保险池' },
  { id: 'advantages', label: '第一方预言机' },
];

export function API3PageContent() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState<AP3Tab>('market');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const config = getOracleConfig(OracleProvider.API3);
  const client = new API3Client();

  const [airnodeData, setAirnodeData] = useState<{
    deployments: {
      total: number;
      byRegion: { northAmerica: number; europe: number; asia: number; others: number };
      byChain: { ethereum: number; arbitrum: number; polygon: number };
      byProviderType: { exchanges: number; traditionalFinance: number; others: number };
    };
    networkStats: {
      activeAirnodes: number;
      nodeUptime: number;
      avgResponseTime: number;
      dapiUpdateFrequency: number;
    };
  } | null>(null);

  const [dapiData, setDapiData] = useState<{
    totalDapis: number;
    byAssetType: { crypto: number; forex: number; commodities: number; stocks: number };
    byChain: { ethereum: number; arbitrum: number; polygon: number };
    updateFrequency: { high: number; medium: number; low: number };
  } | null>(null);

  const [stakingData, setStakingData] = useState<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    coveragePool: {
      totalValue: number;
      coverageRatio: number;
      historicalPayouts: number;
    };
  } | null>(null);

  const [firstPartyData, setFirstPartyData] = useState<{
    noMiddlemen: boolean;
    sourceTransparency: boolean;
    responseTime: number;
  } | null>(null);

  const [latencyData, setLatencyData] = useState<number[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<{
    freshness: { lastUpdated: Date; updateInterval: number };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
  } | null>(null);
  const [hourlyActivity, setHourlyActivity] = useState<number[]>([]);
  const [dapiDeviations, setDapiDeviations] = useState<DapiPriceDeviation[]>([]);
  const [dataSourceTrace, setDataSourceTrace] = useState<DataSourceInfo[]>([]);
  const [coverageEvents, setCoverageEvents] = useState<CoveragePoolEvent[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [price, history, airnodeStats, dapiCoverage, staking, firstParty, latency, quality, deviations, sourceTrace, poolEvents] = await Promise.all([
        client.getPrice(config.symbol, config.defaultChain),
        client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
        client.getAirnodeNetworkStats(),
        client.getDapiCoverage(),
        client.getStakingData(),
        client.getFirstPartyOracleData(),
        client.getLatencyDistribution(),
        client.getDataQualityMetrics(),
        client.getDapiPriceDeviations(),
        client.getDataSourceTraceability(),
        client.getCoveragePoolEvents(),
      ]);

      setPriceData(price);
      setHistoricalData(history);

      setAirnodeData({
        deployments: firstParty.airnodeDeployments,
        networkStats: {
          activeAirnodes: airnodeStats.activeAirnodes,
          nodeUptime: airnodeStats.nodeUptime,
          avgResponseTime: airnodeStats.avgResponseTime,
          dapiUpdateFrequency: airnodeStats.dapiUpdateFrequency,
        },
      });

      setDapiData(dapiCoverage);
      setStakingData(staking);
      setFirstPartyData(firstParty.advantages);
      setLatencyData(latency);
      setQualityMetrics(quality);
      setHourlyActivity(airnodeStats.hourlyActivity);
      setDapiDeviations(deviations);
      setDataSourceTrace(sourceTrace);
      setCoverageEvents(poolEvents);
    } catch (error) {
      console.error('Error fetching API3 data:', error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: fetchData,
    minLoadingTime: 500,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price: priceData,
      historical: historicalData,
      airnode: airnodeData,
      dapi: dapiData,
      staking: stakingData,
      timeRange,
    },
    filename: `api3-data-${timeRange}`,
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    {
      title: '活跃 Airnode',
      value: airnodeData ? `${airnodeData.networkStats.activeAirnodes}+` : '-',
      change: '+3%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      ),
    },
    {
      title: 'dAPI 数据源',
      value: dapiData ? `${dapiData.totalDapis}+` : '-',
      change: '+8%',
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
      title: '质押 APR',
      value: stakingData ? `${stakingData.stakingApr}%` : '-',
      change: '+2.1%',
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
      title: '网络在线率',
      value: airnodeData ? `${airnodeData.networkStats.nodeUptime}%` : '-',
      change: '+0.1%',
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <p className="text-gray-500">加载 API3 数据...</p>
        </div>
      </div>
    );
  }

  return (
    <TimeRangeProvider defaultTimeRange={timeRange}>
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="API3 数据分析"
          subtitle="第一方预言机网络"
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
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
                >
                  {tab.label}
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
                {qualityMetrics && (
                  <div className="mb-6">
                    <DataQualityScoreCard
                      completeness={
                        (qualityMetrics.completeness.successCount /
                          qualityMetrics.completeness.totalCount) *
                        100
                      }
                      timeliness={100}
                      accuracy={qualityMetrics.reliability.historicalAccuracy}
                    />
                  </div>
                )}

                {dapiDeviations.length > 0 && (
                  <div className="mb-6">
                    <DapiPriceDeviationMonitor data={dapiDeviations} />
                  </div>
                )}

                <div className="mb-6">
                  <MarketDataPanel
                    client={client}
                    chain={config.defaultChain}
                    config={config.marketData}
                    iconBgColor={config.iconBgColor}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <DashboardCard title="价格走势" className="lg:col-span-2">
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
                          ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">流通供应</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M API3
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">质押 APR</span>
                        <span className="text-sm font-semibold text-green-600">
                          {stakingData?.stakingApr || 12.5}%
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

                {latencyData.length > 0 && (
                  <LatencyDistributionHistogram data={latencyData} oracleName="API3" />
                )}

                {hourlyActivity.length > 0 && (
                  <UpdateFrequencyHeatmap
                    hourlyActivity={hourlyActivity}
                    updateFrequency={airnodeData?.networkStats.dapiUpdateFrequency || 60}
                  />
                )}
              </div>
            )}

            {activeTab === 'airnode' && airnodeData && (
              <AirnodeDeploymentPanel data={airnodeData.deployments} />
            )}

            {activeTab === 'airnode' && !airnodeData && (
              <DashboardCard>
                <p className="text-gray-500 text-center py-8">暂无 Airnode 数据</p>
              </DashboardCard>
            )}

            {activeTab === 'coverage' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {stakingData && <CoveragePoolPanel data={stakingData.coveragePool} />}
                  {stakingData && <StakingMetricsPanel data={stakingData} />}
                  {coverageEvents.length > 0 && (
                    <div className="mt-6 col-span-2">
                      <CoveragePoolTimeline data={coverageEvents} />
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'coverage' && !stakingData && (
              <DashboardCard>
                <p className="text-gray-500 text-center py-8">暂无保险池数据</p>
              </DashboardCard>
            )}

            {activeTab === 'advantages' && firstPartyData && (
              <FirstPartyOracleAdvantages data={firstPartyData} />
            )}

            {activeTab === 'advantages' && !firstPartyData && (
              <DashboardCard>
                <p className="text-gray-500 text-center py-8">暂无第一方预言机数据</p>
              </DashboardCard>
            )}

            {activeTab === 'airnode' && dapiData && (
              <div className="mt-6">
                <DapiCoveragePanel data={dapiData} />
              </div>
            )}

            {activeTab === 'airnode' && dataSourceTrace.length > 0 && (
              <div className="mt-6">
                <DataSourceTraceabilityPanel data={dataSourceTrace} />
              </div>
            )}
          </div>
        </main>
      </div>
    </TimeRangeProvider>
  );
}
