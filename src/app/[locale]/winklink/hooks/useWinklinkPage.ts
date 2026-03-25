'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import { WINkLinkClient } from '@/lib/oracles/winklink';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useWINkLinkAllData } from '@/hooks';
import { WinklinkTabId } from '../types';

export function useWinklinkPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<WinklinkTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.WINKLINK), []);
  const client = useMemo(() => new WINkLinkClient(), []);

  const {
    price,
    historicalData,
    tronIntegration,
    staking,
    gaming,
    networkStats,
    riskMetrics,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useWINkLinkAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      tron: tronIntegration,
      staking,
      gaming,
      network: networkStats,
      risk: riskMetrics,
    },
    filename: 'winklink-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: WinklinkTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    // State
    activeTab,
    config,
    client,
    price,
    historicalData,
    tronIntegration,
    staking,
    gaming,
    networkStats,
    riskMetrics,
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
