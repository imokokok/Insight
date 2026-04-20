'use client';

import { createContext, useContext, useMemo, useCallback, useRef, useState } from 'react';

import { refreshIntervalToMs, type RefreshInterval } from '@/hooks/useAutoRefresh';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { usePriceQueryData, type QueryError } from '../hooks/usePriceQueryData';
import { usePriceQueryState } from '../hooks/usePriceQueryState';
import { usePriceStats, type PriceStats } from '../hooks/usePriceStats';
import { type AnomalyInfo } from '../utils/priceValidator';

type Stats = PriceStats;

interface QueryUIState {
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  hiddenSeries: Set<string>;
  setHiddenSeries: (series: Set<string>) => void;
  toggleSeries: (seriesName: string) => void;
  handleSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  selectedRow: string | null;
  setSelectedRow: (row: string | null) => void;
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
}

interface UnifiedQueryContextValue {
  // Params
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  compareTimeRange: number;
  setCompareTimeRange: (timeRange: number) => void;
  urlParamsParsed: boolean;
  // Data
  queryResults: QueryResult[];
  compareQueryResults: QueryResult[];
  primaryDataFetchTime: Date | null;
  compareDataFetchTime: Date | null;
  supportedChainsBySelectedOracles: Set<Blockchain>;
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
  // UI
  ui: QueryUIState;
}

const UnifiedQueryContext = createContext<UnifiedQueryContextValue | null>(null);

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

  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const toggleSeries = useCallback((seriesName: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  }, []);

  const handleSort = useCallback((field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      } else {
        setSortDirection('asc');
        return field;
      }
    });
  }, []);

  const ui: QueryUIState = useMemo(
    () => ({
      filterText,
      setFilterText,
      sortField,
      sortDirection,
      hiddenSeries,
      setHiddenSeries,
      toggleSeries,
      handleSort,
      selectedRow,
      setSelectedRow,
      showBaseline,
      setShowBaseline,
      showFavoritesDropdown,
      setShowFavoritesDropdown,
      favoritesDropdownRef,
    }),
    [
      filterText,
      sortField,
      sortDirection,
      hiddenSeries,
      toggleSeries,
      handleSort,
      selectedRow,
      showBaseline,
      showFavoritesDropdown,
    ]
  );

  const value = useMemo(
    () => ({
      ...state,
      ...data,
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
      ui,
    }),
    [state, data, stats, autoRefreshInterval, nextRefreshAt, ui]
  );

  return <UnifiedQueryContext.Provider value={value}>{children}</UnifiedQueryContext.Provider>;
}

export function useUnifiedQuery() {
  const context = useContext(UnifiedQueryContext);
  if (!context) {
    throw new Error('useUnifiedQuery must be used within a UnifiedQueryProvider');
  }
  return context;
}
