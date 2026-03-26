'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useRedStoneAllData } from '@/hooks';
import { useTranslations } from '@/i18n';
import { RedStoneClient } from '@/lib/oracles/redstone';

import { type RedStoneTabId } from '../types';

export function useRedStonePage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<RedStoneTabId>('market');

  const client = useMemo(() => new RedStoneClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useRedStoneAllData({
    symbol: 'REDSTONE',
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
    },
    filename: 'redstone-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: RedStoneTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    client,
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    error: errors[0] || null,
    lastUpdated,
    isRefreshing,
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
