'use client';

import { useMemo, useCallback } from 'react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import { useUser } from '@/stores/authStore';
import type { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { useQueryParams, useQueryData, useQueryUI } from '../contexts';
import { type QueryError } from '../utils/queryTaskUtils';

import { type ChartDataPoint } from './usePriceQueryChart';
import { type TimeComparisonConfig } from './usePriceQueryState';

import type { AnomalyInfo } from '../utils/priceValidator';

interface UsePriceQueryReturn {
  state: {
    selectedOracle: OracleProvider | null;
    setSelectedOracle: (oracle: OracleProvider | null) => void;
    selectedChain: Blockchain | null;
    setSelectedChain: (chain: Blockchain | null) => void;
    selectedSymbol: string;
    setSelectedSymbol: (symbol: string) => void;
    selectedTimeRange: number;
    setSelectedTimeRange: (timeRange: number) => void;
    filterText: string;
    setFilterText: (text: string) => void;
    sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
    sortDirection: 'asc' | 'desc';
    hiddenSeries: Set<string>;
    setHiddenSeries: (series: Set<string>) => void;
    selectedRow: string | null;
    setSelectedRow: (row: string | null) => void;
    isCompareMode: boolean;
    setIsCompareMode: (mode: boolean) => void;
    compareTimeRange: number;
    setCompareTimeRange: (timeRange: number) => void;
    showBaseline: boolean;
    setShowBaseline: (show: boolean) => void;
    timeComparisonConfig: TimeComparisonConfig;
    setTimeComparisonConfig: (config: TimeComparisonConfig) => void;
    urlParamsParsed: boolean;
    showFavoritesDropdown: boolean;
    setShowFavoritesDropdown: (show: boolean) => void;
  };
  data: {
    queryResults: QueryResult[];
    historicalData: Partial<Record<string, PriceData[]>>;
    compareHistoricalData: Partial<Record<string, PriceData[]>>;
    compareQueryResults: QueryResult[];
    primaryDataFetchTime: Date | null;
    compareDataFetchTime: Date | null;
    chartData: ChartDataPoint[];
    compareChartData: ChartDataPoint[];
    sortedQueryResults: QueryResult[];
    filteredQueryResults: QueryResult[];
    supportedChainsBySelectedOracles: Set<Blockchain>;
  };
  stats: {
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
  };
  query: {
    isLoading: boolean;
    queryDuration: number | null;
    queryProgress: { completed: number; total: number };
    currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
    queryErrors: QueryError[];
    clearErrors: () => void;
    retryDataSource: (provider: OracleProvider, chain: Blockchain) => Promise<void>;
    retryAllErrors: () => Promise<void>;
    refetch: () => Promise<void>;
  };
  validation: {
    validationWarnings: string[];
    dataAnomalies: AnomalyInfo[];
    hasDataQualityIssues: boolean;
  };
  actions: {
    toggleSeries: (seriesName: string) => void;
    handleSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
    handleApplyFavorite: (config: FavoriteConfig) => void;
  };
  refs: {
    chartContainerRef: React.RefObject<HTMLDivElement | null>;
    favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  };
  user: ReturnType<typeof useUser>;
  symbolFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
}

/** @deprecated Use individual context hooks instead: useQueryParams(), useQueryData(), useQueryUI() */
export function usePriceQuery(): UsePriceQueryReturn {
  const user = useUser();
  const { favorites: symbolFavorites } = useFavorites({ configType: 'symbol' });

  const params = useQueryParams();
  const queryData = useQueryData();
  const ui = useQueryUI();

  const sortedQueryResults = useMemo(() => {
    return [...queryData.queryResults].sort((a, b) => {
      let comparison = 0;

      switch (ui.sortField) {
        case 'oracle':
          comparison = a.provider.localeCompare(b.provider);
          break;
        case 'blockchain':
          comparison = a.chain.localeCompare(b.chain);
          break;
        case 'price':
          comparison = (a.priceData?.price ?? 0) - (b.priceData?.price ?? 0);
          break;
        case 'timestamp':
          comparison =
            new Date(a.priceData?.timestamp ?? 0).getTime() -
            new Date(b.priceData?.timestamp ?? 0).getTime();
          break;
      }

      return ui.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [queryData.queryResults, ui.sortField, ui.sortDirection]);

  const filteredQueryResults = useMemo(() => {
    if (!ui.filterText) return sortedQueryResults;

    const filter = ui.filterText.toLowerCase();
    return sortedQueryResults.filter(
      (result) =>
        result.provider.toLowerCase().includes(filter) ||
        result.chain.toLowerCase().includes(filter)
    );
  }, [sortedQueryResults, ui.filterText]);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      symbol: params.selectedSymbol,
      selectedOracles: params.selectedOracle ? [params.selectedOracle as string] : [],
      chains: params.selectedChain ? [params.selectedChain as string] : [],
      timeRange: params.selectedTimeRange,
    }),
    [params.selectedSymbol, params.selectedOracle, params.selectedChain, params.selectedTimeRange]
  );

  const handleApplyFavorite = useCallback(
    (config: FavoriteConfig) => {
      if (config.symbol) {
        params.setSelectedSymbol(config.symbol);
      }
      if (config.selectedOracles && config.selectedOracles.length > 0) {
        params.setSelectedOracle(config.selectedOracles[0] as OracleProvider);
      } else {
        params.setSelectedOracle(null);
      }
      if (config.chains && config.chains.length > 0) {
        params.setSelectedChain(config.chains[0] as Blockchain);
      } else {
        params.setSelectedChain(null);
      }
      if (config.timeRange !== undefined) {
        params.setSelectedTimeRange(config.timeRange);
      }
      ui.setShowFavoritesDropdown(false);
    },
    [params, ui]
  );

  return {
    state: {
      selectedOracle: params.selectedOracle,
      setSelectedOracle: params.setSelectedOracle,
      selectedChain: params.selectedChain,
      setSelectedChain: params.setSelectedChain,
      selectedSymbol: params.selectedSymbol,
      setSelectedSymbol: params.setSelectedSymbol,
      selectedTimeRange: params.selectedTimeRange,
      setSelectedTimeRange: params.setSelectedTimeRange,
      filterText: ui.filterText,
      setFilterText: ui.setFilterText,
      sortField: ui.sortField,
      sortDirection: ui.sortDirection,
      hiddenSeries: ui.hiddenSeries,
      setHiddenSeries: ui.setHiddenSeries,
      selectedRow: ui.selectedRow,
      setSelectedRow: ui.setSelectedRow,
      isCompareMode: params.isCompareMode,
      setIsCompareMode: params.setIsCompareMode,
      compareTimeRange: params.compareTimeRange,
      setCompareTimeRange: params.setCompareTimeRange,
      showBaseline: ui.showBaseline,
      setShowBaseline: ui.setShowBaseline,
      timeComparisonConfig: ui.timeComparisonConfig,
      setTimeComparisonConfig: ui.setTimeComparisonConfig,
      urlParamsParsed: params.urlParamsParsed,
      showFavoritesDropdown: ui.showFavoritesDropdown,
      setShowFavoritesDropdown: ui.setShowFavoritesDropdown,
    },
    data: {
      queryResults: queryData.queryResults,
      historicalData: queryData.historicalData,
      compareHistoricalData: queryData.compareHistoricalData,
      compareQueryResults: queryData.compareQueryResults,
      primaryDataFetchTime: queryData.primaryDataFetchTime,
      compareDataFetchTime: queryData.compareDataFetchTime,
      chartData: queryData.chartData,
      compareChartData: queryData.compareChartData,
      sortedQueryResults,
      filteredQueryResults,
      supportedChainsBySelectedOracles: queryData.supportedChainsBySelectedOracles,
    },
    stats: queryData.stats,
    query: {
      isLoading: queryData.isLoading,
      queryDuration: queryData.queryDuration,
      queryProgress: queryData.queryProgress,
      currentQueryTarget: queryData.currentQueryTarget,
      queryErrors: queryData.queryErrors,
      clearErrors: queryData.clearErrors,
      retryDataSource: queryData.retryDataSource,
      retryAllErrors: queryData.retryAllErrors,
      refetch: queryData.refetch,
    },
    validation: {
      validationWarnings: queryData.validationWarnings,
      dataAnomalies: queryData.dataAnomalies,
      hasDataQualityIssues: queryData.hasDataQualityIssues,
    },
    actions: {
      toggleSeries: ui.toggleSeries,
      handleSort: ui.handleSort,
      handleApplyFavorite,
    },
    refs: {
      chartContainerRef: queryData.chartContainerRef,
      favoritesDropdownRef: ui.favoritesDropdownRef,
    },
    user,
    symbolFavorites,
    currentFavoriteConfig,
  };
}
