'use client';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import { useTranslations } from '@/i18n';
import type { PriceData, OracleProvider, Blockchain } from '@/lib/oracles';
import { useUser } from '@/stores/authStore';

import { type QueryResult } from '../constants';

import { usePriceQueryChart, type ChartDataPoint } from './usePriceQueryChart';
import { usePriceQueryData, type QueryError } from './usePriceQueryData';
import { usePriceQueryExport } from './usePriceQueryExport';
import { usePriceQueryState, type TimeComparisonConfig } from './usePriceQueryState';

import type { AnomalyInfo } from '../utils/priceValidator';

export interface UsePriceQueryReturn {
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  isLoading: boolean;
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  hiddenSeries: Set<string>;
  setHiddenSeries: (series: Set<string>) => void;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  clearErrors: () => void;
  retryDataSource: (provider: OracleProvider, chain: Blockchain) => Promise<void>;
  retryAllErrors: () => Promise<void>;

  selectedRow: string | null;
  setSelectedRow: (row: string | null) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  compareTimeRange: number;
  setCompareTimeRange: (timeRange: number) => void;
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  compareQueryResults: QueryResult[];
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
  showExportConfig: boolean;
  setShowExportConfig: (show: boolean) => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  timeComparisonConfig: TimeComparisonConfig;
  setTimeComparisonConfig: (config: TimeComparisonConfig) => void;
  urlParamsParsed: boolean;
  primaryDataFetchTime: Date | null;
  compareDataFetchTime: Date | null;
  validationWarnings: string[];
  dataAnomalies: AnomalyInfo[];
  hasDataQualityIssues: boolean;
  user: ReturnType<typeof useUser>;
  symbolFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;

  chartData: ChartDataPoint[];
  compareChartData: ChartDataPoint[];
  sortedQueryResults: QueryResult[];
  filteredQueryResults: QueryResult[];
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
  supportedChainsBySelectedOracles: Set<Blockchain>;

  toggleSeries: (seriesName: string) => void;
  handleSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  fetchQueryData: () => Promise<void>;

  generateFilename: (extension: string) => string;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
}

export type { TimeComparisonConfig, ChartDataPoint, QueryError };

