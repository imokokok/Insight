'use client';

import { useState } from 'react';
import { useChroniclePage } from './hooks/useChroniclePage';
import {
  ChronicleSidebar,
  ChronicleMarketView,
  ChronicleNetworkView,
  ChronicleValidatorsView,
  ChronicleMakerDAOView,
  ChronicleScuttlebuttView,
  ChronicleRiskView,
} from './components';
import { LiveStatusBar } from '@/components/ui/LiveStatusBar';
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { LoadingState, ErrorFallback } from '@/components/oracle';

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

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      title: t('chronicle.stats.activeValidators'),
      value: `${validatorMetrics?.activeValidators ?? 45}+`,
      change: '+2',
      changeType: 'positive' as const,
    },
    {
      title: t('chronicle.stats.makerDAOSupport'),
      value: `${makerDAO?.supportedAssets?.length ?? 5}+`,
      change: '+3',
      changeType: 'positive' as const,
    },
    {
      title: t('chronicle.stats.stakingApr'),
      value: `${staking?.stakingApr ?? 7.8}%`,
      change: '+0.3%',
      changeType: 'positive' as const,
    },
    {
      title: t('chronicle.stats.networkUptime'),
      value: `${networkStats?.nodeUptime ?? 99.95}%`,
      change: '+0.02%',
      changeType: 'positive' as const,
    },
  ];

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
          <ChronicleValidatorsView
            validatorMetrics={validatorMetrics}
            isLoading={isLoading}
          />
        );
      case 'makerdao':
        return (
          <ChronicleMakerDAOView
            makerDAO={makerDAO}
            isLoading={isLoading}
          />
        );
      case 'scuttlebutt':
        return (
          <ChronicleScuttlebuttView
            scuttlebutt={scuttlebutt}
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
          <ChronicleRiskView
            scuttlebutt={scuttlebutt}
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Live Status Bar */}
          <div className="mb-4">
            <LiveStatusBar
              isConnected={!isError}
              latency={140}
              lastUpdate={lastUpdated || undefined}
            />
          </div>

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                <img
                  src="/logos/oracles/chronicle.svg"
                  alt="Chronicle"
                  className="w-7 h-7"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chronicle</h1>
                <p className="text-sm text-gray-500">{t('chronicle.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ${currentPrice.toFixed(2)}
                </p>
                <p className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={refresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('common.refresh')}
                </button>
                <button
                  onClick={() => exportData()}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('common.export')}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-xs mt-1 ${
                  stat.changeType === 'positive' ? 'text-emerald-600' : 'text-gray-500'
                }`}>
                  {stat.changeType === 'positive' ? '↑ ' : '→ '}
                  {stat.change}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {t('chronicle.menu.title')}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute left-0 top-0 h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    {t('chronicle.navigation.title')}
                  </h2>
                  <button onClick={() => setIsMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ChronicleSidebar 
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
