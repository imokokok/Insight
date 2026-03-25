'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { useRedStonePage } from './hooks/useRedStonePage';
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
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { LoadingState, ErrorFallback } from '@/components/oracle';
import { useQuery } from '@tanstack/react-query';
import { RedStoneClient } from '@/lib/oracles/redstone';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

const redstoneClient = new RedStoneClient();
const redstoneConfig = getOracleConfig(OracleProvider.REDSTONE);

function useRedStoneProviders() {
  return useQuery({
    queryKey: ['redstone', 'providers'],
    queryFn: () => redstoneClient.getDataProviders(),
    staleTime: 300000,
    gcTime: 600000,
  });
}

function useRedStoneMetrics() {
  return useQuery({
    queryKey: ['redstone', 'metrics'],
    queryFn: () => redstoneClient.getRedStoneMetrics(),
    staleTime: 300000,
    gcTime: 600000,
  });
}

export default function RedStonePage() {
  const {
    activeTab,
    client,
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    setActiveTab,
    refresh,
    exportData,
    t,
  } = useRedStonePage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: providers, isLoading: providersLoading } = useRedStoneProviders();
  const { data: metrics, isLoading: metricsLoading } = useRedStoneMetrics();

  if (isLoading && !price) {
    return <LoadingState themeColor="red" />;
  }

  if (isError && error) {
    return <ErrorFallback error={error} onRetry={refresh} themeColor="red" />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return (
          <RedStoneMarketView
            client={client}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
            networkStats={networkStats || null}
          />
        );
      case 'network':
        return (
          <RedStoneNetworkView
            networkStats={networkStats || null}
            isLoading={isLoading}
          />
        );
      case 'data-streams':
        return (
          <RedStoneDataStreamsView
            metrics={metrics || null}
            isLoading={metricsLoading}
          />
        );
      case 'providers':
        return (
          <RedStoneProvidersView
            providers={providers || []}
            metrics={metrics || null}
            isLoading={providersLoading}
          />
        );
      case 'cross-chain':
        return (
          <RedStoneCrossChainView
            isLoading={isLoading}
          />
        );
      case 'ecosystem':
        return (
          <RedStoneEcosystemView
            isLoading={isLoading}
          />
        );
      case 'cross-oracle':
        return (
          <div className="space-y-4">
            <CrossOracleComparison />
          </div>
        );
      case 'risk':
        return (
          <RedStoneRiskView
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
      <RedStoneHero
        config={redstoneConfig}
        price={price ?? null}
        historicalData={historicalData}
        networkStats={networkStats || undefined}
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
              <RedStoneSidebar activeTab={activeTab} onTabChange={setActiveTab} />
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
              {t('redstone.menu.title')}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute left-0 top-0 h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    {t('redstone.navigation.title')}
                  </h2>
                  <button onClick={() => setIsMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <RedStoneSidebar
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
