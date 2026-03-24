'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { BandProtocolTabId } from '../types';
import type { PriceData } from '@/types/oracle';
import type { BandNetworkStats, ValidatorInfo, CrossChainStats } from '@/lib/oracles/bandProtocol';

export function useBandProtocolPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<BandProtocolTabId>('market');
  const [price, setPrice] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [networkStats, setNetworkStats] = useState<BandNetworkStats | null>(null);
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [crossChainStats, setCrossChainStats] = useState<CrossChainStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const config = useMemo(() => getOracleConfig(OracleProvider.BAND_PROTOCOL), []);
  const client = useMemo(() => new BandProtocolClient(), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const promises: Promise<unknown>[] = [
        client.getPrice(config.symbol, config.defaultChain),
        client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
        client.getNetworkStats(),
        client.getValidators(20),
        client.getCrossChainStats(),
      ];

      const results = await Promise.all(promises);
      setPrice(results[0] as PriceData);
      setHistoricalData(results[1] as PriceData[]);
      setNetworkStats(results[2] as BandNetworkStats);
      setValidators(results[3] as ValidatorInfo[]);
      setCrossChainStats(results[4] as CrossChainStats);
      setLastUpdated(new Date());
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [client, config.symbol, config.defaultChain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    onRefresh: fetchData,
    minLoadingTime: 500,
  });

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
    error,
    lastUpdated,
    isRefreshing,
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