export function usePriceQuery(): UsePriceQueryReturn {
  const t = useTranslations();
  const user = useUser();
  const { favorites: symbolFavorites } = useFavorites({ configType: 'symbol' });

  const state = usePriceQueryState();

  const data = usePriceQueryData({
    selectedOracleRef: state.selectedOracleRef,
    selectedChainRef: state.selectedChainRef,
    selectedSymbolRef: state.selectedSymbolRef,
    selectedTimeRangeRef: state.selectedTimeRangeRef,
    isCompareModeRef: state.isCompareModeRef,
    compareTimeRangeRef: state.compareTimeRangeRef,
    urlParamsParsed: state.urlParamsParsed,
    selectedOracle: state.selectedOracle,
    selectedChain: state.selectedChain,
    selectedSymbol: state.selectedSymbol,
    selectedTimeRange: state.selectedTimeRange,
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

  const exportHook = usePriceQueryExport({
    queryResults: data.queryResults,
    selectedSymbol: state.selectedSymbol,
    selectedOracles: state.selectedOracle ? [state.selectedOracle] : [],
    selectedChains: state.selectedChain ? [state.selectedChain] : [],
  });

  const [showExportConfig, setShowExportConfig] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);

  const handleExportCSV = useCallback(() => {
    exportHook.handleExportCSV();
  }, [exportHook]);

  const handleExportJSON = useCallback(() => {
    exportHook.handleExportJSON();
  }, [exportHook]);

  const generateFilename = useCallback(
    (extension: string) => {
      return exportHook.generateFilename(extension);
    },
    [exportHook]
  );

  const stats = useMemo(() => {
    const validPrices = data.queryResults
      .filter((r) => r.priceData && typeof r.priceData.price === 'number')
      .map((r) => r.priceData!.price);

    const avgPrice =
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;

    const avgChange24hPercent =
      data.queryResults.length > 0
        ? data.queryResults.reduce((sum, r) => {
            const change = r.priceData?.change24hPercent;
            return change !== undefined ? sum + change : sum;
          }, 0) /
          data.queryResults.filter((r) => r.priceData?.change24hPercent !== undefined).length
        : undefined;

    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
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

    const compareAvgChange24hPercent =
      data.compareQueryResults.length > 0
        ? data.compareQueryResults.reduce((sum, r) => {
            const change = r.priceData?.change24hPercent;
            return change !== undefined ? sum + change : sum;
          }, 0) /
          data.compareQueryResults.filter((r) => r.priceData?.change24hPercent !== undefined).length
        : undefined;

    const compareMaxPrice = compareValidPrices.length > 0 ? Math.max(...compareValidPrices) : 0;
    const compareMinPrice = compareValidPrices.length > 0 ? Math.min(...compareValidPrices) : 0;
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
    }),
    [state.selectedSymbol, state.selectedOracle, state.selectedChain]
  );

  const handleApplyFavorite = useCallback(
    (config: FavoriteConfig) => {
      if (config.symbol) {
        state.setSelectedSymbol(config.symbol);
      }
      if (config.selectedOracles && config.selectedOracles.length > 0) {
        state.setSelectedOracle(config.selectedOracles[0] as OracleProvider);
      }
      if (config.chains && config.chains.length > 0) {
        state.setSelectedChain(config.chains[0] as Blockchain);
      }
      setShowFavoritesDropdown(false);
    },
    [state.setSelectedSymbol, state.setSelectedOracle, state.setSelectedChain]
  );

  return {
    selectedOracle: state.selectedOracle,
    setSelectedOracle: state.setSelectedOracle,
    selectedChain: state.selectedChain,
    setSelectedChain: state.setSelectedChain,
    selectedSymbol: state.selectedSymbol,
    setSelectedSymbol: state.setSelectedSymbol,
    selectedTimeRange: state.selectedTimeRange,
    setSelectedTimeRange: state.setSelectedTimeRange,
    queryResults: data.queryResults,
    historicalData: data.historicalData,
    isLoading: data.isLoading,
    filterText: state.filterText,
    setFilterText: state.setFilterText,
    sortField: state.sortField,
    sortDirection: state.sortDirection,
    hiddenSeries: state.hiddenSeries,
    setHiddenSeries: state.setHiddenSeries,
    queryDuration: data.queryDuration,
    queryProgress: data.queryProgress,
    currentQueryTarget: data.currentQueryTarget,
    queryErrors: data.queryErrors,
    clearErrors: data.clearErrors,
    retryDataSource: data.retryDataSource,
    retryAllErrors: data.retryAllErrors,

    selectedRow: state.selectedRow,
    setSelectedRow: state.setSelectedRow,
    isCompareMode: state.isCompareMode,
    setIsCompareMode: state.setIsCompareMode,
    compareTimeRange: state.compareTimeRange,
    setCompareTimeRange: state.setCompareTimeRange,
    compareHistoricalData: data.compareHistoricalData,
    compareQueryResults: data.compareQueryResults,
    showBaseline: state.showBaseline,
    setShowBaseline: state.setShowBaseline,
    showExportConfig,
    setShowExportConfig,
    chartContainerRef,
    timeComparisonConfig: state.timeComparisonConfig,
    setTimeComparisonConfig: state.setTimeComparisonConfig,
    urlParamsParsed: state.urlParamsParsed,
    primaryDataFetchTime: data.primaryDataFetchTime,
    compareDataFetchTime: data.compareDataFetchTime,
    validationWarnings: data.validationWarnings,
    dataAnomalies: data.dataAnomalies,
    hasDataQualityIssues: data.hasDataQualityIssues,
    user,
    symbolFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,

    chartData: chart.chartData,
    compareChartData: chart.compareChartData,
    sortedQueryResults,
    filteredQueryResults,
    validPrices: stats.validPrices,
    avgPrice: stats.avgPrice,
    avgChange24hPercent: stats.avgChange24hPercent,
    maxPrice: stats.maxPrice,
    minPrice: stats.minPrice,
    priceRange: stats.priceRange,
    compareValidPrices: stats.compareValidPrices,
    compareAvgPrice: stats.compareAvgPrice,
    compareAvgChange24hPercent: stats.compareAvgChange24hPercent,
    compareMaxPrice: stats.compareMaxPrice,
    compareMinPrice: stats.compareMinPrice,
    comparePriceRange: stats.comparePriceRange,
    variance: stats.variance,
    standardDeviation: stats.standardDeviation,
    standardDeviationPercent: stats.standardDeviationPercent,
    supportedChainsBySelectedOracles: data.supportedChainsBySelectedOracles,

    toggleSeries: state.toggleSeries,
    handleSort: state.handleSort,
    fetchQueryData: data.fetchQueryData,

    generateFilename,
    handleExportCSV,
    handleExportJSON,
  };
}
