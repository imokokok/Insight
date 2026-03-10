'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import GaugeChart from '@/components/GaugeChart';
import { OracleProvider, PriceData } from '@/lib/types/oracle';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
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
import { PriceDeviationHeatmap, PriceDeviationDataPoint } from '@/components/oracle/PriceDeviationHeatmap';
import { PriceDistributionBoxPlot, OraclePriceData } from '@/components/oracle/PriceDistributionBoxPlot';
import { DataQualityScoreCard } from '@/components/oracle/DataQualityScoreCard';
import { LatencyDistributionHistogram } from '@/components/oracle/LatencyDistributionHistogram';
import { PriceCorrelationMatrix, OraclePriceSeries } from '@/components/oracle/PriceCorrelationMatrix';
import { PriceVolatilityChart, OraclePriceHistory } from '@/components/oracle/PriceVolatilityChart';
import { OraclePerformanceRanking, OraclePerformanceData } from '@/components/oracle/OraclePerformanceRanking';

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const oracleNames = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'];

type SortColumn = 'price' | 'timestamp' | null;
type SortDirection = 'asc' | 'desc';
type RefreshInterval = 0 | 30000 | 60000 | 300000;
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
type DeviationFilter = 'all' | 'excellent' | 'good' | 'poor';

const getDeviationColorClass = (deviationPercent: number | null): string => {
  if (deviationPercent === null) return 'text-gray-400';
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return 'text-green-600 bg-green-50';
  if (absDeviation < 0.5) return 'text-yellow-600 bg-yellow-50';
  if (absDeviation < 1.0) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
};

const getDeviationBgClass = (deviationPercent: number | null): string => {
  if (deviationPercent === null) return '';
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return 'bg-green-500';
  if (absDeviation < 0.5) return 'bg-yellow-500';
  if (absDeviation < 1.0) return 'bg-orange-500';
  return 'bg-red-500';
};

const getFreshnessInfo = (timestamp: number): { text: string; colorClass: string; seconds: number } => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  
  let text: string;
  let colorClass: string;
  
  if (seconds < 30) {
    text = seconds <= 1 ? '刚刚' : `${seconds}秒前`;
    colorClass = 'text-green-600';
  } else if (seconds < 60) {
    text = `${seconds}秒前`;
    colorClass = 'text-yellow-600';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    text = `${minutes}分钟前`;
    colorClass = 'text-red-600';
  } else {
    const hours = Math.floor(seconds / 3600);
    text = `${hours}小时前`;
    colorClass = 'text-red-600';
  }
  
  return { text, colorClass, seconds };
};

