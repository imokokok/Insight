'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import { API3Client } from '@/lib/oracles/api3';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useAPI3AllData } from '@/hooks';
import { API3TabId } from '../types';

export function useAPI3Page() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<API3TabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.API3), []);
  const client = useMemo(() => new API3Client(), []);

  const {
    price,
    historicalData,
    airnodeStats,
    dapiCoverage,
    staking,
    firstParty,
    qualityMetrics,
    deviations,
    sourceTrace,
    coverageEvents,
    gasFees,
    ohlc,
    qualityHistory,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useAPI3AllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      airnode: airnodeStats,
      dapi: dapiCoverage,
      staking,
    },
    filename: 'api3-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: API3TabId) => {
    setActiveTab(tab);
  }, []);

  // Calculate last updated time from price data
  const lastUpdated = useMemo(() => {
    if (price?.timestamp) {
      return new Date(price.timestamp);
    }
    return null;
  }, [price]);

  return {
    // State
    activeTab,
    config,
    client,
    price,
    historicalData,
    airnodeStats,
    dapiCoverage,
    staking,
    firstParty,
    qualityMetrics,
    deviations,
    sourceTrace,
    coverageEvents,
    gasFees,
    ohlc,
    qualityHistory,
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
