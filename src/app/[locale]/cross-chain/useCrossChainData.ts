'use client';

import { useEffect, useCallback, useMemo, useState, useRef } from 'react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import {
  OracleProvider,
  type Blockchain,
  type PriceData,
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellorClient,
  ChronicleClient,
  WINkLinkClient,
  type BaseOracleClient,
} from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { isBlockchain, safeBlockchainCast } from '@/lib/utils/chainUtils';
import { useUser } from '@/stores/authStore';
import { useCrossChainStore } from '@/stores/crossChainStore';
import { useToastMethods } from '@/components/ui/Toast';

import {
  type HeatmapData,
  type PriceDifference,
  type BoxPlotData,
  type ChartDataPoint,
  type IqrOutliers,
  type RefreshInterval,
} from './constants';
import {
  chainNames,
  chainColors,
  calculateVariance,
  calculateStandardDeviation,
  calculatePercentile,
  calculatePearsonCorrelation,
  calculatePearsonCorrelationWithSignificance,
  calculatePearsonCorrelationByTimestamp,
  calculatePearsonCorrelationWithSignificanceByTimestamp,
  calculateSMA,
  calculateDynamicThreshold,
  detectPriceJumps,
  defaultThresholdConfig,
  detectOutliersIQR,
  detectOutliersZScore,
  getTCriticalValue,
  type CorrelationResult,
  type TimestampedPrice,
} from './utils';

const logger = createLogger('useCrossChainData');

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface AnomalousPricePoint {
  chain: Blockchain;
  price: number;
  timestamp: number;
  reason: 'iqr_outlier' | 'std_dev_outlier';
  deviation: number;
}

const BITCOIN_GENESIS_TIMESTAMP = new Date('2009-01-03').getTime();

