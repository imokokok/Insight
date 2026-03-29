'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton, OracleErrorBoundary } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

import {
  PythSidebar,
  PythMarketView,
  PythNetworkView,
  PythPublishersView,
  PythValidatorsView,
  PythPriceFeedsView,
  PythRiskView,
  PythHero,
} from './components';
import { usePythPage } from './hooks/usePythPage';
import { type PythTabId } from './types';

export default function PythPage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,

    setActiveTab,
    refresh,
    exportData,
    t,
  } = usePythPage();

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
          <PythMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            networkStats={networkStats}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <PythNetworkView config={config} networkStats={networkStats} isLoading={isLoading} />
        );
      case 'publishers':
        return <PythPublishersView publishers={publishers} isLoading={isLoading} />;
      case 'validators':
        return <PythValidatorsView validators={validators} isLoading={isLoading} />;
      case 'price-feeds':
        return <PythPriceFeedsView isLoading={isLoading} />;
      case 'risk':
        return <PythRiskView isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
        <PythHero
          config={config}
          price={price ?? null}
          historicalData={historicalData}
          networkStats={networkStats}
          publishers={publishers}
          validators={validators}
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
                <PythSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as PythTabId)}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('pyth.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('pyth.navigation.title')}
            >
              <PythSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab as PythTabId);
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
