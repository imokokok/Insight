'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

import { useRefresh, useExport } from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { UMAClient } from '@/lib/oracles/uma';
import {
  type ValidatorData,
  type DisputeData,
  type UMANetworkStats,
} from '@/lib/oracles/uma/types';
import { OracleProvider, type PriceData } from '@/types/oracle';

import { type UmaTabId } from '../types';

export function useUmaPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<UmaTabId>('market');
  const [price, setPrice] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<
    ReturnType<UMAClient['getHistoricalPrices']> extends Promise<infer T> ? T : never
  >([]);
  const [networkStats, setNetworkStats] = useState<UMANetworkStats | null>(null);
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const config = useMemo(() => getOracleConfig(OracleProvider.UMA), []);
  const client = useMemo(() => new UMAClient(), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const [priceData, historical, stats, validatorsData, disputesData] = await Promise.all([
        client.getPrice(config.symbol, config.defaultChain),
        client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
        client.getNetworkStats(),
        client.getValidators(),
        client.getDisputes(),
      ]);

      setPrice(priceData);
      setHistoricalData(historical);
      setNetworkStats(stats);
      setValidators(validatorsData);
      setDisputes(disputesData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch UMA data');
      setError(errorObj);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [client, config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: fetchData,
    minLoadingTime: 500,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
      validators,
      disputes,
    },
    filename: 'uma-data',
  });

  const handleTabChange = useCallback((tab: UmaTabId) => {
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
    validators,
    disputes,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,

    // Actions
    setActiveTab: handleTabChange,
    refresh,
    exportData,
    t,
  };
}