function validatePriceData(price: number, timestamp: number, chain: Blockchain): ValidationResult {
  const errors: string[] = [];

  if (typeof price !== 'number' || isNaN(price)) {
    errors.push(`[${chain}] 价格不是有效数字: ${price}`);
  }

  if (price === Infinity || price === -Infinity) {
    errors.push(`[${chain}] 价格为 Infinity`);
  }

  if (price < 0) {
    errors.push(`[${chain}] 价格为负数: ${price}`);
  }

  const now = Date.now();
  const oneHourInMs = 60 * 60 * 1000;

  if (timestamp < BITCOIN_GENESIS_TIMESTAMP) {
    errors.push(
      `[${chain}] 时间戳早于比特币创世时间: ${new Date(timestamp).toISOString()}`
    );
  }

  if (timestamp > now + oneHourInMs) {
    errors.push(
      `[${chain}] 时间戳晚于当前时间+1小时: ${new Date(timestamp).toISOString()}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function detectAnomalousPrices(
  prices: PriceData[],
  filteredChains: Blockchain[]
): AnomalousPricePoint[] {
  const anomalies: AnomalousPricePoint[] = [];
  const validPrices = prices
    .filter((p) => p.chain && filteredChains.includes(p.chain))
    .map((p) => p.price)
    .filter((p) => p > 0 && !isNaN(p) && isFinite(p));

  if (validPrices.length < 4) return anomalies;

  const sorted = [...validPrices].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const mean = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const variance =
    validPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / validPrices.length;
  const stdDev = Math.sqrt(variance);

  prices.forEach((priceData) => {
    if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;

    const { price, timestamp, chain } = priceData;

    if (price < lowerBound || price > upperBound) {
      const deviation = Math.abs(price - (price < lowerBound ? q1 : q3)) / iqr;
      anomalies.push({
        chain,
        price,
        timestamp,
        reason: 'iqr_outlier',
        deviation,
      });
    }

    if (stdDev > 0) {
      const zScore = Math.abs((price - mean) / stdDev);
      if (zScore > 3) {
        const existingAnomaly = anomalies.find(
          (a) => a.chain === chain && a.timestamp === timestamp
        );
        if (!existingAnomaly) {
          anomalies.push({
            chain,
            price,
            timestamp,
            reason: 'std_dev_outlier',
            deviation: zScore,
          });
        }
      }
    }
  });

  return anomalies;
}

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
  [OracleProvider.REDSTONE]: new RedStoneClient(),
  [OracleProvider.DIA]: new DIAClient(),
  [OracleProvider.TELLOR]: new TellorClient(),
  [OracleProvider.CHRONICLE]: new ChronicleClient(),
  [OracleProvider.WINKLINK]: new WINkLinkClient(),
};

const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

interface CacheEntry {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  timestamp: number;
}

const dataCache = new Map<string, CacheEntry>();

const getCacheKey = (provider: OracleProvider, symbol: string, timeRange: number): string => {
  return `${provider}-${symbol}-${timeRange}`;
};

const clearCache = () => {
  dataCache.clear();
};

const clearCacheForProvider = (provider: OracleProvider) => {
  const keysToDelete: string[] = [];
  dataCache.forEach((_, key) => {
    if (key.startsWith(`${provider}-`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => dataCache.delete(key));
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
  setHoveredCell: (
    cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null
  ) => void;
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
  currentClient: BaseOracleClient;
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
  confidenceInterval95: {
    lower: number;
    upper: number;
    distributionType: 't' | 'z';
    criticalValue: number;
  };
  iqrOutliers: IqrOutliers;
  stdDevHistoricalOutliers: {
    timestamp: number;
    chain: Blockchain;
    price: number;
    deviation: number;
  }[];
  scatterData: Array<
    Partial<ChartDataPoint> & {
      outlierChain: Blockchain;
      outlierPrice: number;
      deviation: number;
      timestamp: number;
    }
  >;
  correlationMatrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>>;
  correlationMatrixWithSignificance: Partial<
    Record<Blockchain, Partial<Record<Blockchain, CorrelationResult>>>
  >;
  chainVolatility: Partial<Record<Blockchain, number>>;
  updateDelays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>>;
  dataIntegrity: Partial<Record<Blockchain, number>>;
  actualUpdateIntervals: Partial<Record<Blockchain, number>>;
  priceJumpFrequency: Partial<Record<Blockchain, number>>;
  priceChangePercent: Partial<Record<Blockchain, number>>;
  meanBinIndex: number;
  medianBinIndex: number;
  stdDevBinRange: { lower: number; upper: number } | null;
  chainsWithHighDeviation: PriceDifference[];
  prevStats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null;
  sortColumn: string;
  setSortColumn: (column: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
  exportToCSV: () => boolean;
  exportToJSON: () => boolean;
  // Favorites
  user: ReturnType<typeof useUser>;
  chainFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useCrossChainData(): UseCrossChainDataReturn {
  const user = useUser();
  const toast = useToastMethods();
  const { favorites: chainFavorites } = useFavorites({ configType: 'chain_config' });
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const {
    selectedProvider,
    selectedSymbol,
    selectedTimeRange,
    selectedBaseChain,
    visibleChains,
    showMA,
    maPeriod,
    chartKey,
    hiddenLines,
    focusedChain,
    tableFilter,
    hoveredCell,
    selectedCell,
    tooltipPosition,
    refreshInterval,
    lastUpdated,
    currentPrices,
    historicalPrices,
    loading,
    refreshStatus,
    showRefreshSuccess,
    recommendedBaseChain,
    prevStats,
    sortColumn,
    sortDirection,
    setSelectedProvider,
    setSelectedSymbol,
    setSelectedTimeRange,
    setSelectedBaseChain,
    setVisibleChains,
    setShowMA,
    setMaPeriod,
    setChartKey,
    setHiddenLines,
    setFocusedChain,
    setTableFilter,
    setHoveredCell,
    setSelectedCell,
    setTooltipPosition,
    setRefreshInterval,
    setCurrentPrices,
    setHistoricalPrices,
    setLoading,
    setRefreshStatus,
    setShowRefreshSuccess,
    setLastUpdated,
    setPrevStats,
    setRecommendedBaseChain,
    setSortColumn,
    setSortDirection,
    toggleChain,
    handleSort,
  } = useCrossChainStore();

  const currentClient = oracleClients[selectedProvider];
  const supportedChains = currentClient.supportedChains;

  const fetchData = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);
    try {
      const cacheKey = getCacheKey(selectedProvider, selectedSymbol, selectedTimeRange);
      const cachedEntry = dataCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedEntry && now - cachedEntry.timestamp < CACHE_EXPIRATION_MS) {
        setCurrentPrices(cachedEntry.currentPrices);
        setHistoricalPrices(cachedEntry.historicalPrices);
        
        const validPrices = cachedEntry.currentPrices.map((d) => d.price).filter((p) => p > 0);
        const newAvgPrice =
          validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
        const newMaxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
        const newMinPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
        const newPriceRange = newMaxPrice - newMinPrice;
        const variance =
          validPrices.length > 1
            ? validPrices.reduce((sum, price) => sum + Math.pow(price - newAvgPrice, 2), 0) /
              validPrices.length
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
            const bestLen = cachedEntry.historicalPrices[best]?.length || 0;
            const chainLen = cachedEntry.historicalPrices[chain]?.length || 0;
            return chainLen > bestLen ? chain : best;
          }, supportedChains[0]);
          setRecommendedBaseChain(chainWithMostData);
        }

        setLastUpdated(new Date());
        setRefreshStatus('success');
        setShowRefreshSuccess(true);
        setTimeout(() => setShowRefreshSuccess(false), 2000);
        setLoading(false);
        return;
      }

      const currentPromises = supportedChains.map((chain) =>
        currentClient.getPrice(selectedSymbol, chain)
      );
      const currentResults = await Promise.all(currentPromises);

      const validatedCurrentResults = currentResults.filter((priceData) => {
        if (!priceData.chain) return false;
        const validation = validatePriceData(priceData.price, priceData.timestamp, priceData.chain);
        if (!validation.isValid) {
          validation.errors.forEach((error) =>
            logger.warn('价格数据验证失败', { error, chain: priceData.chain })
          );
          return false;
        }
        return true;
      });

      setCurrentPrices(validatedCurrentResults);

      const historicalPromises = supportedChains.map((chain) =>
        currentClient.getHistoricalPrices(selectedSymbol, chain, selectedTimeRange)
      );
      const historicalResults = await Promise.all(historicalPromises);
      const historicalMap: Partial<Record<Blockchain, PriceData[]>> = {};

      supportedChains.forEach((chain, index) => {
        const rawPrices = historicalResults[index] || [];
        const validatedPrices = rawPrices.filter((priceData) => {
          const validation = validatePriceData(priceData.price, priceData.timestamp, chain);
          if (!validation.isValid) {
            validation.errors.forEach((error) =>
              logger.warn('历史价格数据验证失败', { error, chain })
            );
            return false;
          }
          return true;
        });
        historicalMap[chain] = validatedPrices;
      });

      setHistoricalPrices(historicalMap);

      const anomalies = detectAnomalousPrices(validatedCurrentResults, supportedChains);
      if (anomalies.length > 0) {
        logger.info(`检测到 ${anomalies.length} 个异常价格点`, {
          anomalies: anomalies.map((a) => ({
            chain: a.chain,
            price: a.price,
            reason: a.reason,
            deviation: a.deviation.toFixed(2),
          })),
        });
      }

      dataCache.set(cacheKey, {
        currentPrices: validatedCurrentResults,
        historicalPrices: historicalMap,
        timestamp: now,
      });

      const validPrices = validatedCurrentResults.map((d) => d.price).filter((p) => p > 0);
      const newAvgPrice =
        validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
      const newMaxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
      const newMinPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const newPriceRange = newMaxPrice - newMinPrice;
      const variance =
        validPrices.length > 1
          ? validPrices.reduce((sum, price) => sum + Math.pow(price - newAvgPrice, 2), 0) /
            validPrices.length
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
      logger.error(
        'Error fetching data',
        error instanceof Error ? error : new Error(String(error))
      );
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, [currentClient, supportedChains, selectedSymbol, selectedTimeRange, selectedProvider]);

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
    if (
      supportedChains.length > 0 &&
      selectedBaseChain &&
      !supportedChains.includes(selectedBaseChain)
    ) {
      const defaultChain = recommendedBaseChain || supportedChains[0];
      setSelectedBaseChain(defaultChain);
    }
  }, [supportedChains, selectedBaseChain, recommendedBaseChain]);

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

    const calculateMA = (
      prices: (number | undefined)[],
      period: number,
      index: number
    ): number | null => {
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
      const diffPercent = basePrice > 0 && priceData.price > 0 ? (diff / basePrice) * 100 : 0;
      return {
        chain: priceData.chain!,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const sortedPriceDifferences = useMemo(() => {
    const thresholdConfig = useCrossChainStore.getState().thresholdConfig;

    // Calculate dynamic threshold based on all historical prices
    const allHistoricalPrices: number[] = [];
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      allHistoricalPrices.push(...prices);
    });

    const dynamicThreshold = calculateDynamicThreshold(allHistoricalPrices, thresholdConfig);

    const DEVIATION_THRESHOLD = dynamicThreshold;
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
  }, [
    priceDifferences,
    sortColumn,
    sortDirection,
    selectedBaseChain,
    tableFilter,
    historicalPrices,
    filteredChains,
  ]);

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
      return {
        lower: avgPrice,
        upper: avgPrice,
        distributionType: 'z' as const,
        criticalValue: 1.96,
      };
    }
    const n = validPrices.length;
    const standardError = standardDeviation / Math.sqrt(n);
    
    let criticalValue: number;
    let distributionType: 't' | 'z';
    
    if (n < 30) {
      const df = n - 1;
      criticalValue = getTCriticalValue(df, 0.95);
      distributionType = 't';
    } else {
      criticalValue = 1.96;
      distributionType = 'z';
    }
    
    const marginOfError = criticalValue * standardError;
    return {
      lower: avgPrice - marginOfError,
      upper: avgPrice + marginOfError,
      distributionType,
      criticalValue,
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
    const thresholdConfig = useCrossChainStore.getState().thresholdConfig;
    
    if (validPrices.length < 4) {
      return { outliers: [], q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };
    }

    const multiplier = thresholdConfig.outlierDetectionMethod === 'iqr' 
      ? thresholdConfig.outlierThreshold 
      : 1.5;

    const sorted = [...validPrices].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const outliers: {
      chain: Blockchain;
      price: number;
      deviationPercent: number;
      boundType: 'lower' | 'upper';
      expectedRange: string;
    }[] = [];

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
    const thresholdConfig = useCrossChainStore.getState().thresholdConfig;
    const result: { timestamp: number; chain: Blockchain; price: number; deviation: number }[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) return;

      const priceValues = prices.map((p) => p.price);

      if (thresholdConfig.outlierDetectionMethod === 'iqr') {
        const iqrResult = detectOutliersIQR(priceValues, thresholdConfig.outlierThreshold);
        
        prices.forEach((priceData) => {
          if (priceData.price < iqrResult.lowerBound || priceData.price > iqrResult.upperBound) {
            const deviation = Math.abs(priceData.price - iqrResult.q3) / iqrResult.iqr;
            result.push({
              timestamp: priceData.timestamp,
              chain,
              price: priceData.price,
              deviation,
            });
          }
        });
      } else {
        const zscoreResult = detectOutliersZScore(priceValues, thresholdConfig.outlierThreshold);
        
        prices.forEach((priceData) => {
          const zScore = (priceData.price - zscoreResult.mean) / zscoreResult.stdDev;
          if (Math.abs(zScore) > thresholdConfig.outlierThreshold) {
            result.push({
              timestamp: priceData.timestamp,
              chain,
              price: priceData.price,
              deviation: Math.abs(zScore),
            });
          }
        });
      }
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
          timestamp: outlier.timestamp,
        };
      })
      .filter((d) => d.timestamp);
  }, [stdDevHistoricalOutliers, chartData]);

  const correlationMatrix = useMemo(() => {
    const matrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>> = {};

    filteredChains.forEach((chainX) => {
      matrix[chainX] = {};
      filteredChains.forEach((chainY) => {
        const dataX: TimestampedPrice[] =
          historicalPrices[chainX]?.map((p) => ({ timestamp: p.timestamp, price: p.price })) || [];
        const dataY: TimestampedPrice[] =
          historicalPrices[chainY]?.map((p) => ({ timestamp: p.timestamp, price: p.price })) || [];

        if (chainX === chainY) {
          matrix[chainX]![chainY] = 1;
        } else {
          const correlation = calculatePearsonCorrelationByTimestamp(dataX, dataY);
          matrix[chainX]![chainY] = isNaN(correlation) ? 0 : correlation;
        }
      });
    });

    return matrix;
  }, [historicalPrices, filteredChains]);

  const correlationMatrixWithSignificance = useMemo(() => {
    const matrix: Partial<Record<Blockchain, Partial<Record<Blockchain, CorrelationResult>>>> = {};

    filteredChains.forEach((chainX) => {
      matrix[chainX] = {};
      filteredChains.forEach((chainY) => {
        const dataX: TimestampedPrice[] =
          historicalPrices[chainX]?.map((p) => ({ timestamp: p.timestamp, price: p.price })) || [];
        const dataY: TimestampedPrice[] =
          historicalPrices[chainY]?.map((p) => ({ timestamp: p.timestamp, price: p.price })) || [];

        if (chainX === chainY) {
          matrix[chainX]![chainY] = {
            correlation: 1,
            pValue: 0,
            sampleSize: dataX.length,
            isSignificant: true,
            significanceLevel: '***',
          };
        } else {
          const result = calculatePearsonCorrelationWithSignificanceByTimestamp(dataX, dataY);
          matrix[chainX]![chainY] = result;
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
      const variance =
        prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
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
          matchedDelays.push(
            Math.abs((closestChainPrice as PriceData).timestamp - basePrice.timestamp) / 1000
          );
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
    const defaultUpdateIntervalMinutes = currentClient.defaultUpdateIntervalMinutes;

    const calculateActualUpdateInterval = (prices: PriceData[]): number => {
      if (prices.length < 2) return defaultUpdateIntervalMinutes;
      const intervals: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const diffMs = prices[i].timestamp - prices[i - 1].timestamp;
        const diffMinutes = diffMs / (1000 * 60);
        if (diffMinutes > 0) {
          intervals.push(diffMinutes);
        }
      }
      if (intervals.length === 0) return defaultUpdateIntervalMinutes;
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      return avgInterval;
    };

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      const actualPoints = prices.length;

      const configuredInterval = currentClient.chainUpdateIntervals[chain];
      const actualInterval = calculateActualUpdateInterval(prices);
      const updateIntervalMinutes = configuredInterval ?? actualInterval;

      const expectedPointsPerHour = 60 / updateIntervalMinutes;
      const expectedPoints = expectedPointsPerHour * selectedTimeRange;

      const score = expectedPoints > 0 ? (actualPoints / expectedPoints) * 100 : 0;
      integrity[chain] = Math.min(score, 100);
    });

    return integrity;
  }, [historicalPrices, filteredChains, selectedTimeRange, currentClient]);

  const actualUpdateIntervals = useMemo(() => {
    const intervals: Partial<Record<Blockchain, number>> = {};
    const defaultInterval = currentClient.defaultUpdateIntervalMinutes;

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) {
        intervals[chain] = currentClient.chainUpdateIntervals[chain] ?? defaultInterval;
        return;
      }

      const intervalDiffs: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const diffMs = prices[i].timestamp - prices[i - 1].timestamp;
        const diffMinutes = diffMs / (1000 * 60);
        if (diffMinutes > 0) {
          intervalDiffs.push(diffMinutes);
        }
      }

      if (intervalDiffs.length === 0) {
        intervals[chain] = currentClient.chainUpdateIntervals[chain] ?? defaultInterval;
        return;
      }

      const avgInterval = intervalDiffs.reduce((a, b) => a + b, 0) / intervalDiffs.length;
      intervals[chain] = Math.round(avgInterval * 100) / 100;
    });

    return intervals;
  }, [historicalPrices, filteredChains, currentClient]);

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

      const jumpCount = detectPriceJumps(
        changes,
        defaultThresholdConfig.priceJumpMethod,
        defaultThresholdConfig.priceJumpThreshold,
      );
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
        const percent = xPrice > 0 && yPrice > 0 ? (diff / xPrice) * 100 : 0;

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

    const bins: {
      range: string;
      count: number;
      minPrice: number;
      maxPrice: number;
      midPrice: number;
    }[] = [];

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
        if (
          price >= bins[i].minPrice &&
          (price < bins[i].maxPrice || (i === bins.length - 1 && price <= bins[i].maxPrice))
        ) {
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
    const thresholdConfig = useCrossChainStore.getState().thresholdConfig;

    // Calculate dynamic threshold based on all historical prices
    const allHistoricalPrices: number[] = [];
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      allHistoricalPrices.push(...prices);
    });

    const dynamicThreshold = calculateDynamicThreshold(allHistoricalPrices, thresholdConfig);

    return priceDifferences.filter((item) => Math.abs(item.diffPercent) > dynamicThreshold);
  }, [priceDifferences, historicalPrices, filteredChains]);

  const exportToCSV = useCallback((): boolean => {
    if (priceDifferences.length === 0 && Object.keys(historicalPrices).length === 0) {
      toast.warning('No Data', 'No data available to export');
      return false;
    }

    try {
      const csvLines: string[] = [];

      csvLines.push('=== Current Prices ===');
      csvLines.push(['Blockchain', 'Price', 'Difference', 'PercentDifference'].join(','));

      priceDifferences.forEach((item) => {
        const row = [
          chainNames[item.chain],
          item.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }),
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
          row.push(
            price
              ? price.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })
              : ''
          );
        });
        csvLines.push(row.join(','));
      });

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `cross-chain-${selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export Successful', 'CSV file has been downloaded');
      return true;
    } catch (error) {
      logger.error('Failed to export CSV:', error as Error);
      toast.error('Export Failed', 'Failed to export CSV file. Please try again.');
      return false;
    }
  }, [priceDifferences, historicalPrices, filteredChains, selectedSymbol, toast]);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      chain: selectedProvider,
      symbol: selectedSymbol,
      chains: visibleChains.map((c) => c as string),
    }),
    [selectedProvider, selectedSymbol, visibleChains]
  );

  const handleApplyFavorite = useCallback((config: FavoriteConfig) => {
    if (config.chain) {
      setSelectedProvider(config.chain as OracleProvider);
    }
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    if (config.chains) {
      const validChains = config.chains.filter(isBlockchain);
      setVisibleChains(validChains);
    }
    setShowFavoritesDropdown(false);
  }, []);

  const exportToJSON = useCallback((): boolean => {
    if (priceDifferences.length === 0 && Object.keys(historicalPrices).length === 0) {
      toast.warning('No Data', 'No data available to export');
      return false;
    }

    try {
      const providerNames: Record<OracleProvider, string> = {
        [OracleProvider.CHAINLINK]: 'Chainlink',
        [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
        [OracleProvider.UMA]: 'UMA',
        [OracleProvider.PYTH]: 'Pyth Network',
        [OracleProvider.API3]: 'API3',
        [OracleProvider.REDSTONE]: 'RedStone',
        [OracleProvider.DIA]: 'DIA',
        [OracleProvider.TELLOR]: 'Tellor',
        [OracleProvider.CHRONICLE]: 'Chronicle',
        [OracleProvider.WINKLINK]: 'WINkLink',
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
          prices:
            historicalPrices[chain]?.map((price) => ({
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
      link.setAttribute(
        'download',
        `cross-chain-${selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export Successful', 'JSON file has been downloaded');
      return true;
    } catch (error) {
      logger.error('Failed to export JSON:', error as Error);
      toast.error('Export Failed', 'Failed to export JSON file. Please try again.');
      return false;
    }
  }, [
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences,
    historicalPrices,
    filteredChains,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviationPercent,
    totalDataPoints,
    toast,
  ]);

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
    correlationMatrixWithSignificance,
    chainVolatility,
    updateDelays,
    dataIntegrity,
    actualUpdateIntervals,
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
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    clearCache,
    clearCacheForProvider,
  };
}
