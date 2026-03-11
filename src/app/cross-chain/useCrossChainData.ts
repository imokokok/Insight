'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { OracleProvider, Blockchain, PriceData } from '@/lib/oracles';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import {
  HeatmapData,
  PriceDifference,
  BoxPlotData,
  ChartDataPoint,
  IqrOutliers,
  RefreshInterval,
} from './constants';
import {
  chainNames,
  chainColors,
  calculateVariance,
  calculateStandardDeviation,
  calculatePercentile,
  calculatePearsonCorrelation,
  calculateSMA,
} from './utils';

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

export interface UseCrossChainDataReturn {
  selectedProvider: OracleProvider;
  setSelectedProvider: (provider: OracleProvider) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (range: number) => void;
  selectedBaseChain: Blockchain | null;
  setSelectedBaseChain: (chain: Blockchain | null) => void;
  visibleChains: Blockchain[];
  setVisibleChains: (chains: Blockchain[]) => void;
  showMA: boolean;
  setShowMA: (show: boolean) => void;
  maPeriod: number;
  setMaPeriod: (period: number) => void;
  chartKey: number;
  setChartKey: (key: number) => void;
  hiddenLines: Set<string>;
  setHiddenLines: (lines: Set<string>) => void;
  focusedChain: Blockchain | null;
  setFocusedChain: (chain: Blockchain | null) => void;
  tableFilter: 'all' | 'abnormal' | 'normal';
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  hoveredCell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null;
  setHoveredCell: (cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null) => void;
  selectedCell: { xChain: Blockchain; yChain: Blockchain } | null;
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
  tooltipPosition: { x: number; y: number };
  setTooltipPosition: (position: { x: number; y: number }) => void;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  lastUpdated: Date | null;
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  recommendedBaseChain: Blockchain | null;
  supportedChains: Blockchain[];
  currentClient: any;
  fetchData: () => Promise<void>;
  filteredChains: Blockchain[];
  priceDifferences: PriceDifference[];
  sortedPriceDifferences: PriceDifference[];
  chartData: ChartDataPoint[];
  chartDataWithMA: ChartDataPoint[];
  heatmapData: HeatmapData[];
  maxHeatmapValue: number;
  priceDistributionData: { range: string; count: number; midPrice: number }[];
  boxPlotData: BoxPlotData[];
  totalDataPoints: number;
  validPrices: number[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  coefficientOfVariation: number;
  medianPrice: number;
  iqrValue: number;
  skewness: number;
  kurtosis: number;
  confidenceInterval95: { lower: number; upper: number };
  iqrOutliers: IqrOutliers;
  stdDevHistoricalOutliers: { timestamp: number; chain: Blockchain; price: number; deviation: number }[];
  scatterData: any[];
  correlationMatrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>>;
  chainVolatility: Partial<Record<Blockchain, number>>;
  updateDelays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>>;
  dataIntegrity: Partial<Record<Blockchain, number>>;
  priceJumpFrequency: Partial<Record<Blockchain, number>>;
  priceChangePercent: Partial<Record<Blockchain, number>>;
  meanBinIndex: number;
  medianBinIndex: number;
  stdDevBinRange: { lower: number; upper: number } | null;
  chainsWithHighDeviation: PriceDifference[];
  prevStats: { avgPrice: number; maxPrice: number; minPrice: number; priceRange: number; standardDeviationPercent: number } | null;
  sortColumn: string;
  setSortColumn: (column: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
  exportToCSV: () => void;
  exportToJSON: () => void;
}

export function useCrossChainData(): UseCrossChainDataReturn {
  const [selectedProvider, setSelectedProvider] = useState<OracleProvider>(OracleProvider.CHAINLINK);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [currentPrices, setCurrentPrices] = useState<PriceData[]>([]);
  const [historicalPrices, setHistoricalPrices] = useState<Partial<Record<Blockchain, PriceData[]>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBaseChain, setSelectedBaseChain] = useState<Blockchain | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [prevStats, setPrevStats] = useState<{ avgPrice: number; maxPrice: number; minPrice: number; priceRange: number; standardDeviationPercent: number } | null>(null);
  const [visibleChains, setVisibleChains] = useState<Blockchain[]>([]);
  const [showMA, setShowMA] = useState<boolean>(false);
  const [maPeriod, setMaPeriod] = useState<number>(7);
  const [chartKey, setChartKey] = useState<number>(0);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{ xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('chain');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCell, setSelectedCell] = useState<{ xChain: Blockchain; yChain: Blockchain } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [focusedChain, setFocusedChain] = useState<Blockchain | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'abnormal' | 'normal'>('all');
  const [recommendedBaseChain, setRecommendedBaseChain] = useState<Blockchain | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle');
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

  const currentClient = oracleClients[selectedProvider];
  const supportedChains = currentClient.supportedChains;

  const fetchData = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);
    try {
      const currentPromises = supportedChains.map((chain) =>
        currentClient.getPrice(selectedSymbol, chain)
      );
      const currentResults = await Promise.all(currentPromises);
      setCurrentPrices(currentResults);

      const historicalPromises = supportedChains.map((chain) =>
        currentClient.getHistoricalPrices(selectedSymbol, chain, selectedTimeRange)
      );
      const historicalResults = await Promise.all(historicalPromises);
      const historicalMap: Partial<Record<Blockchain, PriceData[]>> = {};
      supportedChains.forEach((chain, index) => {
        historicalMap[chain] = historicalResults[index];
      });
      setHistoricalPrices(historicalMap);

      const validPrices = currentResults.map((d) => d.price).filter((p) => p > 0);
      const newAvgPrice = validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
      const newMaxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
      const newMinPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const newPriceRange = newMaxPrice - newMinPrice;
      const variance = validPrices.length > 1
        ? validPrices.reduce((sum, price) => sum + Math.pow(price - newAvgPrice, 2), 0) / validPrices.length
        : 0;
      const stdDev = Math.sqrt(variance);
      const newStdDevPercent = newAvgPrice > 0 ? (stdDev / newAvgPrice) * 100 : 0;

      setPrevStats({
        avgPrice: newAvgPrice,
        maxPrice: newMaxPrice,
        minPrice: newMinPrice,
        priceRange: newPriceRange,
        standardDeviationPercent: newStdDevPercent,
      });

      if (supportedChains.length > 0) {
        const chainWithMostData = supportedChains.reduce((best, chain) => {
          const bestLen = historicalMap[best]?.length || 0;
          const chainLen = historicalMap[chain]?.length || 0;
          return chainLen > bestLen ? chain : best;
        }, supportedChains[0]);
        setRecommendedBaseChain(chainWithMostData);
      }

      setLastUpdated(new Date());
      setRefreshStatus('success');
      setShowRefreshSuccess(true);
      setTimeout(() => setShowRefreshSuccess(false), 2000);
    } catch (error) {
      console.error('Error fetching data:', error);
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, [currentClient, supportedChains, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    fetchData();
  }, [selectedProvider, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    if (refreshInterval === 0) return;
    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  useEffect(() => {
    if (supportedChains.length > 0 && visibleChains.length === 0) {
      setVisibleChains([...supportedChains]);
    }
  }, [supportedChains, visibleChains.length]);

  useEffect(() => {
    if (supportedChains.length > 0 && !selectedBaseChain) {
      const defaultChain = recommendedBaseChain || supportedChains[0];
      setSelectedBaseChain(defaultChain);
    }
    if (supportedChains.length > 0 && selectedBaseChain && !supportedChains.includes(selectedBaseChain)) {
      const defaultChain = recommendedBaseChain || supportedChains[0];
      setSelectedBaseChain(defaultChain);
    }
  }, [supportedChains, selectedBaseChain, recommendedBaseChain]);

  const toggleChain = useCallback((chain: Blockchain) => {
    setVisibleChains((prev) => {
      if (prev.includes(chain)) {
        return prev.filter((c) => c !== chain);
      }
      return [...prev, chain];
    });
  }, []);

  const filteredChains = useMemo(() => {
    return supportedChains.filter((chain) => visibleChains.includes(chain));
  }, [supportedChains, visibleChains]);

  const chartData = useMemo(() => {
    if (Object.keys(historicalPrices).length === 0) return [];
    const timestamps = new Set<number>();
    filteredChains.forEach((chain) => {
      historicalPrices[chain]?.forEach((price) => timestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (selectedTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (selectedTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    const calculateMA = (prices: (number | undefined)[], period: number, index: number): number | null => {
      if (index < period - 1) return null;
      const slice = prices.slice(index - period + 1, index + 1);
      const validPrices = slice.filter((p): p is number => p !== undefined);
      if (validPrices.length < period) return null;
      return validPrices.reduce((a, b) => a + b, 0) / period;
    };

    const chainPriceArrays: Partial<Record<Blockchain, (number | undefined)[]>> = {};
    filteredChains.forEach((chain) => {
      chainPriceArrays[chain] = sortedTimestamps.map((timestamp) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        return price?.price;
      });
    });

    return sortedTimestamps.map((timestamp, index) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };
      filteredChains.forEach((chain) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        if (price) {
          dataPoint[chain] = price.price;
          const prices = chainPriceArrays[chain] || [];
          const ma7 = calculateMA(prices, 7, index);
          const ma20 = calculateMA(prices, 20, index);
          dataPoint[`${chain}_MA7`] = ma7;
          dataPoint[`${chain}_MA20`] = ma20;
        }
      });
      return dataPoint;
    });
  }, [historicalPrices, filteredChains, selectedTimeRange]);

  const priceDifferences = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2 || !selectedBaseChain) return [];
    const basePriceData = filteredPrices.find((p) => p.chain === selectedBaseChain);
    if (!basePriceData) return [];
    const basePrice = basePriceData.price;
    return filteredPrices.map((priceData) => {
      const diff = priceData.price - basePrice;
      const diffPercent = (diff / basePrice) * 100;
      return {
        chain: priceData.chain!,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const sortedPriceDifferences = useMemo(() => {
    const DEVIATION_THRESHOLD = 0.5;
    let filtered = [...priceDifferences];

    if (tableFilter === 'abnormal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) > DEVIATION_THRESHOLD);
    } else if (tableFilter === 'normal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) <= DEVIATION_THRESHOLD);
    }

    const baseChainItem = filtered.find((item) => item.chain === selectedBaseChain);
    const otherItems = filtered.filter((item) => item.chain !== selectedBaseChain);

    otherItems.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'chain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'diff':
          comparison = a.diff - b.diff;
          break;
        case 'diffPercent':
          comparison = a.diffPercent - b.diffPercent;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    if (baseChainItem) {
      return [baseChainItem, ...otherItems];
    }
    return otherItems;
  }, [priceDifferences, sortColumn, sortDirection, selectedBaseChain, tableFilter]);

  const validPrices = useMemo(() => {
    return currentPrices
      .filter((d) => d.chain && filteredChains.includes(d.chain))
      .map((d) => d.price)
      .filter((p) => p > 0);
  }, [currentPrices, filteredChains]);

  const avgPrice = useMemo(() => {
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  }, [validPrices]);

  const maxPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.max(...validPrices) : 0;
  }, [validPrices]);

  const minPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [validPrices]);

  const priceRange = useMemo(() => {
    return maxPrice - minPrice;
  }, [maxPrice, minPrice]);

  const variance = useMemo(() => {
    return calculateVariance(validPrices, avgPrice);
  }, [validPrices, avgPrice]);

  const standardDeviation = useMemo(() => {
    return calculateStandardDeviation(variance);
  }, [variance]);

  const standardDeviationPercent = useMemo(() => {
    return avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;
  }, [standardDeviation, avgPrice]);

  const coefficientOfVariation = useMemo(() => {
    return avgPrice > 0 ? standardDeviation / avgPrice : 0;
  }, [standardDeviation, avgPrice]);

  const medianPrice = useMemo(() => {
    if (validPrices.length === 0) return 0;
    const sorted = [...validPrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [validPrices]);

  const iqrValue = useMemo(() => {
    if (validPrices.length < 2) return 0;
    const sorted = [...validPrices].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    return q3 - q1;
  }, [validPrices]);

  const skewness = useMemo(() => {
    if (validPrices.length < 3 || standardDeviation === 0) return 0;
    const n = validPrices.length;
    const sumCubedDiff = validPrices.reduce(
      (sum, price) => sum + Math.pow((price - avgPrice) / standardDeviation, 3),
      0
    );
    return (n / ((n - 1) * (n - 2))) * sumCubedDiff;
  }, [validPrices, avgPrice, standardDeviation]);

  const kurtosis = useMemo(() => {
    if (validPrices.length < 4 || standardDeviation === 0) return 0;
    const n = validPrices.length;
    const sumFourthDiff = validPrices.reduce(
      (sum, price) => sum + Math.pow((price - avgPrice) / standardDeviation, 4),
      0
    );
    return (
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourthDiff -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3))
    );
  }, [validPrices, avgPrice, standardDeviation]);

  const confidenceInterval95 = useMemo(() => {
    if (validPrices.length < 2 || standardDeviation === 0) {
      return { lower: avgPrice, upper: avgPrice };
    }
    const n = validPrices.length;
    const standardError = standardDeviation / Math.sqrt(n);
    const marginOfError = 1.96 * standardError;
    return {
      lower: avgPrice - marginOfError,
      upper: avgPrice + marginOfError,
    };
  }, [validPrices, avgPrice, standardDeviation]);

  const chartDataWithMA = useMemo(() => {
    if (!showMA || chartData.length === 0) return chartData;
    const avgPrices = chartData.map((point) => {
      const prices = filteredChains
        .map((chain) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined && !isNaN(p));
      return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    });
    const maValues = calculateSMA(avgPrices, maPeriod);
    return chartData.map((point, index) => ({
      ...point,
      ma: maValues[index],
    }));
  }, [chartData, showMA, maPeriod, filteredChains]);

  const priceChangePercent = useMemo(() => {
    const result: Partial<Record<Blockchain, number>> = {};
    filteredChains.forEach((chain) => {
      const prices = chartData
        .map((point) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined);
      if (prices.length >= 2) {
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        if (firstPrice > 0) {
          result[chain] = ((lastPrice - firstPrice) / firstPrice) * 100;
        }
      }
    });
    return result;
  }, [chartData, filteredChains]);

  const iqrOutliers = useMemo(() => {
    if (validPrices.length < 4) {
      return { outliers: [], q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };
    }

    const sorted = [...validPrices].sort((a, b) => a - b);
    const n = sorted.length;

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers: { chain: Blockchain; price: number; deviationPercent: number; boundType: 'lower' | 'upper'; expectedRange: string }[] = [];

    currentPrices.forEach((priceData) => {
      if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;
      if (priceData.price < lowerBound || priceData.price > upperBound) {
        const boundType = priceData.price < lowerBound ? 'lower' : 'upper';
        const boundValue = boundType === 'lower' ? lowerBound : upperBound;
        const deviationPercent = Math.abs((priceData.price - boundValue) / boundValue) * 100;

        outliers.push({
          chain: priceData.chain,
          price: priceData.price,
          deviationPercent,
          boundType,
          expectedRange: `$${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}`,
        });
      }
    });

    return { outliers, q1, q3, iqr, lowerBound, upperBound };
  }, [validPrices, currentPrices, filteredChains]);

  const stdDevHistoricalOutliers = useMemo(() => {
    const result: { timestamp: number; chain: Blockchain; price: number; deviation: number }[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) return;

      const priceValues = prices.map((p) => p.price);
      const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
      const variance = priceValues.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceValues.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) return;

      const lowerBound = mean - 2 * stdDev;
      const upperBound = mean + 2 * stdDev;

      prices.forEach((priceData) => {
        if (priceData.price < lowerBound || priceData.price > upperBound) {
          const deviation = Math.abs(priceData.price - mean) / stdDev;
          result.push({
            timestamp: priceData.timestamp,
            chain,
            price: priceData.price,
            deviation,
          });
        }
      });
    });

    return result;
  }, [historicalPrices, filteredChains]);

  const scatterData = useMemo(() => {
    return stdDevHistoricalOutliers
      .map((outlier) => {
        const dataPoint = chartData.find((d) => d.timestamp === outlier.timestamp);
        return {
          ...dataPoint,
          outlierChain: outlier.chain,
          outlierPrice: outlier.price,
          deviation: outlier.deviation,
        };
      })
      .filter((d) => d.timestamp);
  }, [stdDevHistoricalOutliers, chartData]);

  const correlationMatrix = useMemo(() => {
    const matrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>> = {};

    filteredChains.forEach((chainX) => {
      matrix[chainX] = {};
      filteredChains.forEach((chainY) => {
        const pricesX = historicalPrices[chainX]?.map((p) => p.price) || [];
        const pricesY = historicalPrices[chainY]?.map((p) => p.price) || [];

        if (chainX === chainY) {
          matrix[chainX]![chainY] = 1;
        } else {
          const correlation = calculatePearsonCorrelation(pricesX, pricesY);
          matrix[chainX]![chainY] = isNaN(correlation) ? 0 : correlation;
        }
      });
    });

    return matrix;
  }, [historicalPrices, filteredChains]);

  const chainVolatility = useMemo(() => {
    const volatility: Partial<Record<Blockchain, number>> = {};
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      if (prices.length < 2) {
        volatility[chain] = 0;
        return;
      }
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      volatility[chain] = mean > 0 ? (stdDev / mean) * 100 : 0;
    });
    return volatility;
  }, [historicalPrices, filteredChains]);

  const updateDelays = useMemo(() => {
    if (filteredChains.length === 0) return {};
    const baseChain = filteredChains[0];
    const delays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>> = {};

    const basePrices = historicalPrices[baseChain] || [];
    if (basePrices.length === 0) return delays;

    filteredChains.forEach((chain) => {
      if (chain === baseChain) {
        delays[chain] = { avgDelay: 0, maxDelay: 0 };
        return;
      }

      const chainPrices = historicalPrices[chain] || [];
      if (chainPrices.length === 0) return;

      const matchedDelays: number[] = [];
      basePrices.forEach((basePrice) => {
        let closestChainPrice: PriceData | null = null;
        let minDiff = Infinity;

        chainPrices.forEach((chainPrice) => {
          const diff = Math.abs(chainPrice.timestamp - basePrice.timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestChainPrice = chainPrice;
          }
        });

        if (closestChainPrice) {
          matchedDelays.push(Math.abs((closestChainPrice as PriceData).timestamp - basePrice.timestamp) / 1000);
        }
      });

      if (matchedDelays.length > 0) {
        const avgDelay = matchedDelays.reduce((a, b) => a + b, 0) / matchedDelays.length;
        const maxDelay = Math.max(...matchedDelays);
        delays[chain] = { avgDelay, maxDelay };
      }
    });

    return delays;
  }, [historicalPrices, filteredChains]);

  const dataIntegrity = useMemo(() => {
    const integrity: Partial<Record<Blockchain, number>> = {};
    const updateIntervalMinutes = 1;
    const expectedPointsPerHour = 60 / updateIntervalMinutes;
    const expectedPoints = expectedPointsPerHour * selectedTimeRange;

    filteredChains.forEach((chain) => {
      const actualPoints = historicalPrices[chain]?.length || 0;
      const score = expectedPoints > 0 ? (actualPoints / expectedPoints) * 100 : 0;
      integrity[chain] = Math.min(score, 100);
    });

    return integrity;
  }, [historicalPrices, filteredChains, selectedTimeRange]);

  const priceJumpFrequency = useMemo(() => {
    const frequency: Partial<Record<Blockchain, number>> = {};

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) {
        frequency[chain] = 0;
        return;
      }

      const changes: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const prevPrice = prices[i - 1].price;
        const currPrice = prices[i].price;
        if (prevPrice > 0) {
          const changePercent = Math.abs((currPrice - prevPrice) / prevPrice) * 100;
          changes.push(changePercent);
        }
      }

      if (changes.length === 0) {
        frequency[chain] = 0;
        return;
      }

      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
      const threshold = avgChange * 2;
      const jumpCount = changes.filter((change) => change > threshold).length;
      frequency[chain] = jumpCount;
    });

    return frequency;
  }, [historicalPrices, filteredChains]);

  const heatmapData = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2) return [];
    const data: HeatmapData[] = [];

    filteredChains.forEach((xChain) => {
      filteredChains.forEach((yChain) => {
        const xPrice = filteredPrices.find((p) => p.chain === xChain)?.price || 0;
        const yPrice = filteredPrices.find((p) => p.chain === yChain)?.price || 0;
        const diff = Math.abs(xPrice - yPrice);
        const percent = xPrice > 0 ? (diff / xPrice) * 100 : 0;

        data.push({
          x: chainNames[xChain],
          y: chainNames[yChain],
          value: diff,
          percent,
          xChain,
          yChain,
        });
      });
    });

    return data;
  }, [currentPrices, filteredChains]);

  const maxHeatmapValue = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    return Math.max(...heatmapData.map((d) => d.percent));
  }, [heatmapData]);

  const priceDistributionData = useMemo(() => {
    if (validPrices.length === 0) return [];

    const numBins = Math.min(10, Math.max(5, validPrices.length));
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const range = max - min;
    const binWidth = range > 0 ? range / numBins : 1;

    const bins: { range: string; count: number; minPrice: number; maxPrice: number; midPrice: number }[] = [];

    for (let i = 0; i < numBins; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      const rangeLabel = `$${binMin.toFixed(2)}-$${binMax.toFixed(2)}`;
      bins.push({
        range: rangeLabel,
        count: 0,
        minPrice: binMin,
        maxPrice: binMax,
        midPrice: (binMin + binMax) / 2,
      });
    }

    validPrices.forEach((price) => {
      for (let i = 0; i < bins.length; i++) {
        if (price >= bins[i].minPrice && (price < bins[i].maxPrice || (i === bins.length - 1 && price <= bins[i].maxPrice))) {
          bins[i].count++;
          break;
        }
      }
    });

    return bins.map((bin) => ({
      range: bin.range,
      count: bin.count,
      midPrice: bin.midPrice,
    }));
  }, [validPrices]);

  const meanBinIndex = useMemo(() => {
    if (priceDistributionData.length === 0 || avgPrice === 0) return -1;
    for (let i = 0; i < priceDistributionData.length; i++) {
      const binMin = i === 0 ? 0 : priceDistributionData[i - 1].midPrice;
      const binMax = priceDistributionData[i].midPrice;
      if (avgPrice >= binMin && avgPrice <= binMax) {
        return i;
      }
    }
    return -1;
  }, [priceDistributionData, avgPrice]);

  const medianBinIndex = useMemo(() => {
    if (priceDistributionData.length === 0 || medianPrice === 0) return -1;
    for (let i = 0; i < priceDistributionData.length; i++) {
      const binMin = i === 0 ? 0 : priceDistributionData[i - 1].midPrice;
      const binMax = priceDistributionData[i].midPrice;
      if (medianPrice >= binMin && medianPrice <= binMax) {
        return i;
      }
    }
    return -1;
  }, [priceDistributionData, medianPrice]);

  const stdDevBinRange = useMemo(() => {
    if (priceDistributionData.length === 0 || standardDeviation === 0) return null;
    const lower = avgPrice - standardDeviation;
    const upper = avgPrice + standardDeviation;
    return { lower, upper };
  }, [priceDistributionData, avgPrice, standardDeviation]);

  const boxPlotData = useMemo(() => {
    const result: BoxPlotData[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      if (prices.length < 4) return;

      const sorted = [...prices].sort((a, b) => a - b);
      const n = sorted.length;

      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const nonOutliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
      const outliers = sorted.filter((p) => p < lowerBound || p > upperBound);

      result.push({
        chain,
        chainName: chainNames[chain],
        color: chainColors[chain],
        min: nonOutliers.length > 0 ? Math.min(...nonOutliers) : sorted[0],
        q1,
        median: sorted[Math.floor(n / 2)],
        q3,
        max: nonOutliers.length > 0 ? Math.max(...nonOutliers) : sorted[n - 1],
        outliers,
        iqr,
        lowerWhisker: lowerBound,
        upperWhisker: upperBound,
      });
    });

    return result;
  }, [historicalPrices, filteredChains]);

  const totalDataPoints = useMemo(() => {
    let count = 0;
    filteredChains.forEach((chain) => {
      count += historicalPrices[chain]?.length || 0;
    });
    return count;
  }, [historicalPrices, filteredChains]);

  const chainsWithHighDeviation = useMemo(() => {
    const DEVIATION_THRESHOLD = 0.5;
    return priceDifferences.filter((item) => Math.abs(item.diffPercent) > DEVIATION_THRESHOLD);
  }, [priceDifferences]);

  const exportToCSV = useCallback(() => {
    const csvLines: string[] = [];
    const t = (key: string) => key;

    csvLines.push('=== Current Prices ===');
    csvLines.push(['Blockchain', 'Price', 'Difference', 'PercentDifference'].join(','));

    priceDifferences.forEach((item) => {
      const row = [
        chainNames[item.chain],
        item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        item.diff.toFixed(4),
        item.diffPercent.toFixed(4) + '%',
      ];
      csvLines.push(row.join(','));
    });

    csvLines.push('');
    csvLines.push('=== Historical Prices ===');

    const allTimestamps = new Set<number>();
    filteredChains.forEach((chain) => {
      historicalPrices[chain]?.forEach((price) => allTimestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const historicalHeaders = ['timestamp', ...filteredChains.map((chain) => chainNames[chain])];
    csvLines.push(historicalHeaders.join(','));

    sortedTimestamps.forEach((timestamp) => {
      const row: string[] = [new Date(timestamp).toLocaleString()];
      filteredChains.forEach((chain) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        row.push(price ? price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '');
      });
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cross-chain-${selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [priceDifferences, historicalPrices, filteredChains, selectedSymbol]);

  const exportToJSON = useCallback(() => {
    const providerNames: Record<OracleProvider, string> = {
      [OracleProvider.CHAINLINK]: 'Chainlink',
      [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
      [OracleProvider.UMA]: 'UMA',
      [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
      [OracleProvider.API3]: 'API3',
    };

    const getConsistencyRating = (stdDevPercent: number): string => {
      if (stdDevPercent < 0.1) return 'excellent';
      if (stdDevPercent < 0.3) return 'good';
      if (stdDevPercent < 0.5) return 'fair';
      return 'poor';
    };

    const exportData = {
      metadata: {
        symbol: selectedSymbol,
        oracleProvider: providerNames[selectedProvider],
        exportTimestamp: new Date().toISOString(),
        baseChain: selectedBaseChain ? chainNames[selectedBaseChain] : null,
      },
      currentPrices: priceDifferences.map((item) => ({
        blockchain: chainNames[item.chain],
        price: item.price,
        difference: item.diff,
        percentDifference: item.diffPercent,
      })),
      historicalPrices: filteredChains.map((chain) => ({
        blockchain: chainNames[chain],
        prices: historicalPrices[chain]?.map((price) => ({
          price: price.price,
          timestamp: new Date(price.timestamp).toISOString(),
          source: price.source,
        })) || [],
      })),
      summary: {
        averagePrice: avgPrice,
        highestPrice: maxPrice,
        lowestPrice: minPrice,
        priceRange: priceRange,
        standardDeviationPercent: standardDeviationPercent,
        consistencyRating: getConsistencyRating(standardDeviationPercent),
        dataPoints: totalDataPoints,
      },
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cross-chain-${selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [selectedProvider, selectedSymbol, selectedBaseChain, priceDifferences, historicalPrices, filteredChains, avgPrice, maxPrice, minPrice, priceRange, standardDeviationPercent, totalDataPoints]);

  return {
    selectedProvider,
    setSelectedProvider,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    selectedBaseChain,
    setSelectedBaseChain,
    visibleChains,
    setVisibleChains,
    showMA,
    setShowMA,
    maPeriod,
    setMaPeriod,
    chartKey,
    setChartKey,
    hiddenLines,
    setHiddenLines,
    focusedChain,
    setFocusedChain,
    tableFilter,
    setTableFilter,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    refreshInterval,
    setRefreshInterval,
    lastUpdated,
    currentPrices,
    historicalPrices,
    loading,
    refreshStatus,
    showRefreshSuccess,
    recommendedBaseChain,
    supportedChains,
    currentClient,
    fetchData,
    filteredChains,
    priceDifferences,
    sortedPriceDifferences,
    chartData,
    chartDataWithMA,
    heatmapData,
    maxHeatmapValue,
    priceDistributionData,
    boxPlotData,
    totalDataPoints,
    validPrices,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    coefficientOfVariation,
    medianPrice,
    iqrValue,
    skewness,
    kurtosis,
    confidenceInterval95,
    iqrOutliers,
    stdDevHistoricalOutliers,
    scatterData,
    correlationMatrix,
    chainVolatility,
    updateDelays,
    dataIntegrity,
    priceJumpFrequency,
    priceChangePercent,
    meanBinIndex,
    medianBinIndex,
    stdDevBinRange,
    chainsWithHighDeviation,
    prevStats,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    toggleChain,
    handleSort,
    exportToCSV,
    exportToJSON,
  };
}
