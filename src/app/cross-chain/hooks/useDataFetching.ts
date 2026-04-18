import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { comparePricesAcrossChains } from '@/lib/oracles/crossChainComparison';
import { type CrossChainComparisonResult } from '@/lib/oracles/crossChainComparison';
import { crossChainKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/utils/logger';
import { safeMax, safeMin } from '@/lib/utils/statistics';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { type AnomalousPricePoint, detectAnomalies } from '../utils/anomalyDetection';
import { validateCurrentPrices, validateHistoricalPrices } from '../utils/validation';

import { useCrossChainQueries } from './useCrossChainQueries';

const logger = createLogger('useDataFetching');

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
): Blockchain | null {
  if (supportedChains.length === 0) return null;
  return supportedChains.reduce((best, chain) => {
    const bestLen = historicalPrices[best]?.length || 0;
    const chainLen = historicalPrices[chain]?.length || 0;
    return chainLen > bestLen ? chain : best;
  }, supportedChains[0]);
}

interface FetchDataParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (prices: Partial<Record<Blockchain, PriceData[]>>) => void;
  setPrevStats: (stats: PriceStats) => void;
  setRecommendedBaseChain: (chain: Blockchain) => void;
  setLastUpdated: (date: Date) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAnomalies: (anomalies: AnomalousPricePoint[]) => void;
  setCrossChainComparison: (results: CrossChainComparisonResult[]) => void;
}

interface UseDataFetchingReturn {
  fetchData: (signal?: AbortSignal) => Promise<void>;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useDataFetching(
  provider: OracleProvider,
  supportedChains: Blockchain[],
  params: Omit<FetchDataParams, 'selectedProvider'>,
  refetchInterval?: number
): UseDataFetchingReturn {
  const queryClient = useQueryClient();
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  const { chainResults, isLoading, isFetching, errors } = useCrossChainQueries(
    provider,
    params.selectedSymbol,
    supportedChains,
    params.selectedTimeRange,
    refetchInterval
  );

  const currentPrices = useMemo(() => {
    const prices = supportedChains
      .map((chain) => chainResults[chain]?.price)
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);
    return validateCurrentPrices(prices);
  }, [chainResults, supportedChains]);

  const historicalPrices = useMemo(() => {
    const map: Partial<Record<Blockchain, PriceData[]>> = {};
    supportedChains.forEach((chain) => {
      const rawPrices = chainResults[chain]?.historical ?? [];
      map[chain] = validateHistoricalPrices(rawPrices, chain);
    });
    return map;
  }, [chainResults, supportedChains]);

  const anomalies = useMemo(
    () => detectAnomalies(currentPrices, supportedChains),
    [currentPrices, supportedChains]
  );

  const prevStats = useMemo(() => calculatePriceStats(currentPrices), [currentPrices]);

  const recommendedBaseChain = useMemo(
    () => findChainWithMostData(supportedChains, historicalPrices),
    [supportedChains, historicalPrices]
  );

  const prevCurrentPricesRef = useRef<PriceData[]>([]);
  useEffect(() => {
    const prev = prevCurrentPricesRef.current;
    if (
      currentPrices.length !== prev.length ||
      currentPrices.some((p, i) => prev[i]?.price !== p.price || prev[i]?.timestamp !== p.timestamp)
    ) {
      prevCurrentPricesRef.current = currentPrices;
      paramsRef.current.setCurrentPrices(currentPrices);
    }
  }, [currentPrices]);

  const prevHistoricalPricesRef = useRef<Partial<Record<Blockchain, PriceData[]>>>({});
  useEffect(() => {
    const prev = prevHistoricalPricesRef.current;
    const hasChanged = Object.keys(historicalPrices).some(
      (key) => historicalPrices[key as Blockchain]?.length !== prev[key as Blockchain]?.length
    );
    if (hasChanged || Object.keys(historicalPrices).length !== Object.keys(prev).length) {
      prevHistoricalPricesRef.current = historicalPrices;
      paramsRef.current.setHistoricalPrices(historicalPrices);
    }
  }, [historicalPrices]);

