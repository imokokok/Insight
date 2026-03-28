'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useWINkLinkAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { WINkLinkClient } from '@/lib/oracles/winklink';
import { OracleProvider } from '@/types/oracle';

import { type WinklinkTabId } from '../types';

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

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

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
    dataFreshnessStatus,
    shouldRefreshData: dataFreshnessStatus.status === 'expired',

    // Actions
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
