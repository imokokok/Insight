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
import { OracleProvider } from '@/types/oracle';

import { useRedStoneClient } from '../context/RedStoneClientContext';
import { type RedStoneTabId } from '../types';

export function useRedStonePage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<RedStoneTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.REDSTONE), []);
  const redstoneClient = useRedStoneClient();

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
    client: redstoneClient,
  });

  const {
    providers,
    isLoading: providersLoading,
    error: providersError,
  } = useRedStoneProviders(redstoneClient, true);
  const {
    metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useRedStoneMetrics(redstoneClient, true);

  const isLoading = allDataLoading || providersLoading || metricsLoading;

  const failedDataSources = useMemo(() => {
    const failed: string[] = [];
    if (errors.some((e) => e?.message.includes('price'))) {
      failed.push(t('common.price.title'));
    }
    if (errors.some((e) => e?.message.includes('historical'))) {
      failed.push(t('redstone.tabs.historical'));
    }
    if (errors.some((e) => e?.message.includes('network'))) {
      failed.push(t('redstone.network.title'));
    }
    if (providersError) {
      failed.push(t('redstone.providers.title'));
    }
    if (metricsError) {
      failed.push(t('redstone.metrics.title'));
    }
    return failed;
  }, [errors, providersError, metricsError, t]);

  const hasPartialData = failedDataSources.length > 0 && !isError;

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
    hasPartialData,
    failedDataSources,
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
