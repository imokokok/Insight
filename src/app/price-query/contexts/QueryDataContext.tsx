'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import { refreshIntervalToMs, type RefreshInterval } from '@/hooks/useAutoRefresh';
import { safeMax, safeMin } from '@/lib/utils';
import { type PriceData, type OracleProvider, type Blockchain } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { usePriceQueryData, type QueryError } from '../hooks/usePriceQueryData';

import { useQueryParams } from './QueryParamsContext';

import type { AnomalyInfo } from '../utils/priceValidator';

interface Stats {
  validPrices: number[];
  avgPrice: number;
  avgChange24hPercent: number | undefined;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  compareValidPrices: number[];
  compareAvgPrice: number;
  compareAvgChange24hPercent: number | undefined;
  compareMaxPrice: number;
  compareMinPrice: number;
  comparePriceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

interface QueryDataContextValue {
  queryResults: QueryResult[];
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  compareDataFetchTime: Date | null;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  isLoading: boolean;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  clearErrors: () => void;
  retryDataSource: (provider: OracleProvider, chain: Blockchain) => Promise<void>;
  retryAllErrors: () => Promise<void>;
  refetch: () => Promise<void>;
  validationWarnings: string[];
  dataAnomalies: AnomalyInfo[];
  hasDataQualityIssues: boolean;
  stats: Stats;
  autoRefresh: {
    isAutoRefreshEnabled: boolean;
    refreshInterval: RefreshInterval;
    lastRefreshedAt: Date | null;
    nextRefreshAt: Date | null;
    setRefreshInterval: (interval: RefreshInterval) => void;
    toggleAutoRefresh: () => void;
    isRefreshing: boolean;
  };
}

const QueryDataContext = createContext<QueryDataContextValue | null>(null);

export function QueryDataProvider({ children }: { children: React.ReactNode }) {
  const { urlParamsParsed, selectedOracle, selectedChain, selectedSymbol, isCompareMode } =
    useQueryParams();

  const [autoRefreshInterval, setAutoRefreshInterval] = useState<RefreshInterval>(0);

  const refetchIntervalMs = refreshIntervalToMs(autoRefreshInterval);

  const data = usePriceQueryData({
    urlParamsParsed,
    selectedOracle,
    selectedChain,
    selectedSymbol,
    isCompareMode,
    refetchInterval: refetchIntervalMs,
  });

  const nextRefreshAt = useMemo(() => {
    if (autoRefreshInterval === 0 || !data.primaryDataFetchTime) return null;
    return new Date(data.primaryDataFetchTime.getTime() + autoRefreshInterval);
  }, [autoRefreshInterval, data.primaryDataFetchTime]);

  const stats = useMemo<Stats>(() => {
    const validPrices = data.queryResults
      .filter((r) => r.priceData && typeof r.priceData.price === 'number' && r.priceData.price > 0)
      .map((r) => r.priceData!.price);

    const avgPrice =
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;

    const validChanges = data.queryResults.filter(
      (r) => r.priceData?.change24hPercent !== undefined
    );
    const avgChange24hPercent =
      validChanges.length > 0
        ? validChanges.reduce((sum, r) => sum + r.priceData!.change24hPercent!, 0) /
          validChanges.length
        : undefined;

    const maxPrice = safeMax(validPrices);
    const minPrice = safeMin(validPrices);
    const priceRange = maxPrice - minPrice;

    const variance =
      validPrices.length > 0
        ? validPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
          validPrices.length
        : 0;
    const standardDeviation = Math.sqrt(variance);
    const standardDeviationPercent = avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;

    const compareValidPrices = data.compareQueryResults
      .filter((r) => r.priceData && typeof r.priceData.price === 'number' && r.priceData.price > 0)
      .map((r) => r.priceData!.price);

    const compareAvgPrice =
      compareValidPrices.length > 0
        ? compareValidPrices.reduce((a, b) => a + b, 0) / compareValidPrices.length
        : 0;

    const compareValidChanges = data.compareQueryResults.filter(
      (r) => r.priceData?.change24hPercent !== undefined
    );
    const compareAvgChange24hPercent =
      compareValidChanges.length > 0
        ? compareValidChanges.reduce((sum, r) => sum + r.priceData!.change24hPercent!, 0) /
          compareValidChanges.length
        : undefined;

    const compareMaxPrice = safeMax(compareValidPrices);
    const compareMinPrice = safeMin(compareValidPrices);
    const comparePriceRange = compareMaxPrice - compareMinPrice;

    return {
      validPrices,
      avgPrice,
      avgChange24hPercent,
      maxPrice,
      minPrice,
      priceRange,
      compareValidPrices,
      compareAvgPrice,
      compareAvgChange24hPercent,
      compareMaxPrice,
      compareMinPrice,
      comparePriceRange,
      variance,
      standardDeviation,
      standardDeviationPercent,
    };
  }, [data.queryResults, data.compareQueryResults]);

  const value = useMemo(
    () => ({
      queryResults: data.queryResults,
      compareQueryResults: data.compareQueryResults,
      primaryDataFetchTime: data.primaryDataFetchTime,
      compareDataFetchTime: data.compareDataFetchTime,
      supportedChainsBySelectedOracles: data.supportedChainsBySelectedOracles,
      isLoading: data.isLoading,
      queryDuration: data.queryDuration,
      queryProgress: data.queryProgress,
      currentQueryTarget: data.currentQueryTarget,
      queryErrors: data.queryErrors,
      clearErrors: data.clearErrors,
      retryDataSource: data.retryDataSource,
      retryAllErrors: data.retryAllErrors,
      refetch: data.refetch,
      validationWarnings: data.validationWarnings,
      dataAnomalies: data.dataAnomalies,
      hasDataQualityIssues: data.hasDataQualityIssues,
      stats,
      autoRefresh: {
        isAutoRefreshEnabled: autoRefreshInterval !== 0,
        refreshInterval: autoRefreshInterval,
        lastRefreshedAt: data.primaryDataFetchTime,
        nextRefreshAt,
        setRefreshInterval: setAutoRefreshInterval,
        toggleAutoRefresh: () => setAutoRefreshInterval((prev) => (prev === 0 ? 30000 : 0)),
        isRefreshing: data.isFetching,
      },
    }),
    [data, stats, autoRefreshInterval, nextRefreshAt]
  );

  return <QueryDataContext.Provider value={value}>{children}</QueryDataContext.Provider>;
}

export function useQueryData() {
  const context = useContext(QueryDataContext);
  if (!context) {
    throw new Error('useQueryData must be used within a QueryDataProvider');
  }
  return context;
}
