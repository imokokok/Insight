'use client';

import { useState } from 'react';

import {
  LoadingState,
  ErrorFallback,
  MobileMenuButton,
  OracleErrorBoundary,
} from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';

import {
  API3Sidebar,
  API3MarketView,
  API3NetworkView,
  API3AirnodeView,
  API3DapiView,
  API3EcosystemView,
  API3RiskView,
  API3OevView,
  API3Hero,
  API3AnalyticsView,
} from './components';
import { useAPI3Page } from './hooks/useAPI3Page';
import { type API3TabId } from './types';

export default function API3Page() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    airnodeStats,
    dapiCoverage,
    staking,
    firstParty,
    deviations,
    sourceTrace,
    oevStats,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,

    setActiveTab,
    refresh,
    exportData,
    t,
  } = useAPI3Page();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isInitialLoading = isLoading && !price && !historicalData.length;
  const hasCriticalError = isError && !price && error;

  if (isInitialLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (hasCriticalError) {
    return <ErrorFallback error={error} onRetry={refresh} themeColor={config.themeColor} />;
  }

  const networkStats = {
    activeNodes: airnodeStats?.activeAirnodes ?? 0,
    dataFeeds: dapiCoverage?.totalDapis ?? 0,
    nodeUptime: airnodeStats?.nodeUptime ?? 0,
    avgResponseTime: airnodeStats?.avgResponseTime ?? 0,
    latency: 100,
    hourlyActivity: config.networkData.hourlyActivity,
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return (
          <API3MarketView
            config={config}
            price={price}
            historicalData={historicalData}
            stakingApr={staking?.stakingApr}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <API3NetworkView config={config} networkStats={networkStats} isLoading={isLoading} />
        );
      case 'airnode':
        return (
          <API3AirnodeView
            airnodeStats={airnodeStats}
            firstParty={firstParty}
            isLoading={isLoading}
          />
        );
      case 'dapi':
        return (
          <API3DapiView
            dapiCoverage={dapiCoverage}
            deviations={deviations}
            sourceTrace={sourceTrace}
            isLoading={isLoading}
          />
        );
      case 'ecosystem':
        return <API3EcosystemView isLoading={isLoading} />;
      case 'risk':
        return (
          <API3RiskView
            staking={staking}
            airnodeStats={airnodeStats}
            dapiCoverage={dapiCoverage}
            isLoading={isLoading}
          />
        );
      case 'oev':
        return <API3OevView oevStats={oevStats} isLoading={isLoading} />;
      case 'analytics':
        return <API3AnalyticsView />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
        <API3Hero
          config={config}
          price={price ?? null}
          historicalData={historicalData}
          airnodeStats={airnodeStats}
          dapiCoverage={dapiCoverage}
          staking={staking}
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
                <API3Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('api3.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('api3.navigation.title')}
            >
              <API3Sidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
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
