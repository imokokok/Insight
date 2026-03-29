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
import { UMAWebSocketProvider } from '@/lib/realtime/UMAWebSocketContext';

import {
  UmaSidebar,
  UmaMarketView,
  UmaNetworkView,
  UmaDisputesView,
  UmaValidatorsView,
  UmaStakingView,
  UmaEcosystemView,
  UmaRiskView,
  UMAHero,
  DataRequestBrowser,
  GovernanceView,
  EducationContent,
  CrossChainVerification,
} from './components';
import { useUmaPage } from './hooks/useUmaPage';
import { type UmaTabId } from './types';

export default function UmaPage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    validators,
    disputes,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,

    setActiveTab,
    refresh,
    exportData,
    t,
  } = useUmaPage();

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
          <UmaMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            networkStats={networkStats ?? null}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <UmaNetworkView
            config={config}
            networkStats={networkStats ?? null}
            isLoading={isLoading}
          />
        );
      case 'requests':
        return <DataRequestBrowser />;
      case 'disputes':
        return (
          <UmaDisputesView
            disputes={disputes}
            networkStats={networkStats ?? null}
            isLoading={isLoading}
          />
        );
      case 'validators':
        return (
          <UmaValidatorsView
            validators={validators}
            networkStats={networkStats ?? null}
            isLoading={isLoading}
          />
        );
      case 'staking':
        return (
          <UmaStakingView
            validators={validators}
            networkStats={networkStats ?? null}
            isLoading={isLoading}
          />
        );
      case 'governance':
        return <GovernanceView isLoading={isLoading} />;
      case 'ecosystem':
        return <UmaEcosystemView config={config} />;
      case 'risk':
        return (
          <UmaRiskView
            networkStats={networkStats ?? null}
            disputes={disputes}
            isLoading={isLoading}
          />
        );
      case 'crosschain':
        return <CrossChainVerification />;
      case 'education':
        return <EducationContent />;
      default:
        return null;
    }
  };

  return (
    <UMAWebSocketProvider>
      <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
        <div className="min-h-screen bg-insight">
          <UMAHero
            config={config}
            price={price ?? null}
            historicalData={historicalData}
            networkStats={
              networkStats
                ? {
                    avgResponseTime: networkStats.avgResponseTime,
                    nodeUptime: networkStats.validatorUptime,
                    dataFeeds: networkStats.dataSources,
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
                  <UmaSidebar
                    activeTab={activeTab}
                    onTabChange={(tab) => setActiveTab(tab as UmaTabId)}
                    themeColor={config.themeColor}
                  />
                </div>
              </div>

              <div className="lg:hidden">
                <MobileMenuButton
                  isOpen={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  themeColor={config.themeColor}
                  label={t('uma.menu.title')}
                />
              </div>

              <MobileSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                title={t('uma.navigation.title')}
              >
                <UmaSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => {
                    setActiveTab(tab as UmaTabId);
                    setIsMobileMenuOpen(false);
                  }}
                  themeColor={config.themeColor}
                />
              </MobileSidebar>

              <div className="flex-1 min-w-0">{renderContent()}</div>
            </div>
          </div>
        </div>
      </OracleErrorBoundary>
    </UMAWebSocketProvider>
  );
}
