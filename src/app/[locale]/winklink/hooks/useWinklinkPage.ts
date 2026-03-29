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
    dataStates,
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

  const criticalDataSources = ['price', 'network'];
  const hasAllCriticalErrors = criticalDataSources.every(
    (key) => dataStates[key as keyof typeof dataStates]?.isError
  );
  const hasPartialErrors =
    isError && !hasAllCriticalErrors && Object.values(dataStates).some((ds) => ds.isError);

  const failedDataSources = useMemo(() => {
    return Object.entries(dataStates)
      .filter(([, state]) => state.isError)
      .map(([key]) => key);
  }, [dataStates]);

  const loadingDataSources = useMemo(() => {
    return Object.entries(dataStates)
      .filter(([, state]) => state.isLoading)
      .map(([key]) => key);
  }, [dataStates]);

  return {
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
    errors,
    lastUpdated,
    isRefreshing,
    dataFreshnessStatus,
    shouldRefreshData: dataFreshnessStatus.status === 'expired',
    dataStates,
    hasAllCriticalErrors,
    hasPartialErrors,
    failedDataSources,
    loadingDataSources,

    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
