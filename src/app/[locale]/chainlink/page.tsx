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
  ChainlinkSidebar,
  ChainlinkHero,
  ChainlinkMarketView,
  ChainlinkNetworkView,
  ChainlinkNodesView,
  ChainlinkDataFeedsView,
  ChainlinkDataStreamsView,
  ChainlinkServicesView,
  ChainlinkEcosystemView,
  ChainlinkRiskView,
  ChainlinkCCIPView,
  ChainlinkStakingView,
  ChainlinkFunctionsView,
  ChainlinkAutomationView,
  ChainlinkProofOfReserveView,
  ChainlinkVRFView,
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
      case 'data-streams':
        return <ChainlinkDataStreamsView />;
      case 'services':
        return <ChainlinkServicesView />;
      case 'ccip':
        return <ChainlinkCCIPView />;
      case 'vrf':
        return <ChainlinkVRFView />;
      case 'staking':
        return <ChainlinkStakingView />;
      case 'automation':
        return <ChainlinkAutomationView />;
      case 'ecosystem':
        return <ChainlinkEcosystemView />;
      case 'risk':
        return <ChainlinkRiskView />;
      case 'functions':
        return <ChainlinkFunctionsView />;
      case 'proof-of-reserve':
        return <ChainlinkProofOfReserveView />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
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

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <ChainlinkSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as ChainlinkTabId)}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('chainlink.menu.title')}
              />
            </div>

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

            <div className="flex-1 min-w-0">{renderContent()}</div>
          </div>
        </div>
      </div>
    </OracleErrorBoundary>
  );
}
