'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton, OracleErrorBoundary } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';
import { OracleProvider } from '@/types/oracle';

import {
  RedStoneSidebar,
  RedStoneMarketView,
  RedStoneNetworkView,
  RedStoneDataStreamsView,
  RedStoneProvidersView,
  RedStoneCrossChainView,
  RedStoneEcosystemView,
  RedStoneRiskView,
  RedStoneHero,
} from './components';
import { useRedStonePage } from './hooks/useRedStonePage';
import { type RedStoneTabId } from './types';

export default function RedStonePage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    providers,
    metrics,
    redstoneClient,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    dataFreshnessStatus,
    setActiveTab,
    refresh,
    exportData,
    t,
  } = useRedStonePage();

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
          <RedStoneMarketView
            client={redstoneClient}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
            networkStats={networkStats ?? null}
          />
        );
      case 'network':
        return <RedStoneNetworkView networkStats={networkStats ?? null} isLoading={isLoading} />;
      case 'data-streams':
        return <RedStoneDataStreamsView metrics={metrics ?? null} isLoading={isLoading} />;
      case 'providers':
        return (
          <RedStoneProvidersView
            providers={providers ?? []}
            metrics={metrics ?? null}
            isLoading={isLoading}
          />
        );
      case 'cross-chain':
        return <RedStoneCrossChainView isLoading={isLoading} />;
      case 'ecosystem':
        return <RedStoneEcosystemView isLoading={isLoading} />;
      case 'risk':
        return <RedStoneRiskView isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
        <RedStoneHero
          config={config}
          price={price ?? null}
          historicalData={historicalData}
          networkStats={networkStats ?? undefined}
          isLoading={isLoading}
          isError={isError}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          dataFreshnessStatus={dataFreshnessStatus}
          onRefresh={refresh}
          onExport={exportData}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <RedStoneSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as RedStoneTabId)}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('redstone.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('redstone.navigation.title')}
            >
              <RedStoneSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab as RedStoneTabId);
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
