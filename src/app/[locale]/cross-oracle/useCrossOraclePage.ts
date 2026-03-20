import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import type { PriceData, SnapshotStats } from '@/types/oracle';
import { saveSnapshot } from '@/types/oracle';
import {
  oracleClients,
  TimeRange,
  DeviationFilter,
  RefreshInterval,
  SortColumn,
  SortDirection,
  calculateWeightedAverage,
  calculateVariance,
  calculateStandardDeviation,
  getConsistencyRating,
  initialHistoryMinMax,
  updateHistoryMinMax,
} from './constants';
import { useFavorites, FavoriteConfig } from '@/hooks/useFavorites';
import { useUser } from '@/stores/authStore';
import { createLogger } from '@/lib/utils/logger';
import { getLineStrokeDasharray } from './chartConfig';
import { useTabNavigation } from './components/TabNavigation';
import { UseCrossOraclePageReturn } from './types';
import { usePriceStats } from './usePriceStats';
import { useChartData } from './useChartData';
import { useTechnicalIndicators } from './useTechnicalIndicators';
import { useFilterSort } from './useFilterSort';
import { useExport } from './useExport';

const logger = createLogger('cross-oracle-page');

export function useCrossOraclePage(): UseCrossOraclePageReturn {
  const t = useTranslations();
  const router = useRouter();
  const user = useUser();

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.BAND_PROTOCOL,
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<OracleProvider, PriceData[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [prevStats, setPrevStats] = useState<SnapshotStats | null>(null);
  const [lastStats, setLastStats] = useState<SnapshotStats | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [deviationFilter, setDeviationFilter] = useState<DeviationFilter>('all');
  const [oracleFilter, setOracleFilter] = useState<OracleProvider | 'all'>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [historyMinMax, setHistoryMinMax] = useState(initialHistoryMinMax);
  const [selectedSnapshot, setSelectedSnapshot] = useState<
    import('@/types/oracle').OracleSnapshot | null
  >(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [highlightedOutlierIndex, setHighlightedOutlierIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const [useAccessibleColors, setUseAccessibleColors] = useState(false);
  const [hoveredOracle, setHoveredOracle] = useState<OracleProvider | null>(null);
  const [selectedOracleFromChart, setSelectedOracleFromChart] = useState<OracleProvider | null>(
    null
  );
  const [selectedPerformanceOracle, setSelectedPerformanceOracle] = useState<OracleProvider | null>(
    null
  );

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      selectedOracles: selectedOracles.map((o) => o as string),
      symbol: selectedSymbol,
    }),
    [selectedOracles, selectedSymbol]
  );

  const { favorites: oracleFavorites } = useFavorites({ configType: 'oracle_config' });

  useEffect(() => {
    if (!showFavoritesDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        favoritesDropdownRef.current &&
        !favoritesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFavoritesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFavoritesDropdown]);

  const handleApplyFavorite = useCallback((config: FavoriteConfig) => {
    if (config.selectedOracles) {
      setSelectedOracles(config.selectedOracles as OracleProvider[]);
    }
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    setShowFavoritesDropdown(false);
  }, []);

  const priceStats = usePriceStats(priceData);

  const handleSaveSnapshot = useCallback(() => {
    if (priceData.length === 0) return;
    saveSnapshot({
      timestamp: Date.now(),
      symbol: selectedSymbol,
      selectedOracles,
      priceData,
      stats: priceStats.currentStats,
    });
  }, [priceData, selectedSymbol, selectedOracles, priceStats.currentStats]);

  const handleSelectSnapshot = useCallback((snapshot: import('@/types/oracle').OracleSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowComparison(true);
  }, []);

  const fetchPriceData = useCallback(async () => {
    setIsLoading(true);
    const prices: PriceData[] = [];
    const histories: Partial<Record<OracleProvider, PriceData[]>> = {};

    const getHoursForTimeRange = (range: TimeRange): number | undefined => {
      switch (range) {
        case '1H':
          return 1;
        case '24H':
          return 24;
        case '7D':
          return 168;
        case '30D':
          return 720;
        case '90D':
          return 2160;
        case '1Y':
          return 8760;
        case 'ALL':
          return undefined;
        default:
          return 24;
      }
    };

    const hours = getHoursForTimeRange(timeRange);

    for (const oracle of selectedOracles) {
      try {
        const client = oracleClients[oracle];
        const price = await client.getPrice(selectedSymbol.split('/')[0]);
        const history = await client.getHistoricalPrices(
          selectedSymbol.split('/')[0],
          undefined,
          hours
        );
        prices.push(price);
        histories[oracle] = history;
      } catch (error) {
        logger.error(
          `Error fetching data from ${oracle}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    const currentValidPrices = prices.map((d) => d.price).filter((p) => p > 0);
    const currentAvgPrice =
      currentValidPrices.length > 0
        ? currentValidPrices.reduce((a, b) => a + b, 0) / currentValidPrices.length
        : 0;
    const currentMaxPrice = currentValidPrices.length > 0 ? Math.max(...currentValidPrices) : 0;
    const currentMinPrice = currentValidPrices.length > 0 ? Math.min(...currentValidPrices) : 0;
    const currentPriceRange = currentMaxPrice - currentMinPrice;
    const currentWeightedAvgPrice = calculateWeightedAverage(prices);
    const currentVariance = calculateVariance(currentValidPrices, currentAvgPrice);
    const currentStandardDeviation = calculateStandardDeviation(currentVariance);
    const currentStandardDeviationPercent =
      currentAvgPrice > 0 ? (currentStandardDeviation / currentAvgPrice) * 100 : 0;

    setLastStats(prevStats);
    setPrevStats({
      avgPrice: currentAvgPrice,
      weightedAvgPrice: currentWeightedAvgPrice,
      maxPrice: currentMaxPrice,
      minPrice: currentMinPrice,
      priceRange: currentPriceRange,
      variance: currentVariance,
      standardDeviation: currentStandardDeviation,
      standardDeviationPercent: currentStandardDeviationPercent,
    });

    updateHistoryMinMax(setHistoryMinMax, {
      avgPrice: currentAvgPrice,
      weightedAvgPrice: currentWeightedAvgPrice,
      maxPrice: currentMaxPrice,
      minPrice: currentMinPrice,
      priceRange: currentPriceRange,
      variance: currentVariance,
      standardDeviationPercent: currentStandardDeviationPercent,
    });

    setPriceData(prices);
    setHistoricalData(histories);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [selectedOracles, selectedSymbol, timeRange]);

  const calculateChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0 || current === 1) return null;
    return ((current - previous) / previous) * 100;
  };

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  useEffect(() => {
    if (refreshInterval === 0) return;

    let isMounted = true;
    const intervalId = setInterval(() => {
      if (isMounted) {
        fetchPriceData();
      }
    }, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval, fetchPriceData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
    };
    if (isFilterPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterPanelOpen]);

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const chartData = useChartData(
    historicalData,
    selectedOracles,
    timeRange,
    useAccessibleColors,
    priceStats.validPrices,
    priceStats.avgPrice
  );

  const technicalIndicators = useTechnicalIndicators(
    historicalData,
    selectedOracles,
    priceData,
    chartData.performanceData
  );

  const filterSort = useFilterSort({
    priceData,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    deviationFilter,
    oracleFilter,
    timeRange,
    setDeviationFilter,
    setOracleFilter,
    setTimeRange,
    validPrices: priceStats.validPrices,
    avgPrice: priceStats.avgPrice,
    standardDeviation: priceStats.standardDeviation,
    t,
  });

  const exportHandlers = useExport({
    priceData,
    avgPrice: priceStats.avgPrice,
    validPrices: priceStats.validPrices,
  });

  const getOracleLatencyData = useCallback(
    (oracle: OracleProvider | null): number[] => {
      if (!oracle) return chartData.latencyData;
      const latencies: number[] = [];
      const history = historicalData[oracle] || [];
      for (let i = 1; i < history.length; i++) {
        const timeDiff = history[i].timestamp - history[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 3600000) {
          latencies.push(timeDiff);
        }
      }
      return latencies.length > 0
        ? latencies
        : [150, 180, 200, 220, 250, 280, 300, 320, 350, 400, 450, 500];
    },
    [historicalData, chartData.latencyData]
  );

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const scrollToOutlier = useCallback(() => {
    if (filterSort.outlierStats.outliers.length === 0) return;
    const firstOutlier = filterSort.outlierStats.outliers[0];
    setHighlightedOutlierIndex(firstOutlier.index);
    setTimeout(() => {
      const rowElement = document.getElementById(`outlier-row-${firstOutlier.index}`);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => {
      setHighlightedOutlierIndex(null);
    }, 3000);
  }, [filterSort.outlierStats.outliers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filterSort.filteredPriceData.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, filterSort.filteredPriceData.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev === null ? filterSort.filteredPriceData.length - 1 : Math.max(prev - 1, 0)
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setSelectedRowIndex((prev) => {
          if (prev !== null) {
            setExpandedRow((current) => (current === prev ? null : prev));
          }
          return prev;
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedRowIndex(null);
        setExpandedRow(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterSort.filteredPriceData.length]);

  const { activeTab, handleTabChange } = useTabNavigation();

  return {
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    priceData,
    historicalData,
    isLoading,
    lastUpdated,
    sortColumn,
    sortDirection,
    refreshInterval,
    setRefreshInterval,
    timeRange,
    setTimeRange,
    prevStats,
    lastStats,
    zoomLevel,
    deviationFilter,
    setDeviationFilter,
    oracleFilter,
    setOracleFilter,
    expandedRow,
    setExpandedRow,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    filterPanelRef,
    isChartFullscreen,
    setIsChartFullscreen,
    historyMinMax,
    selectedSnapshot,
    setSelectedSnapshot,
    showComparison,
    setShowComparison,
    selectedRowIndex,
    hoveredRowIndex,
    highlightedOutlierIndex,
    tableRef,
    chartContainerRef,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    useAccessibleColors,
    setUseAccessibleColors,
    hoveredOracle,
    setHoveredOracle,
    selectedOracleFromChart,
    setSelectedOracleFromChart,
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,
    getOracleLatencyData,
    t,
    router,
    user,
    oracleFavorites,
    currentFavoriteConfig,
    validPrices: priceStats.validPrices,
    avgPrice: priceStats.avgPrice,
    weightedAvgPrice: priceStats.weightedAvgPrice,
    maxPrice: priceStats.maxPrice,
    minPrice: priceStats.minPrice,
    priceRange: priceStats.priceRange,
    variance: priceStats.variance,
    standardDeviation: priceStats.standardDeviation,
    standardDeviationPercent: priceStats.standardDeviationPercent,
    currentStats: priceStats.currentStats,
    sortedPriceData: filterSort.sortedPriceData,
    filteredPriceData: filterSort.filteredPriceData,
    activeFilterCount: filterSort.activeFilterCount,
    outlierStats: filterSort.outlierStats,
    oracleChartColors: chartData.oracleChartColors,
    getChartData: chartData.getChartData,
    heatmapData: chartData.heatmapData,
    boxPlotData: chartData.boxPlotData,
    volatilityData: chartData.volatilityData,
    correlationData: chartData.correlationData,
    latencyData: chartData.latencyData,
    performanceData: chartData.performanceData,
    maData: technicalIndicators.maData,
    gasFeeData: technicalIndicators.gasFeeData,
    atrData: technicalIndicators.atrData,
    bollingerData: technicalIndicators.bollingerData,
    qualityTrendData: technicalIndicators.qualityTrendData,
    qualityScoreData: technicalIndicators.qualityScoreData,
    handleSort: filterSort.handleSort,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleSaveSnapshot,
    handleSelectSnapshot,
    handleClearFilters: filterSort.handleClearFilters,
    getFilterSummary: filterSort.getFilterSummary,
    toggleOracle,
    handleApplyFavorite,
    handleExportCSV: exportHandlers.handleExportCSV,
    handleExportJSON: exportHandlers.handleExportJSON,
    scrollToOutlier,
    calculateChangePercent,
    fetchPriceData,
    getLineStrokeDasharray: (oracle: OracleProvider) =>
      getLineStrokeDasharray(oracle, useAccessibleColors),
    getConsistencyRating,
    activeTab,
    handleTabChange,
    setHoveredRowIndex,
    setSelectedRowIndex,
  };
}
