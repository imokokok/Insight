'use client';

import { useState, useMemo } from 'react';

import {
  LoadingState,
  ErrorFallback,
  MobileMenuButton,
  OracleErrorBoundary,
} from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTellorPrice, useTellorHistorical, useTellorNetworkStats } from '@/hooks/oracles/tellor';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

import { TellorDisputesView } from './components/TellorDisputesView';
import { TellorEcosystemView } from './components/TellorEcosystemView';
import { TellorGovernanceView } from './components/TellorGovernanceView';
import { TellorHero } from './components/TellorHero';
import { TellorMarketView } from './components/TellorMarketView';
import { TellorNetworkView } from './components/TellorNetworkView';
import { TellorReportersView } from './components/TellorReportersView';
import { TellorRiskView } from './components/TellorRiskView';
import { TellorSidebar } from './components/TellorSidebar';
import { TellorStakingView } from './components/TellorStakingView';
import { type NetworkStats, type TellorTabId } from './types';

interface TellorPageClientProps {
  locale: string;
}

export function TellorPageClient({ locale }: TellorPageClientProps) {
  const t = useTranslations('tellor');
  const config = useMemo(() => getOracleConfig(OracleProvider.TELLOR), []);
  const [activeTab, setActiveTab] = useState<TellorTabId>('market');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 使用 hooks 获取真实数据
  const {
    price,
    isLoading: isPriceLoading,
    error: priceError,
    refetch: refetchPrice,
  } = useTellorPrice({ symbol: 'TRB' });

  const {
    historicalData,
    isLoading: isHistoricalLoading,
    refetch: refetchHistorical,
  } = useTellorHistorical({ symbol: 'TRB', period: 7 });

  const {
    networkStats: tellorNetworkStats,
    isLoading: isNetworkStatsLoading,
    refetch: refetchNetworkStats,
  } = useTellorNetworkStats();

  const isLoading = isPriceLoading || isHistoricalLoading || isNetworkStatsLoading;
  const isError = !!priceError;
  const isRefreshing = isLoading;
  const lastUpdated = price ? new Date(price.timestamp) : null;

  // 转换网络统计数据格式
  const networkStats: NetworkStats | null = tellorNetworkStats
    ? {
        activeNodes: tellorNetworkStats.activeNodes,
        dataFeeds: tellorNetworkStats.dataFeeds,
        nodeUptime: tellorNetworkStats.nodeUptime,
        avgResponseTime: tellorNetworkStats.avgResponseTime,
        latency: tellorNetworkStats.latency,
      }
    : null;

  const handleRefresh = () => {
    refetchPrice();
    refetchHistorical();
    refetchNetworkStats();
  };

  const handleExport = () => {};

  const isInitialLoading = isLoading && !price && !historicalData.length && !networkStats;
  const hasCriticalError = isError && !price;

  if (isInitialLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (hasCriticalError) {
    return (
      <ErrorFallback
        error={new Error('Failed to load data')}
        onRetry={handleRefresh}
        themeColor={config.themeColor}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return (
          <TellorMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
          />
        );
      case 'network':
        return (
          <TellorNetworkView
            config={config}
            networkStats={networkStats}
            networkHealth={null}
            isLoading={isLoading}
          />
        );
      case 'reporters':
        return <TellorReportersView isLoading={isLoading} />;
      case 'disputes':
        return <TellorDisputesView isLoading={isLoading} />;
      case 'staking':
        return <TellorStakingView isLoading={isLoading} />;
      case 'ecosystem':
        return <TellorEcosystemView ecosystem={null} isLoading={isLoading} />;
      case 'risk':
        return <TellorRiskView risk={null} isLoading={isLoading} />;
      case 'governance':
        return (
          <TellorGovernanceView
            proposals={[]}
            votingWeights={[]}
            stats={undefined}
            isLoading={isLoading}
          />
        );
      default:
        return (
          <TellorMarketView
            config={config}
            price={price}
            historicalData={historicalData}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <OracleErrorBoundary themeColor={config.themeColor} onReset={handleRefresh}>
      <div className="min-h-screen bg-insight">
        <TellorHero
          config={config}
          price={price ?? null}
          historicalData={historicalData}
          isLoading={isLoading}
          isError={isError}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <TellorSidebar activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </div>

            <div className="lg:hidden">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                themeColor={config.themeColor}
                label={t('menu.title')}
              />
            </div>

            <MobileSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              title={t('navigation.title')}
            >
              <TellorSidebar
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

export default TellorPageClient;
