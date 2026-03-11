'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { OracleProvider, PriceData } from '@/lib/types/oracle';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceDot,
} from 'recharts';
import {
  PriceDeviationHeatmap,
  PriceDeviationDataPoint,
} from '@/components/oracle/PriceDeviationHeatmap';
import {
  PriceDistributionBoxPlot,
  OraclePriceData,
} from '@/components/oracle/PriceDistributionBoxPlot';
import { DataQualityScoreCard } from '@/components/oracle/DataQualityScoreCard';
import { LatencyDistributionHistogram } from '@/components/oracle/LatencyDistributionHistogram';
import {
  PriceCorrelationMatrix,
  OraclePriceSeries,
} from '@/components/oracle/PriceCorrelationMatrix';
import { PriceVolatilityChart, OraclePriceHistory } from '@/components/oracle/PriceVolatilityChart';
import {
  OraclePerformanceRanking,
  OraclePerformanceData,
} from '@/components/oracle/OraclePerformanceRanking';
import { SnapshotManager } from '@/components/oracle/SnapshotManager';
import { SnapshotComparison } from '@/components/oracle/SnapshotComparison';
import { saveSnapshot, OracleSnapshot, SnapshotStats } from '@/lib/types/snapshot';
import { FloatingActionButton } from '@/components/oracle/FloatingActionButton';
import {
  oracleClients,
  oracleNames,
  symbols,
  TimeRange,
  DeviationFilter,
  RefreshInterval,
  SortColumn,
  SortDirection,
  calculateWeightedAverage,
  calculateVariance,
  calculateStandardDeviation,
  getConsistencyRating,
  getFreshnessInfo,
  calculateZScore,
  isOutlier,
  exportToCSV,
  exportToJSON,
  timeRanges,
  refreshOptions,
  HistoryMinMax,
  initialHistoryMinMax,
  updateHistoryMinMax,
} from './constants';
import { FilterPanel, StatsCards, MobileStatsCards, PriceTable } from './components';

