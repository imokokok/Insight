'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

import {
  BandProtocolSidebar,
  BandProtocolMarketView,
  BandProtocolNetworkView,
  BandProtocolValidatorsView,
  BandProtocolCrossChainView,
  BandProtocolDataFeedsView,
  BandProtocolRiskView,
  BandProtocolHero,
} from './components';
import { useBandProtocolPage } from './hooks/useBandProtocolPage';
import { type BandProtocolTabId } from './types';

export default function BandProtocolPage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    validators,
    crossChainStats,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    setActiveTab,
    refresh,
    exportData,
    t,
  } = useBandProtocolPage();

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
          <BandProtocolMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <BandProtocolNetworkView
            config={config}
            networkStats={networkStats}
            isLoading={isLoading}
          />
        );
      case 'validators':
        return <BandProtocolValidatorsView validators={validators} isLoading={isLoading} />;
      case 'cross-chain':
        return (
          <BandProtocolCrossChainView crossChainStats={crossChainStats} isLoading={isLoading} />
        );
      case 'data-feeds':
        return <BandProtocolDataFeedsView />;
      case 'risk':
        return <BandProtocolRiskView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-insight">
      {/* Hero Section */}
      <BandProtocolHero
        config={config}
        price={price ?? null}
        historicalData={historicalData}
        networkStats={
          networkStats
            ? {
                avgResponseTime: Math.round(networkStats.blockTime * 1000),
                nodeUptime: 99.9,
                dataFeeds: config.networkData.dataFeeds,
              }
            : undefined
        }
        validators={
          validators
            ? {
                totalValidators: validators.length,
                activeValidators: validators.filter((v) => !v.jailed).length,
                averageUptime:
                  validators.reduce((acc, v) => acc + v.uptime, 0) / (validators.length || 1),
              }
            : undefined
        }
        crossChainStats={
          crossChainStats
            ? {
                supportedChains: crossChainStats.chains.map((c) => c.chainName),
                bridgeVolume24h: crossChainStats.totalRequests24h,
                activeBridges: crossChainStats.chains.length,
              }
            : undefined
        }
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
              <BandProtocolSidebar
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as BandProtocolTabId)}
                themeColor={config.themeColor}
              />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <MobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              themeColor={config.themeColor}
              label={t('bandProtocol.menu.title')}
            />
          </div>

          {/* Mobile Sidebar */}
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            title={t('bandProtocol.navigation.title')}
          >
            <BandProtocolSidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab as BandProtocolTabId);
                setIsMobileMenuOpen(false);
              }}
              themeColor={config.themeColor}
            />
          </MobileSidebar>

          {/* Content Area */}
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
