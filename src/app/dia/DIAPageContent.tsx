'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { DIAClient } from '@/lib/oracles/dia';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
} from '@/components/oracle';
import { DIADataTransparencyPanel } from '@/components/oracle/panels/DIADataTransparencyPanel';
import { DIACrossChainCoveragePanel } from '@/components/oracle/panels/DIACrossChainCoveragePanel';
import { DIADataSourceVerificationPanel } from '@/components/oracle/panels/DIADataSourceVerificationPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useDIAAllData } from '@/hooks/useDIAData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DIAPageContent');

type DIATab = 'market' | 'network' | 'transparency' | 'coverage' | 'verification';

const TABS: { id: DIATab; labelKey: string }[] = [
  { id: 'market', labelKey: 'dia.tabs.market' },
  { id: 'network', labelKey: 'dia.tabs.network' },
  { id: 'transparency', labelKey: 'dia.tabs.transparency' },
  { id: 'coverage', labelKey: 'dia.tabs.coverage' },
  { id: 'verification', labelKey: 'dia.tabs.verification' },
];

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
          {t('dia.error.loadingFailed')}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          {error.message || t('dia.error.loadingFailed')}
        </p>
        <button
          onClick={onRetry}
          className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
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
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500">{t('dia.loading')}</p>
      </div>
    </div>
  );
}

export function DIAPageContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<DIATab>('market');

  const config = getOracleConfig(OracleProvider.DIA);
  const client = useMemo(() => new DIAClient(), []);

  const {
    price,
    historicalData,
    dataTransparency,
    crossChainCoverage,
    dataSourceVerification,
    networkStats,
    staking,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useDIAAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      transparency: dataTransparency,
      coverage: crossChainCoverage,
      timeRange: '24H',
    },
    filename: `dia-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const activeSources = dataTransparency?.filter((s) => s.status === 'active').length ?? 0;
    const totalAssets = crossChainCoverage?.totalAssets ?? 0;
    const stakingApr = staking?.stakingApr ?? 8.5;
    const nodeUptime = networkStats?.nodeUptime ?? 99.8;

    return [
      {
        title: t('dia.stats.activeSources'),
        value: activeSources > 0 ? `${activeSources}+` : '-',
        change: '+2%',
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
      {
        title: t('dia.stats.crossChainAssets'),
        value: totalAssets > 0 ? `${totalAssets}+` : '-',
        change: '+5%',
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
        title: t('dia.stats.stakingApr'),
        value: `${stakingApr}%`,
        change: '+1.2%',
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
        title: t('dia.stats.networkUptime'),
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
  }, [dataTransparency, crossChainCoverage, staking, t]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError && !isLoading) {
    const firstError = errors[0];
    logger.error('DIA data fetch error', firstError);
    return <ErrorFallback error={firstError} onRetry={refetchAll} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={t('dia.title')}
        subtitle={t('dia.subtitle')}
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
                      ? 'bg-indigo-100 text-indigo-700'
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
                <DashboardCard title={t('dia.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('dia.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('dia.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('dia.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('dia.stats.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M DIA
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('dia.stats.stakingApr')}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {staking?.stakingApr ?? 8.5}%
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

          {activeTab === 'transparency' && dataTransparency.length > 0 && (
            <DIADataTransparencyPanel data={dataTransparency} />
          )}

          {activeTab === 'transparency' && dataTransparency.length === 0 && (
            <div className="py-4 border-b border-gray-100">
              <p className="text-gray-500 text-center py-8">{t('dia.noTransparencyData')}</p>
            </div>
          )}

          {activeTab === 'coverage' && crossChainCoverage && (
            <DIACrossChainCoveragePanel data={crossChainCoverage} />
          )}

          {activeTab === 'coverage' && !crossChainCoverage && (
            <div className="py-4 border-b border-gray-100">
              <p className="text-gray-500 text-center py-8">{t('dia.noCoverageData')}</p>
            </div>
          )}

          {activeTab === 'verification' && dataSourceVerification.length > 0 && (
            <DIADataSourceVerificationPanel data={dataSourceVerification} />
          )}

          {activeTab === 'verification' && dataSourceVerification.length === 0 && (
            <div className="py-4 border-b border-gray-100">
              <p className="text-gray-500 text-center py-8">{t('dia.noVerificationData')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
