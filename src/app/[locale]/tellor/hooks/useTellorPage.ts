'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useTellorAllData } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { TellorClient } from '@/lib/oracles/tellor';
import { OracleProvider } from '@/types/oracle';

import { type TellorTabId } from '../types';

export function useTellorPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TellorTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.TELLOR), []);
  const client = useMemo(() => new TellorClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    networkHealth,
    reporters,
    disputes,
    staking,
    ecosystem,
    risk,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useTellorAllData({
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
    filename: 'tellor-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: TellorTabId) => {
    setActiveTab(tab);
  }, []);

  const lastUpdated = useMemo(() => {
    return price?.timestamp ? new Date(price.timestamp) : null;
  }, [price]);

  return {
    // State
    activeTab,
    config,
    client,
    price,
    historicalData,
    networkStats,
    networkHealth,
    reporters,
    disputes,
    staking,
    ecosystem,
    risk,
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
