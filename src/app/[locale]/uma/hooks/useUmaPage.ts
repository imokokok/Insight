'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useUMAAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { UMAClient } from '@/lib/oracles/uma';
import { OracleProvider } from '@/types/oracle';

import { type UmaTabId } from '../types';

export function useUmaPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<UmaTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.UMA), []);
  const client = useMemo(() => new UMAClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    validators,
    disputes,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useUMAAllData({
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
      validators,
      disputes,
    },
    filename: 'uma-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

  const handleTabChange = useCallback((tab: UmaTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    config,
    client,
    price,
    historicalData,
    networkStats,
    validators,
    disputes,
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
