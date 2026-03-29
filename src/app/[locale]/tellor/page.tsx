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
  TellorSidebar,
  TellorMarketView,
  TellorNetworkView,
  TellorReportersView,
  TellorDisputesView,
  TellorStakingView,
  TellorEcosystemView,
  TellorRiskView,
  TellorHero,
  TellorGovernanceView,
} from './components';
import { useTellorPage } from './hooks/useTellorPage';
import { type TellorTabId } from './types';

export default function TellorPage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    networkHealth,
    ecosystem,
    risk,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,

    setActiveTab,
    refresh,
    exportData,
    t,
  } = useTellorPage();

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
          <TellorMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <TellorNetworkView
            config={config}
            networkStats={networkStats}
            networkHealth={networkHealth}
            isLoading={isLoading}
          />
        );
      case 'reporters':
        return <TellorReportersView isLoading={isLoading} />;
      case 'disputes':
        return <TellorDisputesView isLoading={isLoading} />;
      case 'staking':
        return <TellorStakingView isLoading={isLoading} />;
      case 'ecosystem':
        return <TellorEcosystemView ecosystem={ecosystem} isLoading={isLoading} />;
      case 'risk':
        return <TellorRiskView risk={risk} isLoading={isLoading} />;
      case 'governance':
        return <TellorGovernanceView isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
        <TellorHero
          config={config}
          price={price ?? null}
          historicalData={historicalData}
          networkStats={networkStats}
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
                <TellorSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as TellorTabId)}
                  themeColor={config.themeColor}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('tellor.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('tellor.navigation.title')}
            >
              <TellorSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab as TellorTabId);
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
  );
}
