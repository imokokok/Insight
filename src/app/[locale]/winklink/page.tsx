'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton, OracleErrorBoundary } from '@/components/oracle';
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
  WinklinkHero,
} from './components';
import { useWinklinkPage } from './hooks/useWinklinkPage';
import { type WinklinkTabId } from './types';

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

    setActiveTab,
    refresh,
    exportData,
    t,
  } = useWinklinkPage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isInitialLoading = isLoading && !price && !historicalData.length && !networkStats;
  const hasCriticalError = isError && !price && error;

  if (isInitialLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (hasCriticalError) {
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
        return <WinklinkStakingView staking={staking} isLoading={isLoading} />;
      case 'gaming':
        return <WinklinkGamingView gaming={gaming} isLoading={isLoading} />;
      case 'risk':
        return <WinklinkRiskView riskMetrics={riskMetrics} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
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
