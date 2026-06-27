'use client';

import { createContext, useContext, useMemo, useCallback, useState } from 'react';

import { refreshIntervalToMs, type RefreshInterval } from '@/hooks/useAutoRefresh';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { usePriceQueryData, type QueryError } from '../hooks/usePriceQueryData';
import { usePriceQueryState } from '../hooks/usePriceQueryState';
import { usePriceStats, type PriceStats } from '../hooks/usePriceStats';

type Stats = PriceStats;

interface QueryParamsContextValue {
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  urlParamsParsed: boolean;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  needsChainSelection: boolean;
}

interface QueryDataContextValue {
  queryResults: QueryResult[];
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  isLoading: boolean;
  isFetching: boolean;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  clearErrors: () => void;
  retryDataSource: (provider: OracleProvider, chain: Blockchain) => Promise<void>;
  retryAllErrors: () => Promise<void>;
  refetch: () => Promise<void>;
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

const QueryParamsContext = createContext<QueryParamsContextValue | null>(null);
const QueryDataContext = createContext<QueryDataContextValue | null>(null);

export function UnifiedQueryProvider({ children }: { children: React.ReactNode }) {
  const state = usePriceQueryState();
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<RefreshInterval>(0);

  const refetchIntervalMs = refreshIntervalToMs(autoRefreshInterval);

  const data = usePriceQueryData({
    urlParamsParsed: state.urlParamsParsed,
    selectedOracle: state.selectedOracle,
    selectedChain: state.selectedChain,
    selectedSymbol: state.selectedSymbol,
    isCompareMode: state.isCompareMode,
    refetchInterval: refetchIntervalMs,
  });

  const nextRefreshAt = useMemo(() => {
    if (autoRefreshInterval === 0 || !data.primaryDataFetchTime) return null;
    return new Date(data.primaryDataFetchTime.getTime() + (autoRefreshInterval as number));
  }, [autoRefreshInterval, data.primaryDataFetchTime]);

  const stats = usePriceStats(data.queryResults, data.compareQueryResults);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshInterval((prev) => (prev === 0 ? 30000 : 0));
  }, []);

  const paramsValue = useMemo<QueryParamsContextValue>(
    () => ({
      selectedOracle: state.selectedOracle,
      setSelectedOracle: state.setSelectedOracle,
      selectedChain: state.selectedChain,
      setSelectedChain: state.setSelectedChain,
      selectedSymbol: state.selectedSymbol,
      setSelectedSymbol: state.setSelectedSymbol,
      isCompareMode: state.isCompareMode,
      setIsCompareMode: state.setIsCompareMode,
      urlParamsParsed: state.urlParamsParsed,
      supportedChainsBySelectedOracles: data.supportedChainsBySelectedOracles,
      needsChainSelection: data.needsChainSelection,
    }),
    [
      state.selectedOracle,
      state.setSelectedOracle,
      state.selectedChain,
      state.setSelectedChain,
      state.selectedSymbol,
      state.setSelectedSymbol,
      state.isCompareMode,
      state.setIsCompareMode,
      state.urlParamsParsed,
      data.supportedChainsBySelectedOracles,
      data.needsChainSelection,
    ]
  );

  const dataValue = useMemo<QueryDataContextValue>(
    () => ({
      queryResults: data.queryResults,
      compareQueryResults: data.compareQueryResults,
      primaryDataFetchTime: data.primaryDataFetchTime,
      isLoading: data.isLoading,
      isFetching: data.isFetching,
      queryDuration: data.queryDuration,
      queryProgress: data.queryProgress,
      currentQueryTarget: data.currentQueryTarget,
      queryErrors: data.queryErrors,
      clearErrors: data.clearErrors,
      retryDataSource: data.retryDataSource,
      retryAllErrors: data.retryAllErrors,
      refetch: data.refetch,
      stats,
      autoRefresh: {
        isAutoRefreshEnabled: autoRefreshInterval !== 0,
        refreshInterval: autoRefreshInterval,
        lastRefreshedAt: data.primaryDataFetchTime,
        nextRefreshAt,
        setRefreshInterval: setAutoRefreshInterval,
        toggleAutoRefresh,
        isRefreshing: data.isFetching,
      },
    }),
    [
      data.queryResults,
      data.compareQueryResults,
      data.primaryDataFetchTime,
      data.isLoading,
      data.isFetching,
      data.queryDuration,
      data.queryProgress,
      data.currentQueryTarget,
      data.queryErrors,
      data.clearErrors,
      data.retryDataSource,
      data.retryAllErrors,
      data.refetch,
      stats,
      autoRefreshInterval,
      nextRefreshAt,
      toggleAutoRefresh,
    ]
  );

  return (
    <QueryParamsContext.Provider value={paramsValue}>
      <QueryDataContext.Provider value={dataValue}>{children}</QueryDataContext.Provider>
    </QueryParamsContext.Provider>
  );
}

export function useQueryParams(): QueryParamsContextValue {
  const context = useContext(QueryParamsContext);
  if (!context) {
    throw new Error('useQueryParams must be used within a UnifiedQueryProvider');
  }
  return context;
}

export function useQueryData(): QueryDataContextValue {
  const context = useContext(QueryDataContext);
  if (!context) {
    throw new Error('useQueryData must be used within a UnifiedQueryProvider');
  }
  return context;
}

/**
 * Backward-compatible hook that subscribes to both params and data contexts.
 * Prefer useQueryParams() or useQueryData() for granular subscriptions to
 * reduce unnecessary re-renders.
 */
export function useUnifiedQuery() {
  return { ...useQueryParams(), ...useQueryData() };
}
