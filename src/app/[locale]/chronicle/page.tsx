'use client';

import { useState } from 'react';

import { LoadingState, ErrorFallback } from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';

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
    staking,
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
    <div className="min-h-screen bg-insight">
      {/* Hero Section */}
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

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <ChronicleSidebar activeTab={activeTab} onTabChange={setActiveTab} />
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
              {t('chronicle.menu.title')}
            </button>
          </div>

          {/* Mobile Sidebar */}
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

          {/* Content Area */}
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
