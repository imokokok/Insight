'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import { DIAClient } from '@/lib/oracles/dia';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useDIAAllData } from '@/hooks';
import { DIATabId } from '../types';

export function useDIAPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<DIATabId>('market');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const config = useMemo(() => getOracleConfig(OracleProvider.DIA), []);
  const client = useMemo(() => new DIAClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useDIAAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  // Update lastUpdated when price changes
  useEffect(() => {
    if (price) {
      setLastUpdated(new Date());
    }
  }, [price]);

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
    },
    filename: 'dia-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: DIATabId) => {
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
