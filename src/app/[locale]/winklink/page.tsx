'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useWinklinkPage } from './hooks/useWinklinkPage';
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
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { LoadingState, ErrorFallback } from '@/components/oracle';

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
          <WinklinkNetworkView
            config={config}
            networkStats={networkStats}
            isLoading={isLoading}
          />
        );
      case 'tron':
        return (
          <WinklinkTRONView
            tronIntegration={tronIntegration}
            isLoading={isLoading}
          />
        );
      case 'staking':
        return (
          <WinklinkStakingView
            staking={staking}
            isLoading={isLoading}
          />
        );
      case 'gaming':
        return (
          <WinklinkGamingView
            gaming={gaming}
            isLoading={isLoading}
          />
        );
      case 'risk':
        return (
          <WinklinkRiskView
            riskMetrics={riskMetrics}
            isLoading={isLoading}
          />
        );
      case 'cross-oracle':
        return (
          <div className="space-y-4">
            <CrossOracleComparison />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-insight">
      {/* Hero Section */}
      <WinklinkHero
        config={config}
        price={price ?? null}
        historicalData={historicalData}
        networkStats={networkStats ? {
          avgResponseTime: networkStats.avgResponseTime,
          nodeUptime: networkStats.nodeUptime,
          dataFeeds: networkStats.dataFeeds,
        } : undefined}
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
              <WinklinkSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {t('winklink.menu.title')}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute left-0 top-0 h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    {t('winklink.navigation.title')}
                  </h2>
                  <button onClick={() => setIsMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <WinklinkSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
