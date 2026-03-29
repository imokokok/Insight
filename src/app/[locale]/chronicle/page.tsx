'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback, MobileMenuButton, OracleErrorBoundary } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';

import {
  ChronicleSidebar,
  ChronicleMarketView,
  ChronicleNetworkView,
  ChronicleValidatorsView,
  ChronicleMakerDAOView,
  ChronicleScuttlebuttView,
  ChronicleRiskView,
  ChronicleHero,
} from './components';
import { useChroniclePage } from './hooks/useChroniclePage';
import { type ChronicleTabId } from './types';

export default function ChroniclePage() {
  const {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    validatorMetrics,
    makerDAO,
    scuttlebutt,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,

    setActiveTab,
    refresh,
    exportData,
    t,
  } = useChroniclePage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isInitialLoading = isLoading && !price && !historicalData?.length && !networkStats;
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
          <ChronicleMarketView
            config={config}
            price={price}
            historicalData={historicalData || []}
            networkStats={networkStats}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <ChronicleNetworkView
            config={config}
            networkStats={networkStats}
            validatorMetrics={validatorMetrics}
            isLoading={isLoading}
          />
        );
      case 'validators':
        return (
          <ChronicleValidatorsView validatorMetrics={validatorMetrics} isLoading={isLoading} />
        );
      case 'makerdao':
        return <ChronicleMakerDAOView makerDAO={makerDAO} isLoading={isLoading} />;
      case 'scuttlebutt':
        return <ChronicleScuttlebuttView scuttlebutt={scuttlebutt} isLoading={isLoading} />;
      case 'risk':
        return <ChronicleRiskView scuttlebutt={scuttlebutt} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
        <ChronicleHero
          config={config}
          price={price}
          historicalData={historicalData || []}
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
                <ChronicleSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as ChronicleTabId)}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('chronicle.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('chronicle.navigation.title')}
            >
              <ChronicleSidebar
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
