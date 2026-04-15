import { useCallback, useEffect, useRef } from 'react';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { type OracleProvider, type Blockchain, type PriceData } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { safeMax, safeMin } from '@/lib/utils/statistics';

import type { UseAnomalyDetectionReturn } from './useAnomalyDetection';
import type { UseDataValidationReturn } from './useDataValidation';

const logger = createLogger('useDataFetching');

const CACHE_EXPIRATION_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  timestamp: number;
}

const moduleCache: Map<string, CacheEntry> | null =
  typeof window !== 'undefined' ? new Map<string, CacheEntry>() : null;

const getGlobalCache = (): Map<string, CacheEntry> => {
  if (typeof window === 'undefined') {
    return new Map();
  }
  return moduleCache!;
};

const getCacheKey = (provider: OracleProvider, symbol: string, timeRange: number): string => {
  return `${provider}|${encodeURIComponent(symbol)}|${timeRange}`;
};

const cleanupCache = () => {
  const dataCache = getGlobalCache();
  const now = Date.now();
  const expiredKeys: string[] = [];

  dataCache.forEach((entry, key) => {
    if (now - entry.timestamp >= CACHE_EXPIRATION_MS) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach((key) => dataCache.delete(key));

  if (dataCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(dataCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, dataCache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => dataCache.delete(key));
  }
};

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

const startPeriodicCleanup = () => {
  if (cleanupIntervalId !== null) return;
  cleanupIntervalId = setInterval(() => {
    cleanupCache();
  }, 60000);
};

if (typeof window !== 'undefined') {
  startPeriodicCleanup();
}

export const clearCache = () => {
  const dataCache = getGlobalCache();
  dataCache.clear();
};

export const clearCacheForProvider = (provider: OracleProvider) => {
  const dataCache = getGlobalCache();
  const keysToDelete: string[] = [];
  dataCache.forEach((_, key) => {
    if (key.startsWith(`${provider}|`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => dataCache.delete(key));
};

export interface FetchDataParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (prices: Partial<Record<Blockchain, PriceData[]>>) => void;
  setPrevStats: (stats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  }) => void;
  setRecommendedBaseChain: (chain: Blockchain) => void;
  setLastUpdated: (date: Date) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
}

interface PriceStats {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
}

function calculatePriceStats(prices: PriceData[]): PriceStats {
  const validPrices = prices.map((d) => d.price).filter((p) => p > 0);
  if (validPrices.length === 0) {
    return { avgPrice: 0, maxPrice: 0, minPrice: 0, priceRange: 0, standardDeviationPercent: 0 };
  }
  const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const maxPrice = safeMax(validPrices);
  const minPrice = safeMin(validPrices);
  const priceRange = maxPrice - minPrice;
  const variance =
    validPrices.length > 1
      ? validPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
        (validPrices.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const standardDeviationPercent = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;

  return { avgPrice, maxPrice, minPrice, priceRange, standardDeviationPercent };
}

function findChainWithMostData(
  supportedChains: Blockchain[],
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>
): Blockchain {
  return supportedChains.reduce((best, chain) => {
    const bestLen = historicalPrices[best]?.length || 0;
    const chainLen = historicalPrices[chain]?.length || 0;
    return chainLen > bestLen ? chain : best;
  }, supportedChains[0]);
}

async function fetchPriceFromApi(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain
): Promise<PriceData> {
  return oracleApiClient.fetchPrice({
    provider,
    symbol,
    chain,
  });
}

async function fetchHistoricalFromApi(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain,
  period: number
): Promise<PriceData[]> {
  return oracleApiClient.fetchHistorical({
    provider,
    symbol,
    chain,
    period,
  });
}

export interface UseDataFetchingReturn {
  fetchData: (signal?: AbortSignal) => Promise<void>;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useDataFetching(
  provider: OracleProvider,
  supportedChains: Blockchain[],
  params: Omit<FetchDataParams, 'selectedProvider'>,
  validation: UseDataValidationReturn,
  anomalyDetection: UseAnomalyDetectionReturn
): UseDataFetchingReturn {
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const validationRef = useRef(validation);
  validationRef.current = validation;
  const anomalyDetectionRef = useRef(anomalyDetection);
  anomalyDetectionRef.current = anomalyDetection;

  useEffect(() => {
    return () => {
      if (refreshSuccessTimerRef.current) {
        clearTimeout(refreshSuccessTimerRef.current);
        refreshSuccessTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const currentSignal = signal || abortController.signal;
      const currentParams = paramsRef.current;
      const currentValidation = validationRef.current;
      const currentAnomalyDetection = anomalyDetectionRef.current;

      currentParams.setRefreshStatus('refreshing');
      currentParams.setLoading(true);

      logger.debug('Starting fetch', {
        provider,
        symbol: currentParams.selectedSymbol,
        timeRange: currentParams.selectedTimeRange,
        chainCount: supportedChains.length,
      });

      try {
        const dataCache = getGlobalCache();
        const cacheKey = getCacheKey(
          provider,
          currentParams.selectedSymbol,
          currentParams.selectedTimeRange
        );
        const cachedEntry = dataCache.get(cacheKey);
        const now = Date.now();

        if (cachedEntry && now - cachedEntry.timestamp < CACHE_EXPIRATION_MS) {
          if (currentSignal.aborted) return;

          currentParams.setCurrentPrices(cachedEntry.currentPrices);
          currentParams.setHistoricalPrices(cachedEntry.historicalPrices);

          const stats = calculatePriceStats(cachedEntry.currentPrices);
          currentParams.setPrevStats(stats);

          if (supportedChains.length > 0) {
            currentParams.setRecommendedBaseChain(
              findChainWithMostData(supportedChains, cachedEntry.historicalPrices)
            );
          }

          currentParams.setLastUpdated(new Date());
          currentParams.setRefreshStatus('success');
          currentParams.setShowRefreshSuccess(true);
          if (refreshSuccessTimerRef.current) {
            clearTimeout(refreshSuccessTimerRef.current);
          }
          refreshSuccessTimerRef.current = setTimeout(() => {
            if (!abortControllerRef.current?.signal.aborted) {
              paramsRef.current.setShowRefreshSuccess(false);
            }
          }, 2000);
          currentParams.setLoading(false);
          return;
        }

        logger.debug('Fetching prices for chains', { chainCount: supportedChains.length });
        const currentPromises = supportedChains.map((chain) =>
          fetchPriceFromApi(provider, currentParams.selectedSymbol, chain).catch((err) => {
            logger.error(
              `Failed to fetch price for ${chain}`,
              err instanceof Error ? err : new Error(String(err))
            );
            return null;
          })
        );
        const currentResults = await Promise.all(currentPromises);

        if (currentSignal.aborted) return;

        const validCurrentResults = currentResults.filter(
          (r): r is NonNullable<typeof r> => r !== null
        );
        const validatedCurrentResults =
          currentValidation.validateCurrentPrices(validCurrentResults);

        currentParams.setCurrentPrices(validatedCurrentResults);

        const historicalPromises = supportedChains.map((chain) =>
          fetchHistoricalFromApi(
            provider,
            currentParams.selectedSymbol,
            chain,
            currentParams.selectedTimeRange
          ).catch((err) => {
            logger.error(
              `Failed to fetch historical prices for ${chain}`,
              err instanceof Error ? err : new Error(String(err))
            );
            return [];
          })
        );
        const historicalResults = await Promise.all(historicalPromises);

        if (currentSignal.aborted) return;

        const historicalMap: Partial<Record<Blockchain, PriceData[]>> = {};

        supportedChains.forEach((chain, index) => {
          const rawPrices = historicalResults[index] || [];
          const validatedPrices = currentValidation.validateHistoricalPrices(rawPrices, chain);
          historicalMap[chain] = validatedPrices;
        });

        currentParams.setHistoricalPrices(historicalMap);

        currentAnomalyDetection.detectAnomalies(validatedCurrentResults, supportedChains);

        cleanupCache();

        dataCache.set(cacheKey, {
          currentPrices: validatedCurrentResults,
          historicalPrices: historicalMap,
          timestamp: now,
        });

        const stats = calculatePriceStats(validatedCurrentResults);
        currentParams.setPrevStats(stats);

        if (supportedChains.length > 0) {
          currentParams.setRecommendedBaseChain(
            findChainWithMostData(supportedChains, historicalMap)
          );
        }

        currentParams.setLastUpdated(new Date());
        currentParams.setRefreshStatus('success');
        currentParams.setShowRefreshSuccess(true);
        if (refreshSuccessTimerRef.current) {
          clearTimeout(refreshSuccessTimerRef.current);
        }
        refreshSuccessTimerRef.current = setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            paramsRef.current.setShowRefreshSuccess(false);
          }
        }, 2000);
      } catch (error) {
        if (currentSignal.aborted) return;

        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          'Error fetching data',
          error instanceof Error ? error : new Error(String(error)),
          {
            message: errorMessage,
            provider,
            symbol: currentParams.selectedSymbol,
            chains: supportedChains,
          }
        );
        currentParams.setRefreshStatus('error');
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          paramsRef.current.setLoading(false);
        }
      }
    },
    [supportedChains, provider]
  );

  return {
    fetchData,
    clearCache,
    clearCacheForProvider,
  };
}
