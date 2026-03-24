'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PythClient } from '@/lib/oracles/pythNetwork';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { usePythAllData } from '@/hooks/usePythData';
import { PythTabId } from '../types';

export function usePythPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<PythTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.PYTH), []);
  const client = useMemo(() => new PythClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = usePythAllData({
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
      publishers,
      validators,
    },
    filename: 'pyth-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  // Calculate last updated time from price data
  const lastUpdated = useMemo(() => {
    if (price?.timestamp) {
      return new Date(price.timestamp);
    }
    return null;
  }, [price]);

  const handleTabChange = useCallback((tab: PythTabId) => {
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
    publishers,
    validators,
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
