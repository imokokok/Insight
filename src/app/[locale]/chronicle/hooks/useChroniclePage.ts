'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChronicleClient } from '@/lib/oracles';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useChronicleAllData } from '@/hooks/useChronicleData';
import { ChronicleTabId } from '../types';

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

  const handleTabChange = useCallback((tab: ChronicleTabId) => {
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
    validatorMetrics,
    makerDAO,
    scuttlebutt,
    staking,
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
