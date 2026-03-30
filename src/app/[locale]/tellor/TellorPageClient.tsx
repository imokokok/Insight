'use client';

import { useState, useMemo } from 'react';

import {
  LoadingState,
  ErrorFallback,
  MobileMenuButton,
  OracleErrorBoundary,
} from '@/components/oracle';
import { MobileSidebar } from '@/components/ui/MobileSidebar';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';
import { OracleProvider } from '@/types/oracle';
import { type NetworkStats, type TellorTabId } from './types';

import { TellorHero } from './components/TellorHero';
import { TellorSidebar } from './components/TellorSidebar';
import { TellorMarketView } from './components/TellorMarketView';
import { TellorNetworkView } from './components/TellorNetworkView';
import { TellorReportersView } from './components/TellorReportersView';
import { TellorDisputesView } from './components/TellorDisputesView';
import { TellorStakingView } from './components/TellorStakingView';
import { TellorEcosystemView } from './components/TellorEcosystemView';
import { TellorRiskView } from './components/TellorRiskView';
import { TellorGovernanceView } from './components/TellorGovernanceView';

interface TellorPageClientProps {
  locale: string;
}

export function TellorPageClient({ locale }: TellorPageClientProps) {
  const t = useTranslations('tellor');
  const config = useMemo(() => getOracleConfig(OracleProvider.TELLOR), []);
  const [activeTab, setActiveTab] = useState<TellorTabId>('market');
  const [price, setPrice] = useState<PriceData | null>({
    price: config.marketData?.change24hValue || 45.85,
    timestamp: Date.now(),
    confidence: 0.95,
    provider: OracleProvider.TELLOR,
    symbol: 'TRB',
  });
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>({
    activeNodes: 72,
    dataFeeds: 350,
    nodeUptime: 99.9,
    avgResponseTime: 95,
    latency: 120,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const handleExport = () => {
    console.log('Export data');
  };

  const isInitialLoading = isLoading && !price && !historicalData.length && !networkStats;
  const hasCriticalError = isError && !price;

  if (isInitialLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (hasCriticalError) {
    return <ErrorFallback error={new Error('Failed to load data')} onRetry={handleRefresh} themeColor={config.themeColor} />;
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
        return <TellorGovernanceView proposals={[]} votingWeights={[]} stats={undefined} isLoading={isLoading} />;
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
          price={price}
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
                <TellorSidebar
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
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