const getFreshnessDotColor = (seconds: number): string => {
  if (seconds < 30) return 'bg-green-500';
  if (seconds < 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

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
  const [prevStats, setPrevStats] = useState<{
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    variance: number;
    standardDeviation: number;
    standardDeviationPercent: number;
  } | null>(null);
  const [lastStats, setLastStats] = useState<{
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    variance: number;
    standardDeviation: number;
    standardDeviationPercent: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [deviationFilter, setDeviationFilter] = useState<DeviationFilter>('all');
  const [oracleFilter, setOracleFilter] = useState<OracleProvider | 'all'>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [historyMinMax, setHistoryMinMax] = useState<{
    avgPrice: { min: number; max: number };
    weightedAvgPrice: { min: number; max: number };
    maxPrice: { min: number; max: number };
    minPrice: { min: number; max: number };
    priceRange: { min: number; max: number };
    standardDeviationPercent: { min: number; max: number };
    variance: { min: number; max: number };
  }>({
    avgPrice: { min: Infinity, max: -Infinity },
    weightedAvgPrice: { min: Infinity, max: -Infinity },
    maxPrice: { min: Infinity, max: -Infinity },
    minPrice: { min: Infinity, max: -Infinity },
    priceRange: { min: Infinity, max: -Infinity },
    standardDeviationPercent: { min: Infinity, max: -Infinity },
    variance: { min: Infinity, max: -Infinity },
  });

  const calculateWeightedAverage = (prices: PriceData[]): number => {
    const validData = prices.filter((d) => d.price > 0);
    if (validData.length === 0) return 0;

    let weightedSum = 0;
    let weightSum = 0;

    validData.forEach((data) => {
      const weight = data.confidence && data.confidence > 0 ? data.confidence : 1;
      weightedSum += data.price * weight;
      weightSum += weight;
    });

    return weightSum > 0 ? weightedSum / weightSum : 0;
  };

  const updateHistoryMinMax = (currentStats: typeof prevStats) => {
    if (!currentStats) return;
    setHistoryMinMax((prev) => ({
      avgPrice: {
        min: Math.min(prev.avgPrice.min, currentStats.avgPrice),
        max: Math.max(prev.avgPrice.max, currentStats.avgPrice),
      },
      weightedAvgPrice: {
        min: Math.min(prev.weightedAvgPrice.min, currentStats.weightedAvgPrice),
        max: Math.max(prev.weightedAvgPrice.max, currentStats.weightedAvgPrice),
      },
      maxPrice: {
        min: Math.min(prev.maxPrice.min, currentStats.maxPrice),
        max: Math.max(prev.maxPrice.max, currentStats.maxPrice),
      },
      minPrice: {
        min: Math.min(prev.minPrice.min, currentStats.minPrice),
        max: Math.max(prev.minPrice.max, currentStats.minPrice),
      },
      priceRange: {
        min: Math.min(prev.priceRange.min, currentStats.priceRange),
        max: Math.max(prev.priceRange.max, currentStats.priceRange),
      },
      standardDeviationPercent: {
        min: Math.min(prev.standardDeviationPercent.min, currentStats.standardDeviationPercent),
        max: Math.max(prev.standardDeviationPercent.max, currentStats.standardDeviationPercent),
      },
      variance: {
        min: Math.min(prev.variance.min, currentStats.variance),
        max: Math.max(prev.variance.max, currentStats.variance),
      },
    }));
  };

  const calculateVariance = (prices: number[], mean: number): number => {
    if (prices.length < 2) return 0;
    const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
    return sumSquaredDiff / prices.length;
  };

  const calculateStandardDeviation = (variance: number): number => {
    return Math.sqrt(variance);
  };

  const getConsistencyRating = (stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'excellent';
    if (stdDevPercent < 0.3) return 'good';
    if (stdDevPercent < 0.5) return 'fair';
    return 'poor';
  };

  const getHealthColor = (type: 'price' | 'deviation' | 'range', value: number, avgValue?: number): {
    bg: string;
    text: string;
    border: string;
    indicator: 'success' | 'warning' | 'danger' | 'neutral';
  } => {
    if (type === 'deviation') {
      if (value < 0.1) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', indicator: 'success' };
      if (value < 0.3) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', indicator: 'success' };
      if (value < 0.5) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', indicator: 'warning' };
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', indicator: 'danger' };
    }
    if (type === 'range' && avgValue) {
      const rangePercent = (value / avgValue) * 100;
      if (rangePercent < 0.5) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', indicator: 'success' };
      if (rangePercent < 1) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', indicator: 'success' };
      if (rangePercent < 2) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', indicator: 'warning' };
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', indicator: 'danger' };
    }
    return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', indicator: 'neutral' };
  };

  const getTrendIcon = (changePercent: number | null) => {
    if (changePercent === null) return null;
    const isPositive = changePercent >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {isPositive ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {Math.abs(changePercent).toFixed(2)}%
      </span>
    );
  };

  const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
    if (stdDev === 0) return null;
    return (price - mean) / stdDev;
  };

  const isOutlier = (zScore: number | null): boolean => {
    if (zScore === null) return false;
    return Math.abs(zScore) > 2;
  };

  const exportToCSV = () => {
    const headers = ['Oracle', 'Price', 'Deviation (%)', 'Confidence', 'Source', 'Timestamp'];
    const rows = priceData.map((data) => {
      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
      }
      return [
        oracleNames[data.provider],
        data.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        deviationPercent !== null ? deviationPercent.toFixed(2) : '',
        data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '',
        data.source || '',
        new Date(data.timestamp).toLocaleString(),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `oracle-prices-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const exportData = priceData.map((data) => {
      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
      }
      return {
        oracle: oracleNames[data.provider],
        provider: data.provider,
        symbol: data.symbol,
        price: data.price,
        deviationPercent: deviationPercent,
        confidence: data.confidence,
        source: data.source,
        timestamp: new Date(data.timestamp).toISOString(),
      };
    });

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `oracle-prices-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validPrices = priceData.map((d) => d.price).filter((p) => p > 0);
  const avgPrice =
    validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  const weightedAvgPrice = calculateWeightedAverage(priceData);
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  const priceRange = maxPrice - minPrice;

  const variance = calculateVariance(validPrices, avgPrice);
  const standardDeviation = calculateStandardDeviation(variance);
  const standardDeviationPercent = avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPriceData = [...priceData].sort((a, b) => {
    if (!sortColumn) return 0;

    if (sortColumn === 'price') {
      return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
    }

    if (sortColumn === 'timestamp') {
      return sortDirection === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    }

    return 0;
  });

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
        console.error(`Error fetching data from ${oracle}:`, error);
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

    const calculateWeightedAverageForFetch = (dataArr: PriceData[]): number => {
      const validData = dataArr.filter((d) => d.price > 0);
      if (validData.length === 0) return 0;

      let weightedSum = 0;
      let weightSum = 0;

      validData.forEach((data) => {
        const weight = data.confidence && data.confidence > 0 ? data.confidence : 1;
        weightedSum += data.price * weight;
        weightSum += weight;
      });

      return weightSum > 0 ? weightedSum / weightSum : 0;
    };
    const currentWeightedAvgPrice = calculateWeightedAverageForFetch(prices);

    const calculateVarianceForFetch = (pricesArr: number[], mean: number): number => {
      if (pricesArr.length < 2) return 0;
      const sumSquaredDiff = pricesArr.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
      return sumSquaredDiff / pricesArr.length;
    };
    const currentVariance = calculateVarianceForFetch(currentValidPrices, currentAvgPrice);
    const currentStandardDeviation = Math.sqrt(currentVariance);
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
    updateHistoryMinMax({
      avgPrice: currentAvgPrice,
      weightedAvgPrice: currentWeightedAvgPrice,
      maxPrice: currentMaxPrice,
      minPrice: currentMinPrice,
      priceRange: currentPriceRange,
      variance: currentVariance,
      standardDeviation: currentStandardDeviation,
      standardDeviationPercent: currentStandardDeviationPercent,
    });

    setPriceData(prices);
    setHistoricalData(histories);
    setLastUpdated(new Date());
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const refreshOptions = [
    { value: 0, label: '关闭' },
    { value: 30000, label: '30 秒' },
    { value: 60000, label: '1 分钟' },
    { value: 300000, label: '5 分钟' },
  ];

  const timeRanges: TimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const chartColors = {
    [OracleProvider.CHAINLINK]: '#3B82F6',
    [OracleProvider.BAND_PROTOCOL]: '#10B981',
    [OracleProvider.UMA]: '#F59E0B',
    [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
    [OracleProvider.API3]: '#EC4899',
  };

  const getChartData = () => {
    if (Object.keys(historicalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(historicalData).forEach((history) => {
      history?.forEach((data) => timestamps.add(data.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const dataPoints = sortedTimestamps.map((timestamp) => {
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

    return dataPoints;
  };

  const heatmapData = useMemo((): PriceDeviationDataPoint[] => {
    const result: PriceDeviationDataPoint[] = [];
    const chartDataPoints = getChartData();
    
    chartDataPoints.forEach((point) => {
      const avgPrice = point.avgPrice as number | undefined;
      if (!avgPrice) return;
      
      selectedOracles.forEach((oracle) => {
        const price = point[oracleNames[oracle]] as number | undefined;
        if (price !== undefined) {
          const deviationPercent = ((price - avgPrice) / avgPrice) * 100;
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
  }, [historicalData, selectedOracles, avgPrice]);

  const boxPlotData = useMemo((): OraclePriceData[] => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracleId: oracle,
        prices: history.map((d) => d.price),
      };
    });
  }, [historicalData, selectedOracles]);

  const volatilityData = useMemo((): OraclePriceHistory[] => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracle,
        prices: history.map((d) => ({
          timestamp: d.timestamp,
          price: d.price,
        })),
      };
    });
  }, [historicalData, selectedOracles]);

  const correlationData = useMemo((): OraclePriceSeries[] => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracleId: oracle,
        data: history.map((d) => ({
          timestamp: d.timestamp,
          price: d.price,
        })),
      };
    });
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
    return latencies.length > 0 ? latencies : [150, 180, 200, 220, 250, 280, 300, 320, 350, 400, 450, 500];
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
      freshness: {
        lastUpdated: new Date(latestTimestamp),
      },
      completeness: {
        successCount,
        totalCount,
      },
      reliability: {
        historicalAccuracy: avgAccuracy,
        responseSuccessRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      },
    };
  }, [priceData, selectedOracles, performanceData]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;

    const avgPriceData = payload.find((p) => p.dataKey === 'avgPrice');
    const oraclePrices = payload.filter((p) => 
      Object.values(oracleNames).includes(p.dataKey as OracleProvider)
    );
    
    const avgValue = avgPriceData?.value;
    const stdDevValue = payload.find((p) => p.dataKey === 'stdDev')?.value;

    return (
      <div className="bg-white border border-gray-200 shadow-lg p-4 min-w-[280px]">
        <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
          {label}
        </div>
        
        {avgValue !== undefined && (
          <div className="mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">平均价格</span>
              <span className="font-semibold text-gray-900">
                ${avgValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
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
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-700">{entry.dataKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">
                    ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(`crossOracle.timeRange.${range}`) || range}
              </button>
            ))}
          </div>
          <button
            onClick={exportToCSV}
            disabled={priceData.length === 0}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('crossOracle.exportCsv')}
          </button>
          <button
            onClick={exportToJSON}
            disabled={priceData.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
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
                  {option.label === '关闭'
                    ? t('crossOracle.refreshInterval.off')
                    : option.label === '30秒'
                      ? t('crossOracle.refreshInterval.30s')
                      : option.label === '1分钟'
                        ? t('crossOracle.refreshInterval.1m')
                        : t('crossOracle.refreshInterval.5m')}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            {isLoading ? t('crossOracle.loading') : t('crossOracle.refresh')}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('crossOracle.updated')} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Data Quality Score Card */}
      <div className="mb-8">
        <DataQualityScoreCard
          freshness={qualityScoreData.freshness}
          completeness={qualityScoreData.completeness}
          reliability={qualityScoreData.reliability}
        />
      </div>

      {/* Stats Grid - Enhanced Design */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Average Price Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('crossOracle.averagePrice')}
                </span>
              </div>
              {getTrendIcon(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">
              {avgPrice > 0 ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Wtd: {weightedAvgPrice > 0 ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
            </div>
            {historyMinMax.avgPrice.max > -Infinity && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">历史范围</span>
                <span className="text-gray-600 font-medium">
                  ${historyMinMax.avgPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ${historyMinMax.avgPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Highest Price Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('crossOracle.highestPrice')}
                </span>
              </div>
              {getTrendIcon(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">
              {maxPrice > 0 ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Low: {minPrice > 0 ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
            </div>
            {historyMinMax.maxPrice.max > -Infinity && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">历史范围</span>
                <span className="text-gray-600 font-medium">
                  ${historyMinMax.maxPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ${historyMinMax.maxPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Price Range Card */}
          <div className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${getHealthColor('range', priceRange, avgPrice).border}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${getHealthColor('range', priceRange, avgPrice).bg}`}>
                  <svg className={`w-3.5 h-3.5 ${getHealthColor('range', priceRange, avgPrice).text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('crossOracle.priceRange')}
                </span>
              </div>
              {getTrendIcon(calculateChangePercent(priceRange, lastStats?.priceRange || 0))}
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">
              {priceRange > 0 ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{avgPrice > 0 ? `${((priceRange / avgPrice) * 100).toFixed(3)}% of avg` : '-'}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getHealthColor('range', priceRange, avgPrice).bg} ${getHealthColor('range', priceRange, avgPrice).text}`}>
                {getHealthColor('range', priceRange, avgPrice).indicator === 'success' ? '健康' : getHealthColor('range', priceRange, avgPrice).indicator === 'warning' ? '注意' : getHealthColor('range', priceRange, avgPrice).indicator === 'danger' ? '警告' : ''}
              </span>
            </div>
            {historyMinMax.priceRange.max > -Infinity && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">历史范围</span>
                <span className="text-gray-600 font-medium">
                  ${historyMinMax.priceRange.min.toLocaleString(undefined, { maximumFractionDigits: 2 })} - ${historyMinMax.priceRange.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Standard Deviation Card */}
          <div className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${getHealthColor('deviation', standardDeviationPercent).border}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${getHealthColor('deviation', standardDeviationPercent).bg}`}>
                  <svg className={`w-3.5 h-3.5 ${getHealthColor('deviation', standardDeviationPercent).text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('crossOracle.stdDev')}
                </span>
              </div>
              {getTrendIcon(calculateChangePercent(standardDeviationPercent, lastStats?.standardDeviationPercent || 0))}
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">
              {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Abs: {standardDeviation > 0 ? `$${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getHealthColor('deviation', standardDeviationPercent).bg} ${getHealthColor('deviation', standardDeviationPercent).text}`}>
                {getHealthColor('deviation', standardDeviationPercent).indicator === 'success' ? '健康' : getHealthColor('deviation', standardDeviationPercent).indicator === 'warning' ? '注意' : getHealthColor('deviation', standardDeviationPercent).indicator === 'danger' ? '警告' : ''}
              </span>
            </div>
            {historyMinMax.standardDeviationPercent.max > -Infinity && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">历史范围</span>
                <span className="text-gray-600 font-medium">
                  {historyMinMax.standardDeviationPercent.min.toFixed(4)}% - {historyMinMax.standardDeviationPercent.max.toFixed(4)}%
                </span>
              </div>
            )}
          </div>

          {/* Variance Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('crossOracle.variance')}
                </span>
              </div>
              {getTrendIcon(calculateChangePercent(variance, lastStats?.variance || 0))}
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">
              {variance > 0 ? `$${variance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
            </p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${standardDeviationPercent < 0.3 ? 'bg-emerald-400' : standardDeviationPercent < 0.5 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min((standardDeviationPercent / 1) * 100, 100)}%` }}
              />
            </div>
            {historyMinMax.variance.max > -Infinity && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">历史范围</span>
                <span className="text-gray-600 font-medium">
                  ${historyMinMax.variance.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ${historyMinMax.variance.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Consistency Rating Card */}
          <div className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${getHealthColor('deviation', standardDeviationPercent).border}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${getHealthColor('deviation', standardDeviationPercent).bg}`}>
                  <svg className={`w-3.5 h-3.5 ${getHealthColor('deviation', standardDeviationPercent).text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('crossOracle.consistencyRating')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <GaugeChart value={standardDeviationPercent} maxValue={1} size={40} />
              <div className="flex-1">
                {standardDeviationPercent > 0 && (
                  <span className={`text-sm font-bold ${
                    getConsistencyRating(standardDeviationPercent) === 'excellent' ? 'text-emerald-600' :
                    getConsistencyRating(standardDeviationPercent) === 'good' ? 'text-blue-600' :
                    getConsistencyRating(standardDeviationPercent) === 'fair' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {t(`crossOracle.consistency.${getConsistencyRating(standardDeviationPercent)}`)}
                  </span>
                )}
                <div className="flex gap-1 mt-1">
                  <div className={`h-1 flex-1 rounded ${standardDeviationPercent < 0.1 ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${standardDeviationPercent < 0.3 ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${standardDeviationPercent < 0.5 ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${standardDeviationPercent >= 0.5 ? 'bg-red-400' : 'bg-gray-200'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selectors - Flat Design */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t('crossOracle.selectSymbolTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t('crossOracle.selectOraclesTitle')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.values(OracleProvider).map((oracle) => {
              const isSelected = selectedOracles.includes(oracle);
              return (
                <button
                  key={oracle}
                  onClick={() => toggleOracle(oracle)}
                  className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : chartColors[oracle] }}
                  />
                  {oracleNames[oracle]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Price Comparison Table - Enhanced Design */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.currentPriceComparison')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500">偏差筛选:</span>
              <div className="flex bg-gray-100 rounded-md p-0.5">
                {[
                  { value: 'all' as const, label: '全部' },
                  { value: 'excellent' as const, label: '<0.1%' },
                  { value: 'good' as const, label: '0.1-0.5%' },
                  { value: 'poor' as const, label: '>0.5%' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setDeviationFilter(filter.value)}
                    className={`px-2 py-1 rounded transition-all ${
                      deviationFilter === filter.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500">预言机:</span>
              <select
                value={oracleFilter}
                onChange={(e) => setOracleFilter(e.target.value as OracleProvider | 'all')}
                className="px-2 py-1 border border-gray-200 rounded text-xs bg-white"
              >
                <option value="all">全部</option>
                {Object.values(OracleProvider).map((oracle) => (
                  <option key={oracle} value={oracle}>
                    {oracleNames[oracle]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 border border-gray-200">
            <svg
              className="w-6 h-6 text-gray-400 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('crossOracle.oracle')}
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('crossOracle.price')}
                      {sortColumn === 'price' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  {validPrices.length > 1 && avgPrice > 0 && (
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {t('crossOracle.deviation')}
                    </th>
                  )}
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide hidden sm:table-cell">
                    {t('crossOracle.confidence')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide hidden md:table-cell">
                    {t('crossOracle.source')}
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      新鲜度
                      {sortColumn === 'timestamp' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPriceData
                  .filter((data) => {
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
                  })
                  .map((data, index) => {
                    let deviationPercent: number | null = null;
                    if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
                      deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
                    }
                    const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
                    const outlier = isOutlier(zScore);
                    const freshness = getFreshnessInfo(data.timestamp);
                    const isExpanded = expandedRow === index;
                    
                    return (
                      <>
                        <tr
                          key={index}
                          onClick={() => setExpandedRow(isExpanded ? null : index)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${
                            outlier ? 'bg-amber-50' : 'hover:bg-blue-50'
                          } ${isExpanded ? 'bg-blue-50' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: chartColors[data.provider] }}
                              />
                              <span className="font-medium text-gray-900 text-sm">
                                {oracleNames[data.provider]}
                              </span>
                              {outlier && (
                                <span className="text-amber-600 text-xs font-medium bg-amber-100 px-1.5 py-0.5 rounded">
                                  {t('crossOracle.outlier')}
                                </span>
                              )}
                              <svg
                                className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono text-sm ${outlier ? 'text-amber-700' : 'text-gray-900'}`}
                          >
                            $
                            {data.price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          {validPrices.length > 1 && avgPrice > 0 && (
                            <td className="py-3 px-4 text-right">
                              {deviationPercent !== null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDeviationColorClass(deviationPercent)}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDeviationBgClass(deviationPercent)}`} />
                                  {deviationPercent >= 0 ? '+' : ''}
                                  {deviationPercent.toFixed(3)}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-right hidden sm:table-cell">
                            {data.confidence ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-sm text-gray-700">
                                  {(data.confidence * 100).toFixed(1)}%
                                </span>
                                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${data.confidence * 100}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600 text-sm hidden md:table-cell">
                            {data.source || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`w-2 h-2 rounded-full ${getFreshnessDotColor(freshness.seconds)}`} />
                              <span className={`text-sm ${freshness.colorClass}`}>
                                {freshness.text}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${index}-detail`} className="bg-gray-50 border-b border-gray-100">
                            <td colSpan={6} className="py-4 px-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500 block">预言机</span>
                                  <span className="font-medium text-gray-900">{oracleNames[data.provider]}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">价格</span>
                                  <span className="font-mono text-gray-900">
                                    ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">偏离度</span>
                                  <span className={`font-medium ${getDeviationColorClass(deviationPercent).split(' ')[0]}`}>
                                    {deviationPercent !== null ? `${deviationPercent >= 0 ? '+' : ''}${deviationPercent.toFixed(4)}%` : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">置信度</span>
                                  <span className="text-gray-900">
                                    {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">数据来源</span>
                                  <span className="text-gray-900">{data.source || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">更新时间</span>
                                  <span className="text-gray-900">
                                    {new Date(data.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">Z-Score</span>
                                  <span className={`font-medium ${zScore !== null && Math.abs(zScore) > 2 ? 'text-amber-600' : 'text-gray-900'}`}>
                                    {zScore !== null ? zScore.toFixed(3) : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">状态</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    outlier ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {outlier ? '异常值' : '正常'}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Price Trend Chart - Enhanced */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.priceTrend')}
            {timeRange !== 'ALL' && (
              <span className="text-sm text-gray-500 ml-2">
                (
                {timeRange === '1H'
                  ? '1 小时'
                  : timeRange === '24H'
                    ? '24 小时'
                    : timeRange === '7D'
                      ? '7 天'
                      : timeRange === '30D'
                        ? '30 天'
                        : timeRange === '90D'
                          ? '90 天'
                          : '1 年'}
                )
              </span>
            )}
          </h2>
          
          {/* Chart Toolbar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                title="缩小"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 text-xs text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                title="放大"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="重置缩放"
            >
              重置
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
              <span>±1σ</span>
              <span className="w-3 h-3 rounded ml-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }} />
              <span>±2σ</span>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-24 border border-gray-200">
            <svg
              className="w-6 h-6 text-gray-400 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        ) : (
          <div className="border border-gray-200 p-4" style={{ height: `${320 * zoomLevel}px`, maxHeight: '600px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getChartData()}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="stdDevGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(59, 130, 246, 0.15)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="rgba(59, 130, 246, 0.05)" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="stdDevGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(59, 130, 246, 0.08)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="rgba(59, 130, 246, 0.02)" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={true}
                  horizontal={true}
                />
                
                <XAxis
                  dataKey="timestamp"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#d1d5db' }}
                  interval="preserveStartEnd"
                />
                
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  width={75}
                  domain={['auto', 'auto']}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend
                  wrapperStyle={{
                    paddingTop: '16px',
                    fontSize: '12px',
                  }}
                  iconType="circle"
                  iconSize={8}
                  verticalAlign="bottom"
                  height={36}
                />
                
                {/* ±2 Standard Deviation Area */}
                <Area
                  type="monotone"
                  dataKey="upperBound2"
                  stroke="none"
                  fill="url(#stdDevGradient2)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound2"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                
                {/* ±1 Standard Deviation Area */}
                <Area
                  type="monotone"
                  dataKey="upperBound1"
                  stroke="none"
                  fill="url(#stdDevGradient1)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound1"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                
                {/* Average Price Line */}
                <Line
                  type="monotone"
                  dataKey="avgPrice"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  name="平均价格"
                />
                
                {/* Oracle Price Lines */}
                {selectedOracles.map((oracle) => (
                  <Line
                    key={oracle}
                    type="monotone"
                    dataKey={oracleNames[oracle]}
                    stroke={chartColors[oracle]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ 
                      r: 5, 
                      strokeWidth: 2, 
                      stroke: '#ffffff',
                      fill: chartColors[oracle]
                    }}
                  />
                ))}
                
                {/* Update Event Markers */}
                {getChartData().map((point, index) => {
                  if (index % Math.max(1, Math.floor(getChartData().length / 10)) === 0) {
                    return (
                      <ReferenceDot
                        key={`marker-${index}`}
                        x={point.timestamp as string}
                        y={point.avgPrice as number}
                        r={3}
                        fill="#6366f1"
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    );
                  }
                  return null;
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Chart Legend Info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-indigo-500" style={{ borderTop: '2px dashed #6366f1' }} />
            <span>平均价格线</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shadow-sm" />
            <span>数据更新点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-2.5 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }} />
            <span>±1 标准差范围</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-2.5 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }} />
            <span>±2 标准差范围</span>
          </div>
        </div>
      </div>

      {/* Price Deviation Heatmap */}
      {heatmapData.length > 0 && (
        <div className="mb-8">
          <PriceDeviationHeatmap data={heatmapData} />
        </div>
      )}

      {/* Price Distribution Box Plot */}
      {boxPlotData.some((d) => d.prices.length > 0) && (
        <div className="mb-8">
          <PriceDistributionBoxPlot 
            data={boxPlotData} 
            oracleNames={oracleNames}
          />
        </div>
      )}

      {/* Price Volatility Chart */}
      {volatilityData.some((d) => d.prices.length > 0) && (
        <div className="mb-8">
          <PriceVolatilityChart 
            data={volatilityData} 
            oracleNames={oracleNames}
          />
        </div>
      )}

      {/* Performance Comparison Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          性能对比分析
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latency Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <LatencyDistributionHistogram 
              data={latencyData}
              oracleName="所有预言机"
            />
          </div>

          {/* Oracle Performance Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">预言机性能摘要</h3>
            <div className="space-y-3">
              {performanceData.map((data) => (
                <div key={data.provider} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: data.color }}
                    />
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

      {/* Advanced Analysis Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          高级分析
        </h2>
        
        {/* Price Correlation Matrix */}
        {correlationData.length >= 2 && (
          <div className="mb-6">
            <PriceCorrelationMatrix 
              data={correlationData} 
              oracleNames={oracleNames}
            />
          </div>
        )}
      </div>

      {/* Oracle Performance Ranking */}
      {performanceData.length > 0 && (
        <div className="mb-8">
          <OraclePerformanceRanking performanceData={performanceData} />
        </div>
      )}
    </div>
  );
}