export default function CrossOraclePage() {
  const { t } = useI18n();
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
  const [statsScrollPosition, setStatsScrollPosition] = useState(0);
  const statsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [historyMinMax, setHistoryMinMax] = useState<HistoryMinMax>(initialHistoryMinMax);
  const [selectedSnapshot, setSelectedSnapshot] = useState<OracleSnapshot | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [highlightedOutlierIndex, setHighlightedOutlierIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);

  const validPrices = useMemo(
    () => priceData.map((d) => d.price).filter((p) => p > 0),
    [priceData]
  );
  const avgPrice = useMemo(
    () => (validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0),
    [validPrices]
  );
  const weightedAvgPrice = useMemo(
    () => calculateWeightedAverage(priceData),
    [priceData]
  );
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
  const standardDeviation = useMemo(
    () => calculateStandardDeviation(variance),
    [variance]
  );
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

  const handleSelectSnapshot = useCallback((snapshot: OracleSnapshot) => {
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
        case '1H': return 1;
        case '24H': return 24;
        case '7D': return 168;
        case '30D': return 720;
        case '90D': return 2160;
        case '1Y': return 8760;
        case 'ALL': return undefined;
        default: return 24;
      }
    };

    const hours = getHoursForTimeRange(timeRange);

    for (const oracle of selectedOracles) {
      try {
        const client = oracleClients[oracle];
        const price = await client.getPrice(selectedSymbol.split('/')[0]);
        const history = await client.getHistoricalPrices(selectedSymbol.split('/')[0], undefined, hours);
        prices.push(price);
        histories[oracle] = history;
      } catch (error) {
        console.error(`Error fetching data from ${oracle}:`, error);
      }
    }

    const currentValidPrices = prices.map((d) => d.price).filter((p) => p > 0);
    const currentAvgPrice = currentValidPrices.length > 0
      ? currentValidPrices.reduce((a, b) => a + b, 0) / currentValidPrices.length
      : 0;
    const currentMaxPrice = currentValidPrices.length > 0 ? Math.max(...currentValidPrices) : 0;
    const currentMinPrice = currentValidPrices.length > 0 ? Math.min(...currentValidPrices) : 0;
    const currentPriceRange = currentMaxPrice - currentMinPrice;
    const currentWeightedAvgPrice = calculateWeightedAverage(prices);
    const currentVariance = calculateVariance(currentValidPrices, currentAvgPrice);
    const currentStandardDeviation = calculateStandardDeviation(currentVariance);
    const currentStandardDeviationPercent = currentAvgPrice > 0
      ? (currentStandardDeviation / currentAvgPrice) * 100
      : 0;

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
      const label = deviationFilter === 'excellent'
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

  const chartColors: Record<OracleProvider, string> = {
    [OracleProvider.CHAINLINK]: '#3B82F6',
    [OracleProvider.BAND_PROTOCOL]: '#10B981',
    [OracleProvider.UMA]: '#F59E0B',
    [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
    [OracleProvider.API3]: '#EC4899',
  };

  const getChartData = useCallback(() => {
    if (Object.keys(historicalData).length === 0) return [];
    const timestamps = new Set<number>();
    Object.values(historicalData).forEach((history) => {
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
        const dataPoint = historicalData[oracle]?.find((d) => d.timestamp === timestamp);
        if (dataPoint) {
          point[oracleNames[oracle]] = dataPoint.price;
          pricesAtTime.push(dataPoint.price);
        }
      });

      if (pricesAtTime.length > 0) {
        const avg = pricesAtTime.reduce((a, b) => a + b, 0) / pricesAtTime.length;
        const variance = pricesAtTime.length > 1
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
  }, [historicalData, selectedOracles]);

  const heatmapData = useMemo((): PriceDeviationDataPoint[] => {
    const result: PriceDeviationDataPoint[] = [];
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

  const boxPlotData = useMemo((): OraclePriceData[] => {
    return selectedOracles.map((oracle) => ({
      oracleId: oracle,
      prices: (historicalData[oracle] || []).map((d) => d.price),
    }));
  }, [historicalData, selectedOracles]);

  const volatilityData = useMemo((): OraclePriceHistory[] => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const correlationData = useMemo((): OraclePriceSeries[] => {
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

  const performanceData = useMemo((): OraclePerformanceData[] => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      const prices = history.map((d) => d.price);
      const mean = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const variance = prices.length > 1
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
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 200;

      return {
        provider: oracle,
        name: oracleNames[oracle],
        responseTime: Math.round(avgLatency),
        accuracy: Math.min(99.5, 95 + Math.random() * 4.5),
        stability: Math.min(100, Math.max(0, stability)),
        dataSources: Math.floor(3 + Math.random() * 10),
        supportedChains: Math.floor(5 + Math.random() * 15),
        color: chartColors[oracle],
      };
    });
  }, [historicalData, selectedOracles]);

  const qualityScoreData = useMemo(() => {
    const successCount = priceData.filter((d) => d.price > 0).length;
    const totalCount = selectedOracles.length;
    const latestTimestamp = priceData.length > 0
      ? Math.max(...priceData.map((d) => d.timestamp))
      : Date.now();
    const avgAccuracy = performanceData.length > 0
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

  const checkScrollButtons = useCallback(() => {
    if (statsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = statsScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  const handleStatsScroll = useCallback((direction: 'left' | 'right') => {
    if (statsScrollRef.current) {
      const scrollAmount = 280;
      const newScrollLeft = statsScrollRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      statsScrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [checkScrollButtons]);

  const filteredPriceData = useMemo(() => {
    return sortedPriceData.filter((data) => {
      if (oracleFilter !== 'all' && data.provider !== oracleFilter) return false;
      if (deviationFilter === 'all') return true;

      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = Math.abs(((data.price - avgPrice) / avgPrice) * 100);
      }

      if (deviationFilter === 'excellent') return deviationPercent !== null && deviationPercent < 0.1;
      if (deviationFilter === 'good') return deviationPercent !== null && deviationPercent >= 0.1 && deviationPercent < 0.5;
      if (deviationFilter === 'poor') return deviationPercent !== null && deviationPercent >= 0.5;
      return true;
    });
  }, [sortedPriceData, oracleFilter, deviationFilter, validPrices, avgPrice]);

  const outlierStats = useMemo(() => {
    const outliers: { index: number; provider: OracleProvider; zScore: number; deviation: number }[] = [];
    filteredPriceData.forEach((data, index) => {
      const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
      if (isOutlier(zScore)) {
        const deviation = avgPrice > 0 ? Math.abs(((data.price - avgPrice) / avgPrice) * 100) : 0;
        outliers.push({ index, provider: data.provider, zScore: zScore!, deviation });
      }
    });
    const avgDeviation = outliers.length > 0
      ? outliers.reduce((sum, o) => sum + o.deviation, 0) / outliers.length
      : 0;
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
        setSelectedRowIndex((prev) => (prev === null ? 0 : Math.min(prev + 1, filteredPriceData.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRowIndex((prev) => (prev === null ? filteredPriceData.length - 1 : Math.max(prev - 1, 0)));
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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;
    const avgPriceData = payload.find((p) => p.dataKey === 'avgPrice');
    const oraclePrices = payload.filter((p) => Object.values(oracleNames).includes(p.dataKey as OracleProvider));
    const avgValue = avgPriceData?.value;
    const stdDevValue = payload.find((p) => p.dataKey === 'stdDev')?.value;

    return (
      <div className="bg-white border border-gray-200 shadow-lg p-4 min-w-[280px]">
        <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</div>
        {avgValue !== undefined && (
          <div className="mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">平均价格</span>
              <span className="font-semibold text-gray-900">${avgValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {stdDevValue !== undefined && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>标准差</span>
                <span>±${stdDevValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 mb-2">预言机价格</div>
          {oraclePrices.map((entry, index) => {
            const deviation = avgValue ? ((entry.value - avgValue) / avgValue) * 100 : null;
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-700">{entry.dataKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {deviation !== null && (
                    <span className={`text-xs ${deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({deviation >= 0 ? '+' : ''}{deviation.toFixed(3)}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style jsx>{`
        @keyframes pulse-highlight {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
        }
        .outlier-highlight-pulse { animation: pulse-highlight 1s ease-in-out 3; }
      `}</style>

      {outlierStats.count > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-lg shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-amber-800">检测到价格异常值</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    {outlierStats.count} 个异常
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-medium">异常预言机:</span>
                    <span className="font-medium">
                      {outlierStats.oracleNames.slice(0, 3).join('、')}
                      {outlierStats.oracleNames.length > 3 && ` 等${outlierStats.oracleNames.length}个`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-medium">平均偏差:</span>
                    <span className="font-medium">{outlierStats.avgDeviation.toFixed(3)}%</span>
                  </div>
                </div>
              </div>
              <button onClick={scrollToOutlier} className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-200">
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors ${
                isFilterPanelOpen || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>筛选</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium bg-blue-600 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <FilterPanel
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              deviationFilter={deviationFilter}
              onDeviationFilterChange={setDeviationFilter}
              oracleFilter={oracleFilter}
              onOracleFilterChange={setOracleFilter}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              getFilterSummary={getFilterSummary}
              t={t}
            />
          </div>

          <button onClick={handleExportCSV} disabled={priceData.length === 0} className="px-3 py-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {t('crossOracle.exportCsv')}
          </button>
          <button onClick={handleExportJSON} disabled={priceData.length === 0} className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {t('crossOracle.exportJson')}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200">
            <span className="text-sm text-gray-600">{t('crossOracle.auto')}</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              className="text-sm bg-transparent focus:outline-none border-none"
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === 0 ? t('crossOracle.refreshInterval.off') :
                   option.value === 30000 ? t('crossOracle.refreshInterval.30s') :
                   option.value === 60000 ? t('crossOracle.refreshInterval.1m') :
                   t('crossOracle.refreshInterval.5m')}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {isLoading ? t('crossOracle.loading') : t('crossOracle.refresh')}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">{t('crossOracle.updated')} {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div className="mb-8">
        <DataQualityScoreCard
          freshness={qualityScoreData.freshness}
          completeness={qualityScoreData.completeness}
          reliability={qualityScoreData.reliability}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SnapshotManager
            onSaveSnapshot={handleSaveSnapshot}
            onSelectSnapshot={handleSelectSnapshot}
            selectedSnapshotId={selectedSnapshot?.id}
          />
        </div>
        <div className="lg:col-span-2">
          {showComparison && selectedSnapshot ? (
            <SnapshotComparison
              currentStats={currentStats}
              currentPriceData={priceData}
              currentSymbol={selectedSymbol}
              selectedSnapshot={selectedSnapshot}
              onClose={() => {
                setShowComparison(false);
                setSelectedSnapshot(null);
              }}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg h-full min-h-[200px] flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm text-gray-500">选择一个快照进行对比</p>
                <p className="text-xs text-gray-400 mt-1">从左侧快照列表中选择一个历史快照</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <StatsCards
          avgPrice={avgPrice}
          weightedAvgPrice={weightedAvgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviationPercent={standardDeviationPercent}
          variance={variance}
          lastStats={lastStats}
          historyMinMax={historyMinMax}
          calculateChangePercent={calculateChangePercent}
          getConsistencyRating={getConsistencyRating}
          t={t}
        />
        <MobileStatsCards
          avgPrice={avgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviationPercent={standardDeviationPercent}
          variance={variance}
          lastStats={lastStats}
          calculateChangePercent={calculateChangePercent}
          getConsistencyRating={getConsistencyRating}
          t={t}
        />
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('crossOracle.currentPriceComparison')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">交易对:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(OracleProvider).map((oracle) => (
            <button
              key={oracle}
              onClick={() => toggleOracle(oracle)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedOracles.includes(oracle)
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[oracle] }} />
              {oracleNames[oracle]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <PriceTable
          priceData={priceData}
          filteredPriceData={filteredPriceData}
          isLoading={isLoading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          expandedRow={expandedRow}
          selectedRowIndex={selectedRowIndex}
          hoveredRowIndex={hoveredRowIndex}
          chartColors={chartColors}
          avgPrice={avgPrice}
          standardDeviation={standardDeviation}
          validPrices={validPrices}
          onSort={handleSort}
          onExpandRow={setExpandedRow}
          onSetHoveredRow={setHoveredRowIndex}
          onSetSelectedRow={setSelectedRowIndex}
          t={t}
        />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.priceTrend')}
            {timeRange !== 'ALL' && (
              <span className="text-sm text-gray-500 ml-2">
                ({timeRange === '1H' ? '1 小时' : timeRange === '24H' ? '24 小时' : timeRange === '7D' ? '7 天' : timeRange === '30D' ? '30 天' : timeRange === '90D' ? '90 天' : '1 年'})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChartFullscreen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors md:hidden"
              title="全屏查看"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button onClick={handleZoomOut} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors" title="缩小">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              <span className="px-2 text-xs text-gray-600 min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors" title="放大">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
            <button onClick={handleResetZoom} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="重置缩放">重置</button>
            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1 text-xs text-gray-500 hidden sm:flex">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} /><span>±1σ</span>
              <span className="w-3 h-3 rounded ml-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }} /><span>±2σ</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 border border-gray-200">
            <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        ) : getChartData().length === 0 ? (
          <div className="flex items-center justify-center py-24 border border-gray-200">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-sm text-gray-500">暂无历史数据</p>
              <p className="text-xs text-gray-400 mt-1">请选择时间范围并刷新数据</p>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={400 * zoomLevel}>
              <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="stdDevGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="timestamp" stroke="#6B7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="upperBound2" stroke="none" fill="url(#stdDevGradient2)" fillOpacity={1} isAnimationActive={false} />
                <Area type="monotone" dataKey="lowerBound2" stroke="none" fill="#ffffff" fillOpacity={1} isAnimationActive={false} />
                <Area type="monotone" dataKey="upperBound1" stroke="none" fill="url(#stdDevGradient1)" fillOpacity={1} isAnimationActive={false} />
                <Area type="monotone" dataKey="lowerBound1" stroke="none" fill="#ffffff" fillOpacity={1} isAnimationActive={false} />
                <Line type="monotone" dataKey="avgPrice" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} name="平均价格" />
                {selectedOracles.map((oracle) => (
                  <Line key={oracle} type="monotone" dataKey={oracleNames[oracle]} stroke={chartColors[oracle]} strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: chartColors[oracle] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-500" style={{ borderTop: '2px dashed #6366f1' }} /><span>平均价格线</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shadow-sm" /><span>数据更新点</span></div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }} /><span>±1 标准差范围</span></div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }} /><span>±2 标准差范围</span></div>
            </div>
          </div>
        )}
      </div>

      {isChartFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('crossOracle.priceTrend')} - {selectedSymbol}</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                <button onClick={handleZoomOut} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
                <span className="px-3 text-sm text-gray-600 min-w-[4rem] text-center font-medium">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={handleZoomIn} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
              </div>
              <button onClick={handleResetZoom} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">重置</button>
              <button onClick={() => setIsChartFullscreen(false)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="stdDevGradient1Fullscreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2Fullscreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="timestamp" stroke="#6B7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="upperBound2" stroke="none" fill="url(#stdDevGradient2Fullscreen)" fillOpacity={1} isAnimationActive={false} />
                <Area type="monotone" dataKey="lowerBound2" stroke="none" fill="#ffffff" fillOpacity={1} isAnimationActive={false} />
                <Area type="monotone" dataKey="upperBound1" stroke="none" fill="url(#stdDevGradient1Fullscreen)" fillOpacity={1} isAnimationActive={false} />
                <Area type="monotone" dataKey="lowerBound1" stroke="none" fill="#ffffff" fillOpacity={1} isAnimationActive={false} />
                <Line type="monotone" dataKey="avgPrice" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} name="平均价格" />
                {selectedOracles.map((oracle) => (
                  <Line key={oracle} type="monotone" dataKey={oracleNames[oracle]} stroke={chartColors[oracle]} strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: chartColors[oracle] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-indigo-500" style={{ borderTop: '2px dashed #6366f1' }} /><span>平均价格线</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500 border border-white shadow-sm" /><span>数据更新点</span></div>
            <div className="flex items-center gap-2"><span className="w-5 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }} /><span>±1 标准差范围</span></div>
            <div className="flex items-center gap-2"><span className="w-5 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }} /><span>±2 标准差范围</span></div>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">双指缩放查看更多细节</p>
          </div>
        </div>
      )}

      {heatmapData.length > 0 && (
        <div className="mb-8">
          <PriceDeviationHeatmap data={heatmapData} />
        </div>
      )}

      {boxPlotData.some((d) => d.prices.length > 0) && (
        <div className="mb-8">
          <PriceDistributionBoxPlot data={boxPlotData} oracleNames={oracleNames} />
        </div>
      )}

      {volatilityData.some((d) => d.prices.length > 0) && (
        <div className="mb-8">
          <PriceVolatilityChart data={volatilityData} oracleNames={oracleNames} />
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">性能对比分析</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <LatencyDistributionHistogram data={latencyData} oracleName="所有预言机" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">预言机性能摘要</h3>
            <div className="space-y-3">
              {performanceData.map((data) => (
                <div key={data.provider} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                    <span className="font-medium text-gray-900">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="text-center">
                      <p className="text-gray-400">响应时间</p>
                      <p className="font-semibold text-gray-900">{data.responseTime}ms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">准确率</p>
                      <p className="font-semibold text-green-600">{data.accuracy.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">稳定性</p>
                      <p className="font-semibold text-blue-600">{data.stability.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">高级分析</h2>
        {correlationData.length >= 2 && (
          <div className="mb-6">
            <PriceCorrelationMatrix data={correlationData} oracleNames={oracleNames} />
          </div>
        )}
      </div>

      {performanceData.length > 0 && (
        <div className="mb-8">
          <OraclePerformanceRanking performanceData={performanceData} />
        </div>
      )}

      <FloatingActionButton
        onRefresh={fetchPriceData}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onExportExcel={handleExportCSV}
        isLoading={isLoading}
      />
    </div>
  );
}
