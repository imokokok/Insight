'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DIAClient } from '@/lib/oracles/dia';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  TabNavigation,
  LoadingState,
  ErrorFallback,
} from '@/components/oracle';
import {
  DIANFTDataPanel,
  DIAStakingPanel,
  DIADataFeedsPanel,
  DIAEcosystemPanel,
  DIARiskAssessmentPanel,
} from '@/components/oracle/panels';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useDIAAllData } from '@/hooks/useDIAData';

export default function DIAPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('market');

  const config = getOracleConfig(OracleProvider.DIA);
  const client = useMemo(() => new DIAClient(), []);

  const {
    price,
    historicalData,
    dataTransparency,
    crossChainCoverage,
    dataSourceVerification,
    networkStats,
    staking,
    nftData,
    stakingDetails,
    customFeeds,
    ecosystem,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useDIAAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      transparency: dataTransparency,
      coverage: crossChainCoverage,
      nftData,
      staking,
      ecosystem,
    },
    filename: `dia-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  // Dynamic stats based on active tab
  const stats = useMemo(() => {
    switch (activeTab) {
      case 'market':
        return [
          {
            title: t('dia.stats.marketCap'),
            value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
            change: '+3.2%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.volume24h'),
            value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
            change: '+5.8%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.circulatingSupply'),
            value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M`,
            change: '0%',
            changeType: 'neutral' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.stakingApr'),
            value: `${staking?.stakingApr ?? 8.5}%`,
            change: '+1.2%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ),
          },
        ];
      case 'network':
        return [
          {
            title: t('dia.stats.activeDataSources'),
            value: `${networkStats?.activeDataSources ?? 45}`,
            change: '+3',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.nodeUptime'),
            value: `${networkStats?.nodeUptime ?? 99.8}%`,
            change: '+0.1%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.dataFeeds'),
            value: `${networkStats?.dataFeeds ?? 280}`,
            change: '+12',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.avgResponseTime'),
            value: `${networkStats?.avgResponseTime ?? 150}ms`,
            change: '-10ms',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
        ];
      case 'data-feeds':
        return [
          {
            title: t('dia.stats.totalFeeds'),
            value: `${customFeeds?.length ?? 0}`,
            change: '+5',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.activeFeeds'),
            value: `${customFeeds?.filter((f) => f.status === 'active').length ?? 0}`,
            change: '+3',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.avgConfidence'),
            value: `${(((customFeeds?.reduce((acc, f) => acc + f.confidence, 0) ?? 0) / (customFeeds?.length || 1)) * 100).toFixed(1)}%`,
            change: '+0.5%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.dataSources'),
            value: `${dataTransparency?.length ?? 0}`,
            change: '+2',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            ),
          },
        ];
      case 'nft-data':
        return [
          {
            title: t('dia.stats.totalCollections'),
            value: `${nftData?.totalCollections ?? 0}`,
            change: '+8',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.trendingCollections'),
            value: `${nftData?.trending?.length ?? 0}`,
            change: '+2',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.avgFloorPrice'),
            value: `${((nftData?.collections?.reduce((acc, c) => acc + c.floorPrice, 0) ?? 0) / (nftData?.collections?.length || 1)).toFixed(1)} ETH`,
            change: '+5.2%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.nftChains'),
            value: `${Object.keys(nftData?.byChain ?? {}).length}`,
            change: '+1',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            ),
          },
        ];
      case 'staking':
        return [
          {
            title: t('dia.stats.totalStaked'),
            value: `${((stakingDetails?.totalStaked ?? 0) / 1e6).toFixed(1)}M DIA`,
            change: '+2.5%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.stakingApr'),
            value: `${stakingDetails?.stakingApr ?? 8.5}%`,
            change: '+0.5%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.stakerCount'),
            value: `${(stakingDetails?.stakerCount ?? 0).toLocaleString()}`,
            change: '+150',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.rewardsDistributed'),
            value: `${((stakingDetails?.rewardsDistributed ?? 0) / 1e6).toFixed(1)}M DIA`,
            change: '+8.2%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                />
              </svg>
            ),
          },
        ];
      case 'ecosystem':
        return [
          {
            title: t('dia.stats.totalProtocols'),
            value: `${ecosystem?.length ?? 0}`,
            change: '+3',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.totalTvl'),
            value: `$${((ecosystem?.reduce((acc, p) => acc + p.tvl, 0) ?? 0) / 1e9).toFixed(1)}B`,
            change: '+12.5%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.dexIntegrations'),
            value: `${ecosystem?.filter((p) => p.category === 'dex').length ?? 0}`,
            change: '+1',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.lendingIntegrations'),
            value: `${ecosystem?.filter((p) => p.category === 'lending').length ?? 0}`,
            change: '+1',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
        ];
      case 'risk':
      default:
        return [
          {
            title: t('dia.stats.networkUptime'),
            value: `${networkStats?.nodeUptime ?? 99.8}%`,
            change: '+0.1%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.dataQuality'),
            value: '98.5%',
            change: '+0.3%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.oracleDiversity'),
            value: `${dataTransparency?.length ?? 0}`,
            change: '+2',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            ),
          },
          {
            title: t('dia.stats.avgConfidence'),
            value: '96.8%',
            change: '+0.8%',
            changeType: 'positive' as const,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
        ];
    }
  }, [
    activeTab,
    config.marketData,
    t,
    networkStats,
    nftData,
    customFeeds,
    dataTransparency,
    stakingDetails,
    ecosystem,
    staking,
  ]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={t('dia.title')}
        subtitle={t('dia.subtitle')}
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            oracleTabs={config.tabs}
            themeColor={config.themeColor}
          />
        </div>
      </div>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {activeTab === 'market' && (
            <>
              <div className="mb-6">
                <MarketDataPanel
                  client={client}
                  chain={config.defaultChain}
                  config={config.marketData}
                  iconBgColor={config.iconBgColor}
                  icon={config.icon}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title={t('dia.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('dia.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('dia.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('dia.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('dia.stats.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M DIA
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{t('dia.stats.stakingApr')}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {staking?.stakingApr ?? 8.5}%
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </>
          )}

          {activeTab === 'network' && (
            <div className="space-y-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {activeTab === 'data-feeds' && (
            <div className="space-y-6">
              <DIADataFeedsPanel feeds={customFeeds} dataSources={dataTransparency} />
            </div>
          )}

          {activeTab === 'nft-data' && (
            <div className="space-y-6">
              <DIANFTDataPanel nftData={nftData} />
            </div>
          )}

          {activeTab === 'staking' && (
            <div className="space-y-6">
              <DIAStakingPanel stakingDetails={stakingDetails} />
            </div>
          )}

          {activeTab === 'ecosystem' && (
            <div className="space-y-6">
              <DIAEcosystemPanel integrations={ecosystem} />
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <DIARiskAssessmentPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
