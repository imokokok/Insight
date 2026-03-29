'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

import { useRefresh, useExport } from '@/hooks';
import { getOracleConfig, type OracleConfig } from '@/lib/config/oracles';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency?: number;
  hourlyActivity?: number[];
  status?: string;
  totalStaked?: number;
  updateFrequency?: number;
}

export interface OraclePageData {
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  exportData: () => void;
  config: OracleConfig;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export interface UseOraclePageOptions {
  provider: OracleProvider;
  symbol?: string;
  chain?: Blockchain;
  enabled?: boolean;
  defaultTab?: string;
}

export function useOraclePage(options: UseOraclePageOptions): OraclePageData {
  const {
    provider,
    symbol: customSymbol,
    chain: customChain,
    enabled = true,
    defaultTab = 'market',
  } = options;

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [price, setPrice] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const config = useMemo(() => getOracleConfig(provider), [provider]);

  const symbol = customSymbol || config.symbol;
  const chain = customChain || config.defaultChain;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const [priceResult, historicalResult] = await Promise.all([
        config.client.getPrice(symbol, chain),
        config.client.getHistoricalPrices(symbol, chain),
      ]);

      setPrice(priceResult);
      setHistoricalData(historicalResult);

      if (config.networkData) {
        setNetworkStats({
          activeNodes: config.networkData.activeNodes,
          dataFeeds: config.networkData.dataFeeds,
          nodeUptime: config.networkData.nodeUptime,
          avgResponseTime: config.networkData.avgResponseTime,
          latency: config.networkData.latency,
          hourlyActivity: config.networkData.hourlyActivity,
          status: config.networkData.status,
          totalStaked: config.networkData.totalStaked,
          updateFrequency: config.networkData.updateFrequency,
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch oracle data'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, config, symbol, chain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { exportData: baseExportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      provider,
      price,
      historical: historicalData,
      network: networkStats,
    },
    filename: `${provider}-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await fetchData();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const exportData = useCallback(() => {
    baseExportData();
  }, [baseExportData]);

  return {
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    exportData,
    config,
    activeTab,
    setActiveTab: handleTabChange,
  };
}
