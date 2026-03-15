'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
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
import { AirnodeDeploymentPanel } from '@/components/oracle/panels/AirnodeDeploymentPanel';
import { DapiCoveragePanel } from '@/components/oracle/panels/DapiCoveragePanel';
import { CoveragePoolPanel } from '@/components/oracle/panels/CoveragePoolPanel';
import { StakingMetricsPanel } from '@/components/oracle/panels/StakingMetricsPanel';
import { FirstPartyOracleAdvantages } from '@/components/oracle/common/FirstPartyOracleAdvantages';
import { DataQualityScoreCard } from '@/components/oracle/common/DataQualityScoreCard';
import { LatencyDistributionHistogram } from '@/components/oracle/charts/LatencyDistributionHistogram';
import { UpdateFrequencyHeatmap } from '@/components/oracle/charts/UpdateFrequencyHeatmap';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { DapiPriceDeviationMonitor } from '@/components/oracle/common/DapiPriceDeviationMonitor';
import { DataSourceTraceabilityPanel } from '@/components/oracle/panels/DataSourceTraceabilityPanel';
import { CoveragePoolTimeline } from '@/components/oracle/common/CoveragePoolTimeline';
import { createLogger } from '@/lib/utils/logger';
import { GasFeeComparison } from '@/components/oracle/common/GasFeeComparison';
import { ATRIndicator } from '@/components/oracle/indicators/ATRIndicator';
import { BollingerBands } from '@/components/oracle/indicators/BollingerBands';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { useAPI3AllData } from '@/hooks/useAPI3Data';

const logger = createLogger('API3PageContent');

type AP3Tab = 'market' | 'network' | 'airnode' | 'coverage' | 'advantages' | 'advanced';

const TABS: { id: AP3Tab; labelKey: string }[] = [
  { id: 'market', labelKey: 'api3.tabs.overview' },
  { id: 'network', labelKey: 'api3.tabs.networkHealth' },
  { id: 'airnode', labelKey: 'api3.tabs.airnodes' },
  { id: 'coverage', labelKey: 'api3.tabs.coveragePool' },
  { id: 'advantages', labelKey: 'api3.tabs.firstPartyOracles' },
  { id: 'advanced', labelKey: 'api3.tabs.advanced' },
];

// 错误边界组件
function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="py-4 border-b border-gray-100 max-w-md w-full mx-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 text-center mb-2">
          {t('api3.error.loadingFailed')}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          {error.message || t('api3.error.loadingFailed')}
        </p>
        <button
          onClick={onRetry}
          className="w-full px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

// 加载状态组件
function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <p className="text-gray-500">{t('api3.loading')}</p>
      </div>
    </div>
  );
}

