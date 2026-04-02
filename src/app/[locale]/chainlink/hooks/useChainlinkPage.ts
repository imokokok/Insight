'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useChainlinkAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

import { type ChainlinkTabId } from '../types';

export function useChainlinkPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<ChainlinkTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.CHAINLINK), []);

  const {
    price,
    historicalData,
    networkStats,
    marketData,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useChainlinkAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const updatedConfig = useMemo(() => {
    if (!marketData) return config;

    return {
      ...config,
      marketData: {
        ...config.marketData,
        symbol: marketData.symbol,
        tokenName: marketData.name,
        tokenSymbol: marketData.symbol,
        marketCap: marketData.marketCap,
        volume24h: marketData.totalVolume24h,
        circulatingSupply: marketData.circulatingSupply,
        totalSupply: marketData.totalSupply,
        fullyDilutedValuation: marketData.maxSupply
          ? marketData.currentPrice * marketData.maxSupply
          : config.marketData.fullyDilutedValuation,
        marketCapRank: marketData.marketCapRank,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        change24h: marketData.priceChangePercentage24h,
        change24hValue: marketData.priceChange24h,
        stakingApr: marketData.stakingApr || config.marketData.stakingApr,
      },
    };
  }, [config, marketData]);

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
      market: marketData,
    },
    filename: 'chainlink-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

  const handleTabChange = useCallback((tab: ChainlinkTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    config: updatedConfig,
    price,
    historicalData,
    networkStats,
    marketData,
    isLoading,
    isError,
    error: errors[0] || null,
    lastUpdated,
    isRefreshing,
    dataFreshnessStatus,
    shouldRefreshData: dataFreshnessStatus.status === 'expired',
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
