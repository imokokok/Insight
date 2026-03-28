'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRefresh, useExport, useBandProtocolAllData, useDataFreshness } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { OracleProvider } from '@/types/oracle';

import { type BandProtocolTabId } from '../types';

export function useBandProtocolPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<BandProtocolTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.BAND_PROTOCOL), []);
  const client = useMemo(() => new BandProtocolClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    validators,
    crossChainStats,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useBandProtocolAllData({
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
      crossChain: crossChainStats,
    },
    filename: 'band-protocol-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const dataFreshnessStatus = useDataFreshness(lastUpdated);

  const handleTabChange = useCallback((tab: BandProtocolTabId) => {
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
    crossChainStats,
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
