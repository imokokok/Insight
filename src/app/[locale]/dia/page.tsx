'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

import {
  DIASidebar,
  DIAMarketView,
  DIANetworkView,
  DIADataFeedsView,
  DIANFTView,
  DIAStakingView,
  DIAEcosystemView,
  DIARiskView,
  DIAHero,
} from './components';
import { useDIAPage } from './hooks/useDIAPage';
import { type DIATabId } from './types';

export default function DIAPage() {
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
  } = useDIAPage();

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
          <DIAMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
          />
        );
      case 'network':
        return <DIANetworkView config={config} networkStats={networkStats} isLoading={isLoading} />;
      case 'data-feeds':
        return <DIADataFeedsView />;
      case 'nft-data':
        return <DIANFTView />;
      case 'staking':
        return <DIAStakingView />;
      case 'ecosystem':
        return <DIAEcosystemView />;
      case 'risk':
        return <DIARiskView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-insight">
      <DIAHero
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
              <DIASidebar
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as DIATabId)}
              />
            </div>
          </div>

          <div className="lg:hidden">
            <MobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              themeColor={config.themeColor}
              label={t('dia.menu.title')}
            />
          </div>

          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            title={t('dia.navigation.title')}
          >
            <DIASidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab as DIATabId);
                setIsMobileMenuOpen(false);
              }}
            />
          </MobileSidebar>

          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
