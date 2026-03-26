'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

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
import { type ChainlinkTabId } from './types';

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
              <ChainlinkSidebar
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as ChainlinkTabId)}
              />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <MobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              themeColor={config.themeColor}
              label={t('chainlink.menu.title')}
            />
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
