'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useChainlinkAllData } from '@/hooks/useChainlinkData';
import { ChainlinkTabId } from '../types';

export function useChainlinkPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<ChainlinkTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.CHAINLINK), []);
  const client = useMemo(() => new ChainlinkClient(), []);

  const {
    price,
    historicalData,
    networkStats,
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

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
    },
    filename: 'chainlink-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: ChainlinkTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    // State
    activeTab,
    config,
    client,
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    error: errors[0] || null,
    lastUpdated,
    isRefreshing,

    // Actions
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
