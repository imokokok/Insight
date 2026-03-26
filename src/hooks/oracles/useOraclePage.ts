'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from '@/i18n';
import { OracleProvider, Blockchain, PriceData } from '@/types/oracle';
import { getOracleConfig, OracleConfig } from '@/lib/config/oracles';
import { useRefresh, useExport } from '@/hooks';
import { useChainlinkAllData } from './chainlink';
import { usePythAllData } from './pyth';

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

export interface PublisherData {
  id: string;
  name: string;
  status: string;
  contribution: number;
  accuracy: number;
  stake?: number;
}

export interface ValidatorData {
  id: string;
  name: string;
  stake: number;
  performance: number;
  status: string;
  uptime?: number;
  rewards?: number;
}

export interface UseOraclePageOptions {
  provider: OracleProvider;
  symbol?: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseOraclePageReturn {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  config: OracleConfig;
  price?: PriceData;
  historicalData?: PriceData[];
  networkStats?: NetworkStats;
  publishers?: PublisherData[];
  validators?: ValidatorData[];
  customData?: Record<string, unknown>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  refresh: () => void;
  exportData: () => void;
}

const providerHooks: Record<
  OracleProvider,
  (options: { symbol: string; chain: Blockchain; enabled: boolean }) => ProviderDataResult
> = {
  [OracleProvider.CHAINLINK]: useChainlinkAllData,
  [OracleProvider.PYTH]: usePythAllData,
  [OracleProvider.BAND_PROTOCOL]: useChainlinkAllData,
  [OracleProvider.UMA]: useChainlinkAllData,
  [OracleProvider.API3]: useChainlinkAllData,
  [OracleProvider.REDSTONE]: useChainlinkAllData,
  [OracleProvider.DIA]: useChainlinkAllData,
  [OracleProvider.TELLOR]: useChainlinkAllData,
  [OracleProvider.CHRONICLE]: useChainlinkAllData,
  [OracleProvider.WINKLINK]: useChainlinkAllData,
};

interface ProviderDataResult {
  price?: PriceData;
  historicalData?: PriceData[];
  networkStats?: NetworkStats;
  publishers?: PublisherData[];
  validators?: ValidatorData[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => void;
  lastUpdated?: Date | null;
}

export function useOraclePage(options: UseOraclePageOptions): UseOraclePageReturn {
  const { provider, symbol: customSymbol, chain: customChain, enabled = true } = options;
  const t = useTranslations();
  
  const [activeTab, setActiveTab] = useState('market');
  
  const config = useMemo(() => getOracleConfig(provider), [provider]);
  
  const symbol = customSymbol || config.symbol;
  const chain = customChain || config.defaultChain;

  const providerHook = providerHooks[provider] || useChainlinkAllData;
  
  const providerData = providerHook({
    symbol,
    chain,
    enabled,
  });

  const {
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading: providerIsLoading,
    isError: providerIsError,
    errors,
    refetchAll,
    lastUpdated: providerLastUpdated,
  } = providerData;

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (providerLastUpdated) {
      setLastUpdated(providerLastUpdated);
    } else if (price?.timestamp) {
      setLastUpdated(new Date(price.timestamp));
    }
  }, [providerLastUpdated, price?.timestamp]);

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      provider,
      price,
      historical: historicalData,
      network: networkStats,
      publishers,
      validators,
    },
    filename: `${provider}-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const error = errors[0] || null;

  return {
    activeTab,
    setActiveTab: handleTabChange,
    config,
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading: providerIsLoading,
    isError: providerIsError,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    exportData,
  };
}
