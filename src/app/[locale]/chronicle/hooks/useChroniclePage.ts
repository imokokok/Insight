'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useChronicleAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { ChronicleClient } from '@/lib/oracles';
import { OracleProvider } from '@/types/oracle';

import { type ChronicleTabId } from '../types';

export function useChroniclePage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<ChronicleTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.CHRONICLE), []);
  const client = useMemo(() => new ChronicleClient(), []);

  const {
    price,
    historicalData,
    scuttlebutt,
    makerDAO,
    validatorMetrics,
    networkStats,
    staking,
    vaultData,
    crossChainData,
    deviationData,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useChronicleAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      scuttlebutt,
      makerDAO,
      networkStats,
      validatorMetrics,
    },
    filename: 'chronicle-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

  const handleTabChange = useCallback((tab: ChronicleTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    config,
    client,
    price,
    historicalData,
    networkStats,
    validatorMetrics,
    makerDAO,
    scuttlebutt,
    staking,
    vaultData,
    crossChainData,
    deviationData,
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
