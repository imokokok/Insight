/**
 * @fileoverview 数据获取 Hook
 * 提供跨链价格数据获取和缓存功能
 * 通过 API 路由获取数据，避免前端直接调用 RPC 导致的 CORS 和并发问题
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

// Toast component removed - using alternative notification method
import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { type OracleProvider, type Blockchain, type PriceData } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';

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

const moduleCache = new Map<string, CacheEntry>();

const getGlobalCache = (): Map<string, CacheEntry> => {
  return moduleCache;
};

const getCacheKey = (provider: OracleProvider, symbol: string, timeRange: number): string => {
  // 使用 encodeURIComponent 防止特殊字符导致键冲突
  // 使用 | 作为分隔符，减少与 symbol 中常见字符的冲突概率
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

/**
 * 通过 API 路由获取当前价格
 */
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

/**
 * 通过 API 路由获取历史价格
 */
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
  const toast = useMemo(
    () => ({
      success: (title: string, message: string) => console.info(`[Success] ${title}: ${message}`),
      error: (title: string, message: string) => console.error(`[Error] ${title}: ${message}`),
      warning: (title: string, message: string) => console.warn(`[Warning] ${title}: ${message}`),
    }),
    []
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理定时器，防止内存泄漏
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

      params.setRefreshStatus('refreshing');
      params.setLoading(true);

      console.warn('[useDataFetching] Starting fetch:', {
        provider,
        symbol: params.selectedSymbol,
        timeRange: params.selectedTimeRange,
        supportedChains,
        chainCount: supportedChains.length,
      });

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

        // 使用 API 路由获取当前价格，避免前端直接调用 RPC
        console.warn('[useDataFetching] Fetching prices for chains:', supportedChains);
        const currentPromises = supportedChains.map((chain) =>
          fetchPriceFromApi(provider, params.selectedSymbol, chain).catch((err) => {
            console.error(`[useDataFetching] Failed to fetch price for ${chain}:`, err);
            throw err;
          })
        );
        const currentResults = await Promise.all(currentPromises);
        console.warn('[useDataFetching] Price results:', currentResults);

        if (currentSignal.aborted) return;

        const validatedCurrentResults = validation.validateCurrentPrices(currentResults);

        params.setCurrentPrices(validatedCurrentResults);

        // 使用 API 路由获取历史价格，避免前端直接调用 RPC
        const historicalPromises = supportedChains.map((chain) =>
          fetchHistoricalFromApi(provider, params.selectedSymbol, chain, params.selectedTimeRange)
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
        const errorStack = error instanceof Error ? error.stack : '';
        logger.error(
          'Error fetching data',
          error instanceof Error ? error : new Error(String(error)),
          {
            message: errorMessage,
            stack: errorStack,
            provider,
            symbol: params.selectedSymbol,
            chains: supportedChains,
          }
        );
        console.error('[useDataFetching] Detailed error:', {
          message: errorMessage,
          stack: errorStack,
          provider,
          symbol: params.selectedSymbol,
          chains: supportedChains,
          error,
        });
        params.setRefreshStatus('error');
        toast.error('数据获取失败', `无法获取价格数据: ${errorMessage}`);
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          params.setLoading(false);
        }
      }
    },
    [supportedChains, params, provider, validation, anomalyDetection, toast]
  );

  return {
    fetchData,
    clearCache,
    clearCacheForProvider,
  };
}
