'use client';

import { useMemo, useCallback, useRef, useState } from 'react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import { safeMax, safeMin } from '@/lib/utils';
import { useUser } from '@/stores/authStore';
import type { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

import { type QueryResult } from '../constants';
import { type QueryError } from '../utils/queryTaskUtils';

import { usePriceQueryChart, type ChartDataPoint } from './usePriceQueryChart';
import { usePriceQueryData } from './usePriceQueryData';
import { usePriceQueryState, type TimeComparisonConfig } from './usePriceQueryState';

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

export function usePriceQuery(): UsePriceQueryReturn {
  const user = useUser();
  const { favorites: symbolFavorites } = useFavorites({ configType: 'symbol' });

  const state = usePriceQueryState();

  const data = usePriceQueryData({
    urlParamsParsed: state.urlParamsParsed,
    selectedOracle: state.selectedOracle,
    selectedChain: state.selectedChain,
    selectedSymbol: state.selectedSymbol,
    selectedTimeRange: state.selectedTimeRange,
    isCompareMode: state.isCompareMode,
    compareTimeRange: state.compareTimeRange,
  });

  const chart = usePriceQueryChart({
    historicalData: data.historicalData,
    queryResults: data.queryResults,
    selectedTimeRange: state.selectedTimeRange,
    isCompareMode: state.isCompareMode,
    compareHistoricalData: data.compareHistoricalData,
    compareQueryResults: data.compareQueryResults,
    compareTimeRange: state.compareTimeRange,
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);

  const stats = useMemo(() => {
    const validPrices = data.queryResults
      .filter((r) => r.priceData && typeof r.priceData.price === 'number')
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
      .filter((r) => r.priceData && typeof r.priceData.price === 'number')
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
      variance,
      standardDeviation,
      standardDeviationPercent,
      compareValidPrices,
      compareAvgPrice,
      compareAvgChange24hPercent,
      compareMaxPrice,
      compareMinPrice,
      comparePriceRange,
    };
  }, [data.queryResults, data.compareQueryResults]);

  const sortedQueryResults = useMemo(() => {
    return [...data.queryResults].sort((a, b) => {
      let comparison = 0;

      switch (state.sortField) {
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

      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data.queryResults, state.sortField, state.sortDirection]);

  const filteredQueryResults = useMemo(() => {
    if (!state.filterText) return sortedQueryResults;

    const filter = state.filterText.toLowerCase();
    return sortedQueryResults.filter(
      (result) =>
        result.provider.toLowerCase().includes(filter) ||
        result.chain.toLowerCase().includes(filter)
    );
  }, [sortedQueryResults, state.filterText]);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      symbol: state.selectedSymbol,
      selectedOracles: state.selectedOracle ? [state.selectedOracle as string] : [],
      chains: state.selectedChain ? [state.selectedChain as string] : [],
      timeRange: state.selectedTimeRange,
    }),
    [state.selectedSymbol, state.selectedOracle, state.selectedChain, state.selectedTimeRange]
  );

  const handleApplyFavorite = useCallback(
    (config: FavoriteConfig) => {
      if (config.symbol) {
        state.setSelectedSymbol(config.symbol);
      }
      if (config.selectedOracles && config.selectedOracles.length > 0) {
        state.setSelectedOracle(config.selectedOracles[0] as OracleProvider);
      } else {
        state.setSelectedOracle(null);
      }
      if (config.chains && config.chains.length > 0) {
        state.setSelectedChain(config.chains[0] as Blockchain);
      } else {
        state.setSelectedChain(null);
      }
      if (config.timeRange !== undefined) {
        state.setSelectedTimeRange(config.timeRange);
      }
      setShowFavoritesDropdown(false);
    },
    [state]
  );

  return {
    state: {
      selectedOracle: state.selectedOracle,
      setSelectedOracle: state.setSelectedOracle,
      selectedChain: state.selectedChain,
      setSelectedChain: state.setSelectedChain,
      selectedSymbol: state.selectedSymbol,
      setSelectedSymbol: state.setSelectedSymbol,
      selectedTimeRange: state.selectedTimeRange,
      setSelectedTimeRange: state.setSelectedTimeRange,
      filterText: state.filterText,
      setFilterText: state.setFilterText,
      sortField: state.sortField,
      sortDirection: state.sortDirection,
      hiddenSeries: state.hiddenSeries,
      setHiddenSeries: state.setHiddenSeries,
      selectedRow: state.selectedRow,
      setSelectedRow: state.setSelectedRow,
      isCompareMode: state.isCompareMode,
      setIsCompareMode: state.setIsCompareMode,
      compareTimeRange: state.compareTimeRange,
      setCompareTimeRange: state.setCompareTimeRange,
      showBaseline: state.showBaseline,
      setShowBaseline: state.setShowBaseline,
      timeComparisonConfig: state.timeComparisonConfig,
      setTimeComparisonConfig: state.setTimeComparisonConfig,
      urlParamsParsed: state.urlParamsParsed,
      showFavoritesDropdown,
      setShowFavoritesDropdown,
    },
    data: {
      queryResults: data.queryResults,
      historicalData: data.historicalData,
      compareHistoricalData: data.compareHistoricalData,
      compareQueryResults: data.compareQueryResults,
      primaryDataFetchTime: data.primaryDataFetchTime,
      compareDataFetchTime: data.compareDataFetchTime,
      chartData: chart.chartData,
      compareChartData: chart.compareChartData,
      sortedQueryResults,
      filteredQueryResults,
      supportedChainsBySelectedOracles: data.supportedChainsBySelectedOracles,
    },
    stats,
    query: {
      isLoading: data.isLoading,
      queryDuration: data.queryDuration,
      queryProgress: data.queryProgress,
      currentQueryTarget: data.currentQueryTarget,
      queryErrors: data.queryErrors,
      clearErrors: data.clearErrors,
      retryDataSource: data.retryDataSource,
      retryAllErrors: data.retryAllErrors,
      refetch: data.refetch,
    },
    validation: {
      validationWarnings: data.validationWarnings,
      dataAnomalies: data.dataAnomalies,
      hasDataQualityIssues: data.hasDataQualityIssues,
    },
    actions: {
      toggleSeries: state.toggleSeries,
      handleSort: state.handleSort,
      handleApplyFavorite,
    },
    refs: {
      chartContainerRef,
      favoritesDropdownRef,
    },
    user,
    symbolFavorites,
    currentFavoriteConfig,
  };
}
