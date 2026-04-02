'use client';

import { useState } from 'react';

import {
  LoadingState,
  ErrorFallback,
  MobileMenuButton,
  OracleErrorBoundary,
} from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';

import {
  BandProtocolSidebar,
  BandProtocolMarketView,
  BandProtocolNetworkView,
  BandProtocolValidatorsView,
  BandProtocolCrossChainView,
  BandProtocolDataFeedsView,
  BandProtocolOracleScriptsView,
  BandProtocolRiskView,
  BandProtocolIBCView,
  BandProtocolStakingView,
  BandProtocolGovernanceView,
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
    ibcConnections,
    ibcTransferStats,
    ibcTransferTrends,
    stakingInfo,
    stakingDistribution,
    governanceProposals,
    governanceParams,
    dataSources,
    dataSourcesTotal,
    dataSourcesLoading,
    dataSourcesError,
    oracleScripts,
    oracleScriptsLoading,
    oracleScriptsError,
    isLoading,
    isError,
    error,
    aggregatedError,
    lastUpdated,
    isRefreshing,

    setActiveTab,
    refresh,
    refetchDataSources,
    refetchOracleScripts,
    exportData,
    t,
  } = useBandProtocolPage();

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
        return (
          <BandProtocolValidatorsView
            validators={validators}
            isLoading={isLoading}
            error={aggregatedError}
            onRefresh={refresh}
          />
        );
      case 'cross-chain':
        return (
          <BandProtocolCrossChainView crossChainStats={crossChainStats} isLoading={isLoading} />
        );
      case 'ibc':
        return (
          <BandProtocolIBCView
            ibcConnections={ibcConnections}
            ibcTransferStats={ibcTransferStats}
            ibcTransferTrends={ibcTransferTrends}
            isLoading={isLoading}
          />
        );
      case 'staking':
        return (
          <BandProtocolStakingView
            stakingInfo={stakingInfo}
            stakingDistribution={stakingDistribution}
            isLoading={isLoading}
          />
        );
      case 'governance':
        return (
          <BandProtocolGovernanceView
            proposals={governanceProposals}
            governanceParams={governanceParams}
            isLoading={isLoading}
          />
        );
      case 'data-feeds':
        return (
          <BandProtocolDataFeedsView
            dataSources={dataSources}
            total={dataSourcesTotal}
            isLoading={dataSourcesLoading}
            error={dataSourcesError || aggregatedError}
            onRefresh={refetchDataSources}
          />
        );
      case 'oracle-scripts':
        return (
          <BandProtocolOracleScriptsView
            oracleScripts={oracleScripts}
            isLoading={oracleScriptsLoading}
            error={oracleScriptsError || aggregatedError}
            onRefresh={refetchOracleScripts}
          />
        );
      case 'risk':
        return <BandProtocolRiskView />;
      default:
        return null;
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={refresh}>
      <div className="min-h-screen bg-insight">
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

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <BandProtocolSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as BandProtocolTabId)}
                  themeColor={config.themeColor}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('band.bandProtocol.menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('band.bandProtocol.navigation.title')}
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

            <div className="flex-1 min-w-0">{renderContent()}</div>
          </div>
        </div>
      </div>
    </OracleErrorBoundary>
  );
}
