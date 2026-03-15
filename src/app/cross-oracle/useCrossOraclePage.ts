import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import { OracleProvider, PriceData, saveSnapshot, SnapshotStats } from '@/types/oracle';
import {
  oracleClients,
  oracleNames,
  TimeRange,
  DeviationFilter,
  RefreshInterval,
  SortColumn,
  SortDirection,
  calculateWeightedAverage,
  calculateVariance,
  calculateStandardDeviation,
  getConsistencyRating,
  calculateZScore,
  isOutlier,
  exportToCSV,
  exportToJSON,
  HistoryMinMax,
  initialHistoryMinMax,
  updateHistoryMinMax,
} from './constants';
import { useFavorites, FavoriteConfig } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/utils/logger';
import { lttbDownsample } from '@/lib/utils/lttb';
import { getMaxPointsForTimeRange, getOracleChartColors, getLineStrokeDasharray } from './chartConfig';
import { useTabNavigation, TabId } from './components/TabNavigation';

const logger = createLogger('cross-oracle-page');

export interface UseCrossOraclePageReturn {
  selectedOracles: OracleProvider[];
  setSelectedOracles: React.Dispatch<React.SetStateAction<OracleProvider[]>>;
  selectedSymbol: string;
  setSelectedSymbol: React.Dispatch<React.SetStateAction<string>>;
  priceData: PriceData[];
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  isLoading: boolean;
  lastUpdated: Date | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  refreshInterval: RefreshInterval;
  setRefreshInterval: React.Dispatch<React.SetStateAction<RefreshInterval>>;
  timeRange: TimeRange;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
  prevStats: SnapshotStats | null;
  lastStats: SnapshotStats | null;
  zoomLevel: number;
  deviationFilter: DeviationFilter;
  setDeviationFilter: React.Dispatch<React.SetStateAction<DeviationFilter>>;
  oracleFilter: OracleProvider | 'all';
  setOracleFilter: React.Dispatch<React.SetStateAction<OracleProvider | 'all'>>;
  expandedRow: number | null;
  setExpandedRow: React.Dispatch<React.SetStateAction<number | null>>;
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  isChartFullscreen: boolean;
  setIsChartFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  historyMinMax: HistoryMinMax;
  selectedSnapshot: import('@/types/oracle').OracleSnapshot | null;
  setSelectedSnapshot: React.Dispatch<React.SetStateAction<import('@/types/oracle').OracleSnapshot | null>>;
  showComparison: boolean;
  setShowComparison: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  highlightedOutlierIndex: number | null;
  tableRef: React.RefObject<HTMLTableSectionElement | null>;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  useAccessibleColors: boolean;
  setUseAccessibleColors: React.Dispatch<React.SetStateAction<boolean>>;
  hoveredOracle: OracleProvider | null;
  setHoveredOracle: React.Dispatch<React.SetStateAction<OracleProvider | null>>;
  selectedOracleFromChart: OracleProvider | null;
  setSelectedOracleFromChart: React.Dispatch<React.SetStateAction<OracleProvider | null>>;
  t: (key: string) => string;
  router: ReturnType<typeof useRouter>;
  user: ReturnType<typeof useAuth>['user'];
  oracleFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  validPrices: number[];
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  currentStats: SnapshotStats;
  sortedPriceData: PriceData[];
  filteredPriceData: PriceData[];
  activeFilterCount: number;
  outlierStats: {
    count: number;
    avgDeviation: number;
    outliers: { index: number; provider: OracleProvider; zScore: number; deviation: number }[];
    oracleNames: string[];
  };
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => any[];
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  latencyData: number[];
  performanceData: import('@/components/oracle/common/OraclePerformanceRanking').OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  gasFeeData: { oracle: OracleProvider; chain: string; updateCost: number; updateFrequency: number; avgGasPrice: number; lastUpdate: number }[];
  atrData: { oracle: OracleProvider; prices: { timestamp: number; price: number; high: number; low: number; close: number }[] }[];
  bollingerData: { oracle: OracleProvider; prices: { timestamp: number; price: number; high: number; low: number; close: number }[] }[];
  qualityTrendData: { oracle: OracleProvider; data: any[] }[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  handleSort: (column: SortColumn) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: import('@/types/oracle').OracleSnapshot) => void;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
  toggleOracle: (oracle: OracleProvider) => void;
  handleApplyFavorite: (config: FavoriteConfig) => void;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  scrollToOutlier: () => void;
  calculateChangePercent: (current: number, previous: number) => number | null;
  fetchPriceData: () => Promise<void>;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  getConsistencyRating: (stdDevPercent: number) => string;
  activeTab: TabId;
  handleTabChange: (tab: TabId) => void;
  setHoveredRowIndex: (index: number | null) => void;
  setSelectedRowIndex: (index: number | null) => void;
}

