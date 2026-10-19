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

/**
 * Stable data context: contains everything EXCEPT `isFetching` and
 * `autoRefresh.isRefreshing`. These fields toggle on every fetch cycle
 * (true at fetch start, false at fetch end) and would cause all consumers
 * to re-render twice per refresh. Keeping them out of this context means
 * components that only need query results / stats / loading state do NOT
 * re-render on the fetching-state boolean toggle.
 */
interface QueryStableContextValue {
  queryResults: QueryResult[];
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  isLoading: boolean;
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
  };
}

/**
 * Fetching context: only the fetching-state fields that toggle on every
 * fetch cycle. Components that need to show a spinner / refreshing
 * indicator subscribe to this separately.
 */
interface QueryFetchingContextValue {
  isFetching: boolean;
  isRefreshing: boolean;
}

/**
 * Full data context value — the original API preserved for `useQueryData()`.
 * Composed from the stable + fetching contexts.
 */
interface QueryDataContextValue extends QueryStableContextValue {
  isFetching: boolean;
  autoRefresh: QueryStableContextValue['autoRefresh'] & {
    isRefreshing: boolean;
  };
}

const QueryParamsContext = createContext<QueryParamsContextValue | null>(null);
const QueryStableContext = createContext<QueryStableContextValue | null>(null);
const QueryFetchingContext = createContext<QueryFetchingContextValue | null>(null);

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

  // NOTE: `data.isFetching` is intentionally NOT included in this memo's
  // deps. It lives in the separate fetching context below. This is the
  // core optimization: stable-context consumers don't re-render when
  // `isFetching` toggles true→false on every fetch cycle.
  const stableValue = useMemo<QueryStableContextValue>(
    () => ({
      queryResults: data.queryResults,
      compareQueryResults: data.compareQueryResults,
      primaryDataFetchTime: data.primaryDataFetchTime,
      isLoading: data.isLoading,
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
      },
    }),
    [
      data.queryResults,
      data.compareQueryResults,
      data.primaryDataFetchTime,
      data.isLoading,
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

  const fetchingValue = useMemo<QueryFetchingContextValue>(
    () => ({
      isFetching: data.isFetching,
      isRefreshing: data.isFetching,
    }),
    [data.isFetching]
  );

  return (
    <QueryParamsContext.Provider value={paramsValue}>
      <QueryStableContext.Provider value={stableValue}>
        <QueryFetchingContext.Provider value={fetchingValue}>
          {children}
        </QueryFetchingContext.Provider>
      </QueryStableContext.Provider>
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

/**
 * Stable data hook: subscribes ONLY to the stable context.
 * Use this in components that do NOT need `isFetching` or
 * `autoRefresh.isRefreshing` to avoid re-rendering on every fetch-cycle
 * boolean toggle. Components that need the fetching state should use
 * `useQueryData()` instead.
 */
export function useQueryDataStable(): QueryStableContextValue {
  const context = useContext(QueryStableContext);
  if (!context) {
    throw new Error('useQueryDataStable must be used within a UnifiedQueryProvider');
  }
  return context;
}

export function useQueryData(): QueryDataContextValue {
  const stable = useContext(QueryStableContext);
  const fetching = useContext(QueryFetchingContext);
  if (!stable || !fetching) {
    throw new Error('useQueryData must be used within a UnifiedQueryProvider');
  }
  // Compose the full value. This creates a new object on each render of
  // the consuming component, but that's fine — consumers of `useQueryData`
  // explicitly opt into fetching-state updates and are expected to
  // re-render when `isFetching` changes.
  return {
    ...stable,
    isFetching: fetching.isFetching,
    autoRefresh: { ...stable.autoRefresh, isRefreshing: fetching.isRefreshing },
  };
}
