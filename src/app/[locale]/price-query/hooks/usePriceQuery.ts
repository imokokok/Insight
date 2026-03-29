'use client';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import { useTranslations } from '@/i18n';
import { type OracleProvider, type Blockchain } from '@/lib/oracles';
import { useUser } from '@/stores/authStore';

import { type QueryResult, providerNames, chainNames, oracleI18nKeys } from '../constants';

import { usePriceQueryChart, type ChartDataPoint } from './usePriceQueryChart';
import { usePriceQueryData, type QueryError } from './usePriceQueryData';
import { usePriceQueryExport } from './usePriceQueryExport';
import { usePriceQueryHistory } from './usePriceQueryHistory';
import { usePriceQueryState, type TimeComparisonConfig } from './usePriceQueryState';

export interface UsePriceQueryReturn {
  selectedOracles: OracleProvider[];
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  selectedChains: Blockchain[];
  setSelectedChains: (chains: Blockchain[]) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, import('@/lib/oracles').PriceData[]>>;
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
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  historyItems: import('@/utils/queryHistory').QueryHistoryItem[];
  selectedRow: string | null;
  setSelectedRow: (row: string | null) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  compareTimeRange: number;
  setCompareTimeRange: (timeRange: number) => void;
  compareHistoricalData: Partial<Record<string, import('@/lib/oracles').PriceData[]>>;
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
  dataAnomalies: import('../utils/priceValidator').AnomalyInfo[];
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
  handleHistorySelect: (item: import('@/utils/queryHistory').QueryHistoryItem) => void;
  handleClearHistory: () => void;
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
    selectedOraclesRef: state.selectedOraclesRef,
    selectedChainsRef: state.selectedChainsRef,
    selectedSymbolRef: state.selectedSymbolRef,
    selectedTimeRangeRef: state.selectedTimeRangeRef,
    isCompareModeRef: state.isCompareModeRef,
    compareTimeRangeRef: state.compareTimeRangeRef,
    urlParamsParsed: state.urlParamsParsed,
    selectedOracles: state.selectedOracles,
    selectedChains: state.selectedChains,
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
    selectedOracles: state.selectedOracles,
    selectedChains: state.selectedChains,
  });

  const history = usePriceQueryHistory({
    setSelectedOracles: state.setSelectedOracles,
    setSelectedChains: state.setSelectedChains,
    setSelectedSymbol: state.setSelectedSymbol,
    setSelectedTimeRange: state.setSelectedTimeRange,
  });

  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const sortedQueryResults = useMemo(() => {
    return [...data.queryResults].sort((a, b) => {
      let comparison = 0;

      switch (state.sortField) {
        case 'oracle':
          comparison = providerNames[a.provider].localeCompare(providerNames[b.provider]);
          break;
        case 'blockchain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.priceData.price - b.priceData.price;
          break;
        case 'timestamp':
          comparison = a.priceData.timestamp - b.priceData.timestamp;
          break;
      }

      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data.queryResults, state.sortField, state.sortDirection]);

  const filteredQueryResults = useMemo(() => {
    if (!state.filterText.trim()) return sortedQueryResults;
    const lowerFilter = state.filterText.toLowerCase();
    return sortedQueryResults.filter((result) => {
      const oracleName = providerNames[result.provider].toLowerCase();
      const chainName = chainNames[result.chain].toLowerCase();
      const oracleTranslation = t(`navbar.${oracleI18nKeys[result.provider]}`).toLowerCase();
      const chainTranslation = t(`blockchain.${result.chain.toLowerCase()}`).toLowerCase();
      return (
        oracleName.includes(lowerFilter) ||
        chainName.includes(lowerFilter) ||
        oracleTranslation.includes(lowerFilter) ||
        chainTranslation.includes(lowerFilter)
      );
    });
  }, [sortedQueryResults, state.filterText, t]);

  const validPrices = useMemo(() => {
    return data.queryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [data.queryResults]);

  const avgPrice = useMemo(() => {
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  }, [validPrices]);

  const avgChange24hPercent = useMemo(() => {
    const changes = data.queryResults
      .map((r) => r.priceData.change24hPercent)
      .filter((c): c is number => c !== undefined);
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : undefined;
  }, [data.queryResults]);

  const maxPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.max(...validPrices) : 0;
  }, [validPrices]);

  const minPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [validPrices]);

  const compareValidPrices = useMemo(() => {
    return data.compareQueryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [data.compareQueryResults]);

  const compareAvgPrice = useMemo(() => {
    return compareValidPrices.length > 0
      ? compareValidPrices.reduce((a, b) => a + b, 0) / compareValidPrices.length
      : 0;
  }, [compareValidPrices]);

  const compareAvgChange24hPercent = useMemo(() => {
    const changes = data.compareQueryResults
      .map((r) => r.priceData.change24hPercent)
      .filter((c): c is number => c !== undefined);
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : undefined;
  }, [data.compareQueryResults]);

  const compareMaxPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? Math.max(...compareValidPrices) : 0;
  }, [compareValidPrices]);

  const compareMinPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? Math.min(...compareValidPrices) : 0;
  }, [compareValidPrices]);

  const comparePriceRange = useMemo(() => {
    return compareMaxPrice - compareMinPrice;
  }, [compareMaxPrice, compareMinPrice]);

  const priceRange = useMemo(() => {
    return maxPrice - minPrice;
  }, [maxPrice, minPrice]);

  const calculateVariance = (prices: number[], mean: number): number => {
    if (prices.length < 2) return 0;
    const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
    return sumSquaredDiff / prices.length;
  };

  const calculateStandardDeviation = (variance: number): number => {
    return Math.sqrt(variance);
  };

  const variance = useMemo(() => {
    return calculateVariance(validPrices, avgPrice);
  }, [validPrices, avgPrice]);

  const standardDeviation = useMemo(() => {
    return calculateStandardDeviation(variance);
  }, [variance]);

  const standardDeviationPercent = useMemo(() => {
    return avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;
  }, [standardDeviation, avgPrice]);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      symbol: state.selectedSymbol,
      selectedOracles: state.selectedOracles.map((o) => o as string),
      chains: state.selectedChains.map((c) => c as string),
    }),
    [state.selectedSymbol, state.selectedOracles, state.selectedChains]
  );

  const handleApplyFavorite = useCallback(
    (config: FavoriteConfig) => {
      if (config.symbol) {
        state.setSelectedSymbol(config.symbol);
      }
      if (config.selectedOracles) {
        state.setSelectedOracles(config.selectedOracles as OracleProvider[]);
      }
      if (config.chains) {
        state.setSelectedChains(config.chains as Blockchain[]);
      }
      setShowFavoritesDropdown(false);
    },
    [state.setSelectedSymbol, state.setSelectedOracles, state.setSelectedChains]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        favoritesDropdownRef.current &&
        !favoritesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFavoritesDropdown(false);
      }
    };
    if (showFavoritesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFavoritesDropdown]);

  return {
    selectedOracles: state.selectedOracles,
    setSelectedOracles: state.setSelectedOracles,
    selectedChains: state.selectedChains,
    setSelectedChains: state.setSelectedChains,
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
    showHistory: history.showHistory,
    setShowHistory: history.setShowHistory,
    historyItems: history.historyItems,
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
    showExportConfig: exportHook.showExportConfig,
    setShowExportConfig: exportHook.setShowExportConfig,
    chartContainerRef: chart.chartContainerRef,
    timeComparisonConfig: state.timeComparisonConfig,
    setTimeComparisonConfig: state.setTimeComparisonConfig,
    urlParamsParsed: state.urlParamsParsed,
    chartData: chart.chartData,
    compareChartData: chart.compareChartData,
    sortedQueryResults,
    filteredQueryResults,
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
    supportedChainsBySelectedOracles: data.supportedChainsBySelectedOracles,
    toggleSeries: state.toggleSeries,
    handleSort: state.handleSort,
    fetchQueryData: data.fetchQueryData,
    handleHistorySelect: history.handleHistorySelect,
    handleClearHistory: history.handleClearHistory,
    generateFilename: exportHook.generateFilename,
    handleExportCSV: exportHook.handleExportCSV,
    handleExportJSON: exportHook.handleExportJSON,
    user,
    symbolFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    queryErrors: data.queryErrors,
    clearErrors: data.clearErrors,
    retryDataSource: data.retryDataSource,
    retryAllErrors: data.retryAllErrors,
    primaryDataFetchTime: data.primaryDataFetchTime,
    compareDataFetchTime: data.compareDataFetchTime,
    validationWarnings: data.validationWarnings,
    dataAnomalies: data.dataAnomalies,
    hasDataQualityIssues: data.hasDataQualityIssues,
  };
}