export function useCrossOraclePage(): UseCrossOraclePageReturn {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.BAND_PROTOCOL,
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<Partial<Record<OracleProvider, PriceData[]>>>({});
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
  const [historyMinMax, setHistoryMinMax] = useState<HistoryMinMax>(initialHistoryMinMax);
  const [selectedSnapshot, setSelectedSnapshot] = useState<import('@/types/oracle').OracleSnapshot | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [highlightedOutlierIndex, setHighlightedOutlierIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const [useAccessibleColors, setUseAccessibleColors] = useState(false);
  const [hoveredOracle, setHoveredOracle] = useState<OracleProvider | null>(null);
  const [selectedOracleFromChart, setSelectedOracleFromChart] = useState<OracleProvider | null>(null);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      selectedOracles: selectedOracles.map((o) => o as string),
      symbol: selectedSymbol,
    }),
    [selectedOracles, selectedSymbol]
  );

  const { favorites: oracleFavorites } = useFavorites({ configType: 'oracle_config' });

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

  const handleApplyFavorite = useCallback((config: FavoriteConfig) => {
    if (config.selectedOracles) {
      setSelectedOracles(config.selectedOracles as OracleProvider[]);
    }
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    setShowFavoritesDropdown(false);
  }, []);

  const validPrices = useMemo(
    () => priceData.map((d) => d.price).filter((p) => p > 0),
    [priceData]
  );
  const avgPrice = useMemo(
    () =>
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0,
    [validPrices]
  );
  const weightedAvgPrice = useMemo(() => calculateWeightedAverage(priceData), [priceData]);
  const maxPrice = useMemo(
    () => (validPrices.length > 0 ? Math.max(...validPrices) : 0),
    [validPrices]
  );
  const minPrice = useMemo(
    () => (validPrices.length > 0 ? Math.min(...validPrices) : 0),
    [validPrices]
  );
  const priceRange = maxPrice - minPrice;
  const variance = useMemo(() => calculateVariance(validPrices, avgPrice), [validPrices, avgPrice]);
  const standardDeviation = useMemo(() => calculateStandardDeviation(variance), [variance]);
  const standardDeviationPercent = useMemo(
    () => (avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0),
    [avgPrice, standardDeviation]
  );

  const currentStats: SnapshotStats = useMemo(
    () => ({
      avgPrice,
      weightedAvgPrice,
      maxPrice,
      minPrice,
      priceRange,
      variance,
      standardDeviation,
      standardDeviationPercent,
    }),
    [avgPrice, weightedAvgPrice, maxPrice, minPrice, priceRange, variance, standardDeviation, standardDeviationPercent]
  );

  const handleSaveSnapshot = useCallback(() => {
    if (priceData.length === 0) return;
    saveSnapshot({
      timestamp: Date.now(),
      symbol: selectedSymbol,
      selectedOracles,
      priceData,
      stats: currentStats,
    });
  }, [priceData, selectedSymbol, selectedOracles, currentStats]);

  const handleSelectSnapshot = useCallback((snapshot: import('@/types/oracle').OracleSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowComparison(true);
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPriceData = useMemo(() => {
    return [...priceData].sort((a, b) => {
      if (!sortColumn) return 0;
      if (sortColumn === 'price') {
        return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
      }
      if (sortColumn === 'timestamp') {
        return sortDirection === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      }
      return 0;
    });
  }, [priceData, sortColumn, sortDirection]);

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
    const intervalId = setInterval(() => {
      fetchPriceData();
    }, refreshInterval);
    return () => clearInterval(intervalId);
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (deviationFilter !== 'all') count++;
    if (oracleFilter !== 'all') count++;
    if (timeRange !== '24H') count++;
    return count;
  }, [deviationFilter, oracleFilter, timeRange]);

  const handleClearFilters = useCallback(() => {
    setDeviationFilter('all');
    setOracleFilter('all');
    setTimeRange('24H');
  }, []);

  const getFilterSummary = useCallback(() => {
    const summary: string[] = [];
    if (deviationFilter !== 'all') {
      const label =
        deviationFilter === 'excellent'
          ? '<0.1%'
          : deviationFilter === 'good'
            ? '0.1-0.5%'
            : '>0.5%';
      summary.push(`偏差: ${label}`);
    }
    if (oracleFilter !== 'all') {
      summary.push(`预言机: ${oracleNames[oracleFilter]}`);
    }
    if (timeRange !== '24H') {
      summary.push(`时间: ${timeRange}`);
    }
    return summary;
  }, [deviationFilter, oracleFilter, timeRange]);

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const oracleChartColors: Record<OracleProvider, string> = useMemo(() => {
    return getOracleChartColors(useAccessibleColors);
  }, [useAccessibleColors]);

  const getChartData = useCallback(() => {
    if (Object.keys(historicalData).length === 0) return [];

    const maxPoints = getMaxPointsForTimeRange(timeRange);
    const downsampledData: Partial<Record<OracleProvider, PriceData[]>> = {};

    selectedOracles.forEach((oracle) => {
      const data = historicalData[oracle];
      if (data && data.length > maxPoints) {
        downsampledData[oracle] = lttbDownsample(
          data.map((d) => ({ timestamp: d.timestamp, price: d.price })),
          maxPoints
        ).map((d) => ({ ...d, provider: oracle, confidence: 1 }) as PriceData);
      } else {
        downsampledData[oracle] = data || [];
      }
    });

    const timestamps = new Set<number>();
    Object.values(downsampledData).forEach((history) => {
      history?.forEach((data) => timestamps.add(data.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const point: Record<string, string | number | Date | undefined> = {
        timestamp: new Date(timestamp).toLocaleTimeString(),
        fullTimestamp: new Date(timestamp),
        rawTimestamp: timestamp,
      };
      const pricesAtTime: number[] = [];

      selectedOracles.forEach((oracle) => {
        const dataPoint = downsampledData[oracle]?.find((d) => d.timestamp === timestamp);
        if (dataPoint) {
          point[oracleNames[oracle]] = dataPoint.price;
          pricesAtTime.push(dataPoint.price);
        }
      });

      if (pricesAtTime.length > 0) {
        const avg = pricesAtTime.reduce((a, b) => a + b, 0) / pricesAtTime.length;
        const variance =
          pricesAtTime.length > 1
            ? pricesAtTime.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pricesAtTime.length
            : 0;
        const stdDev = Math.sqrt(variance);
        point.avgPrice = avg;
        point.stdDev = stdDev;
        point.upperBound1 = avg + stdDev;
        point.lowerBound1 = avg - stdDev;
        point.upperBound2 = avg + stdDev * 2;
        point.lowerBound2 = avg - stdDev * 2;
        point.oracleCount = pricesAtTime.length;
      }
      return point;
    });
  }, [historicalData, selectedOracles, timeRange]);

  const heatmapData = useMemo((): import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[] => {
    const result: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[] = [];
    const chartDataPoints = getChartData();
    chartDataPoints.forEach((point) => {
      const avgPriceVal = point.avgPrice as number | undefined;
      if (!avgPriceVal) return;
      selectedOracles.forEach((oracle) => {
        const price = point[oracleNames[oracle]] as number | undefined;
        if (price !== undefined) {
          const deviationPercent = ((price - avgPriceVal) / avgPriceVal) * 100;
          result.push({
            timestamp: point.rawTimestamp as number,
            oracleName: oracleNames[oracle],
            deviationPercent,
            price,
          });
        }
      });
    });
    return result;
  }, [historicalData, selectedOracles, avgPrice, getChartData]);

  const boxPlotData = useMemo((): import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[] => {
    return selectedOracles.map((oracle) => ({
      oracleId: oracle,
      prices: (historicalData[oracle] || []).map((d) => d.price),
    }));
  }, [historicalData, selectedOracles]);

  const volatilityData = useMemo((): import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[] => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const correlationData = useMemo((): import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[] => {
    return selectedOracles.map((oracle) => ({
      oracleId: oracle,
      data: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const latencyData = useMemo((): number[] => {
    const latencies: number[] = [];
    selectedOracles.forEach((oracle) => {
      const history = historicalData[oracle] || [];
      for (let i = 1; i < history.length; i++) {
        const timeDiff = history[i].timestamp - history[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 3600000) {
          latencies.push(timeDiff);
        }
      }
    });
    return latencies.length > 0
      ? latencies
      : [150, 180, 200, 220, 250, 280, 300, 320, 350, 400, 450, 500];
  }, [historicalData, selectedOracles]);

  const performanceData = useMemo((): import('@/components/oracle/common/OraclePerformanceRanking').OraclePerformanceData[] => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      const prices = history.map((d) => d.price);
      const mean = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const variance =
        prices.length > 1
          ? prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
          : 0;
      const stdDev = Math.sqrt(variance);
      const stability = mean > 0 ? Math.max(0, 100 - (stdDev / mean) * 1000) : 50;

      const latencies: number[] = [];
      for (let i = 1; i < history.length; i++) {
        const timeDiff = history[i].timestamp - history[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 3600000) {
          latencies.push(timeDiff);
        }
      }
      const avgLatency =
        latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 200;

      const avgPriceVal =
        validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
      const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
      const priceDeviation = avgPriceVal > 0 ? Math.abs((currentPrice - avgPriceVal) / avgPriceVal) : 0;
      const accuracy = Math.max(90, Math.min(99.9, 100 - priceDeviation * 100));

      return {
        provider: oracle,
        name: oracleNames[oracle],
        responseTime: Math.round(avgLatency),
        accuracy: accuracy,
        stability: Math.min(100, Math.max(0, stability)),
        dataSources: 0,
        supportedChains: 0,
        color: oracleChartColors[oracle],
      };
    });
  }, [historicalData, selectedOracles, validPrices, oracleChartColors]);

  const maData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const gasFeeData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      chain: 'Ethereum',
      updateCost: 45000 + Math.random() * 20000,
      updateFrequency: 300 + Math.random() * 600,
      avgGasPrice: 20 + Math.random() * 30,
      lastUpdate: Date.now() - Math.random() * 3600000,
    }));
  }, [selectedOracles]);

  const atrData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
        high: d.price * (1 + Math.random() * 0.002),
        low: d.price * (1 - Math.random() * 0.002),
        close: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const bollingerData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
        high: d.price * (1 + Math.random() * 0.003),
        low: d.price * (1 - Math.random() * 0.003),
        close: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const qualityTrendData = useMemo(() => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      const data: any[] = [];

      for (let i = 0; i < history.length; i++) {
        const point = history[i];
        const pricesAtTime = selectedOracles
          .map((o) => historicalData[o]?.find((d) => d.timestamp === point.timestamp)?.price)
          .filter((p): p is number => p !== undefined);

        const median =
          pricesAtTime.length > 0
            ? pricesAtTime.sort((a, b) => a - b)[Math.floor(pricesAtTime.length / 2)]
            : point.price;

        data.push({
          timestamp: point.timestamp,
          updateLatency: Math.random() * 500 + 100,
          deviationFromMedian: Math.abs((point.price - median) / median),
          isOutlier: Math.abs((point.price - median) / median) > 0.005,
          isStale: Math.random() > 0.95,
          heartbeatCompliance: 0.95 + Math.random() * 0.05,
        });
      }

      return {
        oracle,
        data,
      };
    });
  }, [historicalData, selectedOracles]);

  const qualityScoreData = useMemo(() => {
    const successCount = priceData.filter((d) => d.price > 0).length;
    const totalCount = selectedOracles.length;
    const latestTimestamp =
      priceData.length > 0 ? Math.max(...priceData.map((d) => d.timestamp)) : Date.now();
    const avgAccuracy =
      performanceData.length > 0
        ? performanceData.reduce((sum, d) => sum + d.accuracy, 0) / performanceData.length
        : 95;

    return {
      freshness: { lastUpdated: new Date(latestTimestamp) },
      completeness: { successCount, totalCount },
      reliability: {
        historicalAccuracy: avgAccuracy,
        responseSuccessRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      },
    };
  }, [priceData, selectedOracles, performanceData]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const filteredPriceData = useMemo(() => {
    return sortedPriceData.filter((data) => {
      if (oracleFilter !== 'all' && data.provider !== oracleFilter) return false;
      if (deviationFilter === 'all') return true;

      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = Math.abs(((data.price - avgPrice) / avgPrice) * 100);
      }

      if (deviationFilter === 'excellent')
        return deviationPercent !== null && deviationPercent < 0.1;
      if (deviationFilter === 'good')
        return deviationPercent !== null && deviationPercent >= 0.1 && deviationPercent < 0.5;
      if (deviationFilter === 'poor') return deviationPercent !== null && deviationPercent >= 0.5;
      return true;
    });
  }, [sortedPriceData, oracleFilter, deviationFilter, validPrices, avgPrice]);

  const outlierStats = useMemo(() => {
    const outliers: {
      index: number;
      provider: OracleProvider;
      zScore: number;
      deviation: number;
    }[] = [];
    filteredPriceData.forEach((data, index) => {
      const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
      if (isOutlier(zScore)) {
        const deviation = avgPrice > 0 ? Math.abs(((data.price - avgPrice) / avgPrice) * 100) : 0;
        outliers.push({ index, provider: data.provider, zScore: zScore!, deviation });
      }
    });
    const avgDeviation =
      outliers.length > 0 ? outliers.reduce((sum, o) => sum + o.deviation, 0) / outliers.length : 0;
    return {
      count: outliers.length,
      avgDeviation,
      outliers,
      oracleNames: outliers.map((o) => oracleNames[o.provider]),
    };
  }, [filteredPriceData, avgPrice, standardDeviation]);

  const scrollToOutlier = useCallback(() => {
    if (outlierStats.outliers.length === 0) return;
    const firstOutlier = outlierStats.outliers[0];
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
  }, [outlierStats.outliers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredPriceData.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, filteredPriceData.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev === null ? filteredPriceData.length - 1 : Math.max(prev - 1, 0)
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedRowIndex !== null) {
          setExpandedRow(expandedRow === selectedRowIndex ? null : selectedRowIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedRowIndex(null);
        setExpandedRow(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredPriceData.length, selectedRowIndex, expandedRow]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(priceData, oracleNames, avgPrice, validPrices);
  }, [priceData, avgPrice, validPrices]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(priceData, oracleNames, avgPrice, validPrices);
  }, [priceData, avgPrice, validPrices]);

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
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    useAccessibleColors,
    setUseAccessibleColors,
    hoveredOracle,
    setHoveredOracle,
    selectedOracleFromChart,
    setSelectedOracleFromChart,
    t,
    router,
    user,
    oracleFavorites,
    currentFavoriteConfig,
    validPrices,
    avgPrice,
    weightedAvgPrice,
    maxPrice,
    minPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    currentStats,
    sortedPriceData,
    filteredPriceData,
    activeFilterCount,
    outlierStats,
    oracleChartColors,
    getChartData,
    heatmapData,
    boxPlotData,
    volatilityData,
    correlationData,
    latencyData,
    performanceData,
    maData,
    gasFeeData,
    atrData,
    bollingerData,
    qualityTrendData,
    qualityScoreData,
    handleSort,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleSaveSnapshot,
    handleSelectSnapshot,
    handleClearFilters,
    getFilterSummary,
    toggleOracle,
    handleApplyFavorite,
    handleExportCSV,
    handleExportJSON,
    scrollToOutlier,
    calculateChangePercent,
    fetchPriceData,
    getLineStrokeDasharray: (oracle: OracleProvider) => getLineStrokeDasharray(oracle, useAccessibleColors),
    getConsistencyRating,
    activeTab,
    handleTabChange,
    setHoveredRowIndex,
    setSelectedRowIndex,
  };
}