  const prevPrevStatsRef = useRef<PriceStats | null>(null);
  useEffect(() => {
    const prev = prevPrevStatsRef.current;
    if (
      !prev ||
      prev.avgPrice !== prevStats.avgPrice ||
      prev.maxPrice !== prevStats.maxPrice ||
      prev.minPrice !== prevStats.minPrice
    ) {
      prevPrevStatsRef.current = prevStats;
      paramsRef.current.setPrevStats(prevStats);
    }
  }, [prevStats]);

  const prevRecommendedBaseChainRef = useRef<Blockchain | null>(null);
  useEffect(() => {
    if (recommendedBaseChain && recommendedBaseChain !== prevRecommendedBaseChainRef.current) {
      prevRecommendedBaseChainRef.current = recommendedBaseChain;
      paramsRef.current.setRecommendedBaseChain(recommendedBaseChain);
    }
  }, [recommendedBaseChain]);

  const prevAnomaliesRef = useRef<AnomalousPricePoint[]>([]);
  useEffect(() => {
    const prev = prevAnomaliesRef.current;
    if (
      anomalies.length !== prev.length ||
      anomalies.some((a, i) => prev[i]?.chain !== a.chain || prev[i]?.price !== a.price)
    ) {
      prevAnomaliesRef.current = anomalies;
      paramsRef.current.setAnomalies(anomalies);
    }
  }, [anomalies]);

  const selectedSymbol = params.selectedSymbol;

  useEffect(() => {
    if (
      !isLoading &&
      !isFetching &&
      errors.length === 0 &&
      currentPrices.length > 0 &&
      supportedChains.length > 0
    ) {
      comparePricesAcrossChains(provider, paramsRef.current.selectedSymbol, supportedChains)
        .then((results) => {
          paramsRef.current.setCrossChainComparison(results);
        })
        .catch((error) => {
          logger.error(
            'Failed to compare prices across chains',
            error instanceof Error ? error : new Error(String(error))
          );
          paramsRef.current.setCrossChainComparison([]);
        });
    }
  }, [
    currentPrices,
    provider,
    selectedSymbol,
    supportedChains,
    isLoading,
    isFetching,
    errors.length,
  ]);

  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading !== prevLoadingRef.current) {
      prevLoadingRef.current = isLoading;
      paramsRef.current.setLoading(isLoading);
    }
  }, [isLoading]);

  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    const currentParams = paramsRef.current;
    if (isLoading || isFetching) {
      currentParams.setRefreshStatus('refreshing');
    } else if (errors.length > 0) {
      currentParams.setRefreshStatus('error');
    } else if (!isLoading && !isFetching && supportedChains.length > 0) {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 1000) {
        lastUpdateTimeRef.current = now;
        currentParams.setLastUpdated(new Date(now));
      }
      currentParams.setRefreshStatus('success');
      currentParams.setShowRefreshSuccess(true);
      if (refreshSuccessTimerRef.current) {
        clearTimeout(refreshSuccessTimerRef.current);
      }
      refreshSuccessTimerRef.current = setTimeout(() => {
        currentParams.setShowRefreshSuccess(false);
      }, 2000);
    }
  }, [isLoading, isFetching, errors, supportedChains.length]);

  useEffect(() => {
    return () => {
      if (refreshSuccessTimerRef.current) {
        clearTimeout(refreshSuccessTimerRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: crossChainKeys.byProvider(
        provider,
        paramsRef.current.selectedSymbol,
        String(paramsRef.current.selectedTimeRange)
      ),
    });
  }, [queryClient, provider]);

  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: crossChainKeys.all });
  }, [queryClient]);

  const clearCacheForProvider = useCallback(
    (targetProvider: OracleProvider) => {
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'cross-chain' && key[1] === targetProvider;
        },
      });
    },
    [queryClient]
  );

  return { fetchData, clearCache, clearCacheForProvider };
}
