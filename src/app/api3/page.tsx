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
  TabNavigation,
  LoadingState,
  ErrorFallback,
} from '@/components/oracle';
import { AirnodeDeploymentPanel } from '@/components/oracle/panels/AirnodeDeploymentPanel';
import { DapiCoveragePanel } from '@/components/oracle/panels/DapiCoveragePanel';
import { CoveragePoolPanel } from '@/components/oracle/panels/CoveragePoolPanel';
import { StakingMetricsPanel } from '@/components/oracle/panels/StakingMetricsPanel';
import { FirstPartyOracleAdvantages } from '@/components/oracle/common/FirstPartyOracleAdvantages';
import { DataQualityScoreCard } from '@/components/oracle/common/DataQualityScoreCard';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useAPI3AllData } from '@/hooks/useAPI3Data';
import { DapiPriceDeviationMonitor } from '@/components/oracle/common/DapiPriceDeviationMonitor';
import { DataSourceTraceabilityPanel } from '@/components/oracle/panels/DataSourceTraceabilityPanel';
import { CoveragePoolTimeline } from '@/components/oracle/common/CoveragePoolTimeline';
import { GasFeeComparison } from '@/components/oracle/common/GasFeeComparison';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { EcosystemPanel } from '@/components/oracle/panels/EcosystemPanel';
import { BollingerBands } from '@/components/oracle/indicators/BollingerBands';
import { API3RiskAssessmentPanel } from '@/components/oracle/panels/API3RiskAssessmentPanel';
import { API3CrossOraclePanel } from '@/components/oracle/panels/API3CrossOraclePanel';

export default function API3Page() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.API3);
  const client = useMemo(() => new API3Client(), []);

  const {
    price,
    historicalData,
    airnodeStats,
    dapiCoverage,
    staking,
    firstParty,
    latency,
    qualityMetrics,
    hourlyActivity,
    deviations,
    sourceTrace,
    coverageEvents,
    gasFees,
    ohlc,
    qualityHistory,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useAPI3AllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      airnode: airnodeStats,
      dapi: dapiCoverage,
      staking,
    },
    filename: `api3-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

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
        title: t('api3.stats.dapiFeeds'),
        value: totalDapis > 0 ? `${totalDapis}+` : '-',
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
        title: t('api3.stats.stakingApr'),
        value: `${stakingApr}%`,
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
        title: t('api3.stats.networkUptime'),
        value: `${nodeUptime}%`,
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
  }, [airnodeStats, dapiCoverage, staking, t]);

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

  const qualityHistoryData = useMemo(() => {
    if (!qualityHistory || qualityHistory.length === 0) return [];
    return [{ oracle: OracleProvider.API3, data: qualityHistory }];
  }, [qualityHistory]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-dune">
      <PageHeader
        title={t('api3.title')}
        subtitle={t('api3.subtitle')}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title={t('api3.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('api3.quickStats')}>
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
                </DashboardCard>
              </div>
            </>
          )}

          {activeTab === 'network' && (
            <div className="space-y-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {activeTab === 'airnode' && airnodeData && (
            <AirnodeDeploymentPanel data={airnodeData.deployments} />
          )}

          {activeTab === 'dapi' && dapiCoverage && (
            <div className="space-y-6">
              <DapiCoveragePanel data={dapiCoverage} />
              {sourceTrace.length > 0 && (
                <DataSourceTraceabilityPanel data={sourceTrace} />
              )}
            </div>
          )}

          {activeTab === 'staking' && staking && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CoveragePoolPanel data={staking.coveragePool} />
              <StakingMetricsPanel data={staking} />
              {coverageEvents.length > 0 && (
                <div className="mt-6 col-span-2">
                  <CoveragePoolTimeline data={coverageEvents} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'advantages' && firstParty?.advantages && (
            <FirstPartyOracleAdvantages data={firstParty.advantages} />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {ohlc && ohlc.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BollingerBands data={ohlc.filter(d => d.timestamp && d.high && d.low && d.close).map(d => ({ 
                    timestamp: d.timestamp!, 
                    price: d.price, 
                    high: d.high!, 
                    low: d.low!, 
                    close: d.close! 
                  }))} />
                </div>
              )}

              {qualityHistoryData.length > 0 && <DataQualityTrend data={qualityHistoryData} />}
            </div>
          )}

          {activeTab === 'gas' && gasFees.length > 0 && (
            <div className="space-y-6">
              <GasFeeComparison data={gasFees} />
            </div>
          )}

          {activeTab === 'risk' && (
            <API3RiskAssessmentPanel 
              staking={staking} 
              airnodeStats={airnodeStats}
              dapiCoverage={dapiCoverage}
            />
          )}

          {activeTab === 'cross-oracle' && (
            <API3CrossOraclePanel />
          )}

          {activeTab === 'ecosystem' && (
            <EcosystemPanel />
          )}
        </div>
      </main>
    </div>
  );
}
