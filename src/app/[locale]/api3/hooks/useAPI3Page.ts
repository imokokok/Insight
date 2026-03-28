'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useAPI3AllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

import { type API3TabId } from '../types';

export function useAPI3Page() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<API3TabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.API3), []);

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

  const lastUpdated = useMemo(() => {
    if (price?.timestamp) {
      return new Date(price.timestamp);
    }
    return new Date();
  }, [price?.timestamp]);

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

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

  return {
    activeTab,
    config,
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
    dataFreshnessStatus,
    shouldRefreshData: dataFreshnessStatus.status === 'expired',
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
