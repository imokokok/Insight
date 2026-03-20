'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChronicleClient } from '@/lib/oracles/chronicle';
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
import { ChronicleScuttlebuttPanel } from '@/components/oracle/panels/ChronicleScuttlebuttPanel';
import { ChronicleMakerDAOIntegrationPanel as ChronicleMakerDAOPanel } from '@/components/oracle/panels/ChronicleMakerDAOIntegrationPanel';
import { ChronicleValidatorPanel as ChronicleValidatorMetricsPanel } from '@/components/oracle/panels/ChronicleValidatorPanel';
import { ChronicleRiskAssessmentPanel } from '@/components/oracle/panels/ChronicleRiskAssessmentPanel';
import { ChronicleNetworkPanel } from '@/components/oracle/panels/ChronicleNetworkPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useChronicleAllData } from '@/hooks/useChronicleData';

export default function ChroniclePage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.CHRONICLE);
  const client = useMemo(() => new ChronicleClient(), []);

  const {
    price,
    historicalData,
    scuttlebutt,
    makerDAO,
    validatorMetrics,
    networkStats,
    staking,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useChronicleAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      scuttlebutt,
      makerDAO,
    },
    filename: `chronicle-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const activeValidators = validatorMetrics?.activeValidators ?? 45;
    const makerDAOSupport = makerDAO?.supportedAssets?.length ?? 0;
    const stakingApr = staking?.stakingApr ?? 7.8;
    const nodeUptime = networkStats?.nodeUptime ?? 99.95;

    return [
      {
        title: t('chronicle.stats.activeValidators'),
        value: activeValidators > 0 ? `${activeValidators}` : '-',
        change: '+2',
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
        iconBgColor: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: t('chronicle.stats.makerDAOSupport'),
        value: makerDAOSupport > 0 ? `${makerDAOSupport}` : '-',
        change: '+3',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        ),
        iconBgColor: 'bg-primary-50',
        iconColor: 'text-primary-600',
      },
      {
        title: t('chronicle.stats.stakingApr'),
        value: `${stakingApr}%`,
        change: '+0.3%',
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
        iconBgColor: 'bg-success-50',
        iconColor: 'text-success-600',
      },
      {
        title: t('chronicle.stats.networkUptime'),
        value: `${nodeUptime}%`,
        change: '+0.02%',
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
        iconBgColor: 'bg-purple-50',
        iconColor: 'text-purple-600',
      },
    ];
  }, [validatorMetrics, makerDAO, staking, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-insight">
      <PageHeader
        title={t('chronicle.title')}
        subtitle={t('chronicle.subtitle')}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                changeType={stat.changeType}
                icon={stat.icon}
                isFirst={index === 0}
                iconBgColor={stat.iconBgColor}
                iconColor={stat.iconColor}
              />
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
                <DashboardCard title={t('chronicle.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('chronicle.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('chronicle.stats.volume24h')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('chronicle.stats.marketCap')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('chronicle.stats.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M CHRONICLE
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {t('chronicle.stats.stakingApr')}
                      </span>
                      <span className="text-sm font-semibold text-success-600">
                        {staking?.stakingApr ?? 7.8}%
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </>
          )}

          {activeTab === 'network' && networkStats && validatorMetrics && (
            <ChronicleNetworkPanel
              networkStats={networkStats}
              validatorMetrics={validatorMetrics}
            />
          )}

          {activeTab === 'scuttlebutt' && scuttlebutt && (
            <ChronicleScuttlebuttPanel data={scuttlebutt} />
          )}

          {activeTab === 'makerdao' && makerDAO && <ChronicleMakerDAOPanel data={makerDAO} />}

          {activeTab === 'validators' && validatorMetrics && (
            <ChronicleValidatorMetricsPanel data={validatorMetrics} />
          )}

          {activeTab === 'risk' && (
            <ChronicleRiskAssessmentPanel scuttlebuttData={scuttlebutt || undefined} />
          )}
        </div>
      </main>
    </div>
  );
}
