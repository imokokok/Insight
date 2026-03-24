'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useChainlinkPage } from './hooks/useChainlinkPage';
import {
  ChainlinkSidebar,
  ChainlinkMarketView,
  ChainlinkNetworkView,
  ChainlinkNodesView,
  ChainlinkDataFeedsView,
  ChainlinkServicesView,
  ChainlinkEcosystemView,
  ChainlinkRiskView,
} from './components';
import { LiveStatusBar } from '@/components/ui/LiveStatusBar';
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { LoadingState, ErrorFallback, PageHeader } from '@/components/oracle';
import { PriceChart } from '@/components/oracle';

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

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      title: t('chainlink.stats.decentralizedNodes'),
      value: `${config.networkData.activeNodes.toLocaleString()}+`,
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: t('chainlink.stats.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral' as const,
    },
    {
      title: t('chainlink.stats.dataFeeds'),
      value: `${config.networkData.dataFeeds.toLocaleString()}+`,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: t('chainlink.stats.totalValueSecured'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(1)}B+`,
      change: '+8%',
      changeType: 'positive' as const,
    },
  ];

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
          <ChainlinkNetworkView
            config={config}
            networkStats={networkStats}
            isLoading={isLoading}
          />
        );
      case 'nodes':
        return <ChainlinkNodesView />;
      case 'data-feeds':
        return <ChainlinkDataFeedsView />;
      case 'services':
        return <ChainlinkServicesView />;
      case 'ecosystem':
        return <ChainlinkEcosystemView />;
      case 'cross-oracle':
        return (
          <div className="space-y-4">
            <CrossOracleComparison />
          </div>
        );
      case 'risk':
        return <ChainlinkRiskView />;
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
              latency={245}
              lastUpdate={lastUpdated || undefined}
            />
          </div>

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <img
                  src="/logos/oracles/chainlink.svg"
                  alt="Chainlink"
                  className="w-7 h-7"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chainlink</h1>
                <p className="text-sm text-gray-500">{t('chainlink.subtitle')}</p>
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
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
              <ChainlinkSidebar activeTab={activeTab} onTabChange={setActiveTab} />
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
              {t('chainlink.menu.title')}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute left-0 top-0 h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    {t('chainlink.navigation.title')}
                  </h2>
                  <button onClick={() => setIsMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ChainlinkSidebar 
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
