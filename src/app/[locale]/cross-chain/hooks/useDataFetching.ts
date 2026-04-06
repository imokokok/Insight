/**
 * @fileoverview 数据获取 Hook
 * 提供跨链价格数据获取和缓存功能
 */

import { useCallback, useRef } from 'react';

import { useToastMethods } from '@/components/ui/Toast';
import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  type BaseOracleClient,
} from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';

import { useAnomalyDetection, type UseAnomalyDetectionReturn } from './useAnomalyDetection';
import { useDataValidation, type UseDataValidationReturn } from './useDataValidation';

const isClient = typeof window !== 'undefined';
const logger = createLogger('useDataFetching');

const CACHE_EXPIRATION_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  timestamp: number;
}

const getGlobalCache = (): Map<string, CacheEntry> => {
  if (!isClient) {
    return new Map();
  }
  if (
    !(window as unknown as { __crossChainDataCache?: Map<string, CacheEntry> })
      .__crossChainDataCache
  ) {
    (
      window as unknown as { __crossChainDataCache?: Map<string, CacheEntry> }
    ).__crossChainDataCache = new Map();
  }
  return (window as unknown as { __crossChainDataCache: Map<string, CacheEntry> })
    .__crossChainDataCache;
};

const getCacheKey = (provider: OracleProvider, symbol: string, timeRange: number): string => {
  return `${provider}-${symbol}-${timeRange}`;
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

export const clearCache = () => {
  const dataCache = getGlobalCache();
  dataCache.clear();
};

export const clearCacheForProvider = (provider: OracleProvider) => {
  const dataCache = getGlobalCache();
  const keysToDelete: string[] = [];
  dataCache.forEach((_, key) => {
    if (key.startsWith(`${provider}-`)) {
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

export interface UseDataFetchingReturn {
  fetchData: (signal?: AbortSignal) => Promise<void>;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useDataFetching(
  provider: OracleProvider,
  currentClient: BaseOracleClient,
  supportedChains: Blockchain[],
  params: Omit<FetchDataParams, 'selectedProvider'>,
  validation: UseDataValidationReturn,
  anomalyDetection: UseAnomalyDetectionReturn
): UseDataFetchingReturn {
  const toast = useToastMethods();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const currentSignal = signal || abortController.signal;

      params.setRefreshStatus('refreshing');
      params.setLoading(true);
      try {
        const dataCache = getGlobalCache();
        const cacheKey = getCacheKey(provider, params.selectedSymbol, params.selectedTimeRange);
        const cachedEntry = dataCache.get(cacheKey);
        const now = Date.now();

        if (cachedEntry && now - cachedEntry.timestamp < CACHE_EXPIRATION_MS) {
          if (currentSignal.aborted) return;

          params.setCurrentPrices(cachedEntry.currentPrices);
          params.setHistoricalPrices(cachedEntry.historicalPrices);

          const validPrices = cachedEntry.currentPrices.map((d) => d.price).filter((p) => p > 0);
          const newAvgPrice =
            validPrices.length > 0
              ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
              : 0;
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

          params.setPrevStats({
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
            params.setRecommendedBaseChain(chainWithMostData);
          }

          params.setLastUpdated(new Date());
          params.setRefreshStatus('success');
          params.setShowRefreshSuccess(true);
          if (refreshSuccessTimerRef.current) {
            clearTimeout(refreshSuccessTimerRef.current);
          }
          refreshSuccessTimerRef.current = setTimeout(() => {
            if (!abortControllerRef.current?.signal.aborted) {
              params.setShowRefreshSuccess(false);
            }
          }, 2000);
          params.setLoading(false);
          return;
        }

        const currentPromises = supportedChains.map((chain) =>
          currentClient.getPrice(params.selectedSymbol, chain)
        );
        const currentResults = await Promise.all(currentPromises);

        if (currentSignal.aborted) return;

        const validatedCurrentResults = validation.validateCurrentPrices(currentResults);

        params.setCurrentPrices(validatedCurrentResults);

        const historicalPromises = supportedChains.map((chain) =>
          currentClient.getHistoricalPrices(params.selectedSymbol, chain, params.selectedTimeRange)
        );
        const historicalResults = await Promise.all(historicalPromises);

        if (currentSignal.aborted) return;

        const historicalMap: Partial<Record<Blockchain, PriceData[]>> = {};

        supportedChains.forEach((chain, index) => {
          const rawPrices = historicalResults[index] || [];
          const validatedPrices = validation.validateHistoricalPrices(rawPrices, chain);
          historicalMap[chain] = validatedPrices;
        });

        params.setHistoricalPrices(historicalMap);

        anomalyDetection.detectAnomalies(validatedCurrentResults, supportedChains);

        cleanupCache();

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

        params.setPrevStats({
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
          params.setRecommendedBaseChain(chainWithMostData);
        }

        params.setLastUpdated(new Date());
        params.setRefreshStatus('success');
        params.setShowRefreshSuccess(true);
        if (refreshSuccessTimerRef.current) {
          clearTimeout(refreshSuccessTimerRef.current);
        }
        refreshSuccessTimerRef.current = setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            params.setShowRefreshSuccess(false);
          }
        }, 2000);
      } catch (error) {
        if (currentSignal.aborted) return;

        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          'Error fetching data',
          error instanceof Error ? error : new Error(String(error))
        );
        params.setRefreshStatus('error');
        toast.error('数据获取失败', `无法获取价格数据: ${errorMessage}`);
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          params.setLoading(false);
        }
      }
    },
    [currentClient, supportedChains, params, provider, validation, anomalyDetection, toast]
  );

  return {
    fetchData,
    clearCache,
    clearCacheForProvider,
  };
}
