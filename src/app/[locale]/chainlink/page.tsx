'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

import { type ChainlinkTabId } from './types';

import {
  ChainlinkSidebar,
  ChainlinkHero,
  ChainlinkMarketView,
  ChainlinkNetworkView,
  ChainlinkNodesView,
  ChainlinkDataFeedsView,
  ChainlinkServicesView,
  ChainlinkEcosystemView,
  ChainlinkRiskView,
} from './components';
import { useChainlinkPage } from './hooks/useChainlinkPage';

export default function ChainlinkPage() {
  const {
    activeTab,
    config,
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
  } = useChainlinkPage();

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
          <ChainlinkMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <ChainlinkNetworkView config={config} networkStats={networkStats} isLoading={isLoading} />
        );
      case 'nodes':
        return <ChainlinkNodesView />;
      case 'data-feeds':
        return <ChainlinkDataFeedsView />;
      case 'services':
        return <ChainlinkServicesView />;
      case 'ecosystem':
        return <ChainlinkEcosystemView />;
      case 'risk':
        return <ChainlinkRiskView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-insight">
      {/* Hero Section - 使用新的 ChainlinkHero 组件 */}
      <ChainlinkHero
        config={config}
        price={price ?? null}
        historicalData={historicalData}
        networkStats={networkStats ?? null}
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
              <ChainlinkSidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as ChainlinkTabId)} />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {t('chainlink.menu.title')}
            </button>
          </div>

          {/* Mobile Sidebar */}
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            title={t('chainlink.navigation.title')}
          >
            <ChainlinkSidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab as ChainlinkTabId);
                setIsMobileMenuOpen(false);
              }}
            />
          </MobileSidebar>

          {/* Content Area */}
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
