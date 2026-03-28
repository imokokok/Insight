'use client';

import { useState, useCallback, useMemo } from 'react';

import {
  useRefresh,
  useExport,
  useRedStoneAllData,
  useRedStoneProviders,
  useRedStoneMetrics,
  useDataFreshness,
} from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { RedStoneClient } from '@/lib/oracles/redstone';
import { OracleProvider } from '@/types/oracle';

import { type RedStoneTabId } from '../types';

export function useRedStonePage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<RedStoneTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.REDSTONE), []);
  const redstoneClient = useMemo(() => new RedStoneClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    isLoading: allDataLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useRedStoneAllData({
    symbol: config.symbol,
    enabled: true,
  });

  const { providers, isLoading: providersLoading } = useRedStoneProviders(true);
  const { metrics, isLoading: metricsLoading } = useRedStoneMetrics(true);

  const isLoading = allDataLoading || providersLoading || metricsLoading;

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
      providers,
      metrics,
    },
    filename: 'redstone-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

  const handleTabChange = useCallback((tab: RedStoneTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    providers,
    metrics,
    redstoneClient,
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
