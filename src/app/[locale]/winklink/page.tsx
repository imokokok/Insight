'use client';

import { useState } from 'react';

import {
  LoadingState,
  ErrorFallback,
  MobileMenuButton,
  OracleErrorBoundary,
} from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

import {
  WinklinkSidebar,
  WinklinkMarketView,
  WinklinkNetworkView,
  WinklinkTRONView,
  WinklinkStakingView,
  WinklinkGamingView,
  WinklinkRiskView,
  WinklinkVRFView,
  WinklinkCrossChainView,
  WinklinkAccuracyView,
  WinklinkDeveloperView,
  WinklinkHero,
} from './components';
import { useWinklinkPage } from './hooks/useWinklinkPage';
import { type WinklinkTabId } from './types';

function ErrorBanner({
  failedSources,
  onRetry,
  dataStates,
}: {
  failedSources: string[];
  onRetry: () => void;
  dataStates: Record<string, { refetch: () => Promise<void>; lastUpdated: Date | null }>;
}) {
  const t = useTranslations();

  const sourceLabels: Record<string, string> = {
    price: t('winklink.error.sourcePrice'),
    historical: t('winklink.error.sourceHistorical'),
    tron: 'TRON',
    staking: t('winklink.error.sourceStaking'),
    gaming: t('winklink.error.sourceGaming'),
    network: t('winklink.error.sourceNetwork'),
    risk: t('winklink.error.sourceRisk'),
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return t('winklink.hero.unknown');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('winklink.hero.justNow');
    if (diffMins < 60) return t('winklink.hero.minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    return t('winklink.hero.hoursAgo', { count: diffHours });
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {t('winklink.error.partialDataLoadFailed')}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {t('winklink.error.failedSources')}: {failedSources.map((s) => sourceLabels[s] || s).join(', ')}
            </p>
            <p className="text-xs text-amber-500 mt-0.5">
              {t('winklink.error.lastSuccessfulUpdate')}:{' '}
              {formatLastUpdated(
                Object.entries(dataStates)
                  .filter(([key]) => !failedSources.includes(key))
                  .sort((a, b) => (b[1].lastUpdated?.getTime() || 0) - (a[1].lastUpdated?.getTime() || 0))[0]?.[1]
                  .lastUpdated
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {failedSources.map((source) => (
            <button
              key={source}
              onClick={() => dataStates[source]?.refetch()}
              className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition-colors"
            >
              {t('winklink.error.retry')} {sourceLabels[source] || source}
            </button>
          ))}
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded hover:bg-amber-600 transition-colors"
          >
            {t('winklink.error.retryAll')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingIndicator({
  loadingSources,
}: {
  loadingSources: string[];
}) {
  const sourceLabels: Record<string, string> = {
    price: t('winklink.hero.sourcePrice'),
    historical: t('winklink.hero.sourceHistorical'),
    tron: 'TRON',
    staking: t('winklink.hero.sourceStaking'),
    gaming: t('winklink.hero.sourceGaming'),
    network: t('winklink.hero.sourceNetwork'),
    risk: t('winklink.hero.sourceRisk'),
  };

  if (loadingSources.length === 0) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="max-w-[1600px] mx-auto flex items-center gap-3">
        <div className="animate-spin">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.042.784 3.902 2.069 5.291l2.931-2z"
            />
          </svg>
        </div>
        <span className="text-xs text-blue-700">
          {t('winklink.error.loading')}: {loadingSources.map((s) => sourceLabels[s] || s).join(', ')}
        </span>
      </div>
    </div>
  );
}

export default function WinklinkPage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    tronIntegration,
    staking,
    gaming,
    networkStats,
    riskMetrics,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    dataStates,
    hasAllCriticalErrors,
    hasPartialErrors,
    failedDataSources,
    loadingDataSources,

    setActiveTab,
    refresh,
    exportData,
    t,
  } = useWinklinkPage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isInitialLoading = isLoading && !price && !historicalData.length && !networkStats;

  if (isInitialLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (hasAllCriticalErrors) {
    return <ErrorFallback error={error} onRetry={refresh} themeColor={config.themeColor} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return (
          <WinklinkMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            staking={staking}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <WinklinkNetworkView config={config} networkStats={networkStats} isLoading={isLoading} />
        );
      case 'tron':
        return <WinklinkTRONView tronIntegration={tronIntegration} isLoading={isLoading} />;
      case 'staking':
        return <WinklinkStakingView staking={staking} price={price} isLoading={isLoading} />;
      case 'gaming':
        return <WinklinkGamingView gaming={gaming} isLoading={isLoading} />;
      case 'vrf':
        return <WinklinkVRFView vrf={null} isLoading={isLoading} />;
      case 'cross-chain':
        return <WinklinkCrossChainView isLoading={isLoading} />;
      case 'accuracy':
        return <WinklinkAccuracyView isLoading={isLoading} />;
      case 'developer':
        return <WinklinkDeveloperView />;
      case 'risk':
        return <WinklinkRiskView riskMetrics={riskMetrics} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
        {hasPartialErrors && (
          <ErrorBanner
            failedSources={failedDataSources}
            onRetry={refresh}
            dataStates={dataStates}
          />
        )}
        {!hasPartialErrors && loadingDataSources.length > 0 && (
          <LoadingIndicator loadingSources={loadingDataSources} />
        )}
        <WinklinkHero
          config={config}
          price={price ?? null}
          historicalData={historicalData}
          networkStats={
            networkStats
              ? {
                  avgResponseTime: networkStats.avgResponseTime,
                  nodeUptime: networkStats.nodeUptime,
                  dataFeeds: networkStats.dataFeeds,
                }
              : undefined
          }
          isLoading={isLoading}
          isError={isError}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onExport={exportData}
          dataStates={dataStates}
          failedDataSources={failedDataSources}
          loadingDataSources={loadingDataSources}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <WinklinkSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as WinklinkTabId)}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('winklink.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('winklink.navigation.title')}
            >
              <WinklinkSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab as WinklinkTabId);
                  setIsMobileMenuOpen(false);
                }}
              />
            </MobileSidebar>

            <div className="flex-1 min-w-0">{renderContent()}</div>
          </div>
        </div>
      </div>
    </OracleErrorBoundary>
  );
}
