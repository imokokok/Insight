'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { useAPI3Page } from './hooks/useAPI3Page';
import {
  API3Sidebar,
  API3MarketView,
  API3NetworkView,
  API3AirnodeView,
  API3DapiView,
  API3EcosystemView,
  API3RiskView,
  API3Hero,
} from './components';
import { LoadingState, ErrorFallback } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';

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

  if (isLoading && !price) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && error) {
    return <ErrorFallback error={error} onRetry={refresh} themeColor={config.themeColor} />;
  }

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
          <API3NetworkView
            config={config}
            networkStats={{
              activeNodes: airnodeStats?.activeAirnodes ?? 50,
              dataFeeds: dapiCoverage?.totalDapis ?? 150,
              nodeUptime: airnodeStats?.nodeUptime ?? 99.8,
              avgResponseTime: airnodeStats?.avgResponseTime ?? 200,
              latency: 100,
              hourlyActivity: config.networkData.hourlyActivity,
            }}
            isLoading={isLoading}
          />
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-insight">
      {/* Hero Section */}
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

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <API3Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>

          {/* Mobile Sidebar */}
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

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