export function API3PageContent() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState<AP3Tab>('market');

  const config = getOracleConfig(OracleProvider.API3);
  const client = useMemo(() => new API3Client(), []);

  // 使用 useAPI3AllData hook 替代分散的 useState
  const {
    // 基础数据
    price,
    historicalData,

    // Airnode 数据
    airnodeStats,
    dapiCoverage,

    // 质押和保险池
    staking,
    firstParty,

    // 质量和性能
    latency,
    qualityMetrics,
    hourlyActivity,
    deviations,
    sourceTrace,
    coverageEvents,

    // 高级分析
    gasFees,
    ohlc,
    qualityHistory,
    crossOracle,

    // 状态
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useAPI3AllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  // 导出数据
  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      airnode: airnodeStats,
      dapi: dapiCoverage,
      staking,
      timeRange,
    },
    filename: `api3-data-${timeRange}`,
  });

  // 刷新功能
  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  // 构建统计数据 - 必须在所有条件返回之前调用
  const stats = useMemo(() => {
    const activeAirnodes = airnodeStats?.activeAirnodes ?? 0;
    const totalDapis = dapiCoverage?.totalDapis ?? 0;
    const stakingApr = staking?.stakingApr ?? 12.5;
    const nodeUptime = airnodeStats?.nodeUptime ?? 99.7;

    return [
      {
        title: t('api3.stats.activeAirnodes'),
        value: activeAirnodes > 0 ? `${activeAirnodes}+` : '-',
        change: '+3%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
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
        title: t('api3.stats.dapiFeeds'),
        value: totalDapis > 0 ? `${totalDapis}+` : '-',
        change: '+8%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
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
        title: t('api3.stats.stakingApr'),
        value: `${stakingApr}%`,
        change: '+2.1%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
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
        title: t('api3.stats.networkUptime'),
        value: `${nodeUptime}%`,
        change: '+0.1%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
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
  }, [airnodeStats, dapiCoverage, staking, t]);

  // 构建 Airnode 数据
  const airnodeData = useMemo(() => {
    if (!airnodeStats || !firstParty) return null;

    return {
      deployments: firstParty.airnodeDeployments,
      networkStats: {
        activeAirnodes: airnodeStats.activeAirnodes,
        nodeUptime: airnodeStats.nodeUptime,
        avgResponseTime: airnodeStats.avgResponseTime,
        dapiUpdateFrequency: airnodeStats.dapiUpdateFrequency,
      },
    };
  }, [airnodeStats, firstParty]);

  // 构建 OHLC 和 Quality History 数据格式
  const ohlcPrices = useMemo(() => {
    if (!ohlc || ohlc.length === 0) return [];
    return [{ oracle: OracleProvider.API3, prices: ohlc }];
  }, [ohlc]);

  const qualityHistoryData = useMemo(() => {
    if (!qualityHistory || qualityHistory.length === 0) return [];
    return [{ oracle: OracleProvider.API3, data: qualityHistory }];
  }, [qualityHistory]);

  // 处理错误重试
  const handleRetry = async () => {
    await refetchAll();
  };

  // 显示加载状态
  if (isLoading) {
    return <LoadingState />;
  }

  // 显示错误状态
  if (isError && !isLoading) {
    const firstError = errors[0];
    logger.error('API3 data fetch error', firstError);
    return <ErrorFallback error={firstError} onRetry={handleRetry} />;
  }

  return (
    <TimeRangeProvider defaultTimeRange={timeRange}>
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title={t('api3.title')}
          subtitle={t('api3.subtitle')}
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
                  px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-green-100 text-green-700'
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
                <div key={index} className="py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p
                        className={`text-xs mt-2 font-medium ${
                          stat.changeType === 'positive'
                            ? 'text-green-600'
                            : stat.changeType === 'negative'
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {stat.changeType === 'positive' && '↑ '}
                        {stat.changeType === 'negative' && '↓ '}
                        {stat.changeType === 'neutral' && '→ '}
                        {stat.change}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{stat.icon}</div>
                  </div>
                </div>
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

                {deviations.length > 0 && (
                  <div className="mb-6">
                    <DapiPriceDeviationMonitor data={deviations} />
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
                  <div className="lg:col-span-2 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold mb-3">{t('api3.priceTrend')}</h3>
                    <PriceChart
                      client={client}
                      symbol={config.symbol}
                      chain={config.defaultChain}
                      height={320}
                      showToolbar={true}
                      defaultPrice={config.marketData.change24hValue}
                    />
                  </div>

                  <div className="py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold mb-3">{t('api3.quickStats')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{t('api3.stats.volume24h')}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{t('api3.stats.marketCap')}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">
                          {t('api3.stats.circulatingSupply')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M API3
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">{t('api3.stats.stakingApr')}</span>
                        <span className="text-sm font-semibold text-green-600">
                          {staking?.stakingApr ?? 12.5}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'network' && (
              <div className="space-y-6">
                <NetworkHealthPanel config={config.networkData} />

                {latency.length > 0 && (
                  <LatencyDistributionHistogram data={latency} oracleName="API3" />
                )}

                {hourlyActivity.length > 0 && (
                  <UpdateFrequencyHeatmap
                    hourlyActivity={hourlyActivity}
                    updateFrequency={airnodeStats?.dapiUpdateFrequency || 60}
                  />
                )}
              </div>
            )}

            {activeTab === 'airnode' && airnodeData && (
              <AirnodeDeploymentPanel data={airnodeData.deployments} />
            )}

            {activeTab === 'airnode' && !airnodeData && (
              <DashboardCard>
                <p className="text-gray-500 text-center py-8">{t('api3.noAirnodeData')}</p>
              </DashboardCard>
            )}

            {activeTab === 'coverage' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {staking && <CoveragePoolPanel data={staking.coveragePool} />}
                  {staking && <StakingMetricsPanel data={staking} />}
                  {coverageEvents.length > 0 && (
                    <div className="mt-6 col-span-2">
                      <CoveragePoolTimeline data={coverageEvents} />
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'coverage' && !staking && (
              <DashboardCard>
                <p className="text-gray-500 text-center py-8">{t('api3.noCoveragePoolData')}</p>
              </DashboardCard>
            )}

            {activeTab === 'advantages' && firstParty?.advantages && (
              <FirstPartyOracleAdvantages data={firstParty.advantages} />
            )}

            {activeTab === 'advantages' && !firstParty?.advantages && (
              <DashboardCard>
                <p className="text-gray-500 text-center py-8">{t('api3.noFirstPartyOracleData')}</p>
              </DashboardCard>
            )}

            {activeTab === 'airnode' && dapiCoverage && (
              <div className="mt-6">
                <DapiCoveragePanel data={dapiCoverage} />
              </div>
            )}

            {activeTab === 'airnode' && sourceTrace.length > 0 && (
              <div className="mt-6">
                <DataSourceTraceabilityPanel data={sourceTrace} />
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                {gasFees.length > 0 && <GasFeeComparison data={gasFees} />}

                {ohlcPrices.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ATRIndicator data={ohlcPrices} />
                    <BollingerBands data={ohlcPrices} />
                  </div>
                )}

                {qualityHistoryData.length > 0 && <DataQualityTrend data={qualityHistoryData} />}

                <CrossOracleComparison />
              </div>
            )}
          </div>
        </main>
      </div>
    </TimeRangeProvider>
  );
}
