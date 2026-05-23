import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  buildCrossChainComparisonFromPrices,
  type CrossChainComparisonResult,
  type ChainPriceInfo,
} from '@/lib/oracles/crossChainComparison';
import { crossChainKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/utils/logger';
import { safeMax, safeMin } from '@/lib/utils/statistics';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { type PriceStats } from '@/types/analytics';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { type AnomalousPricePoint, detectAnomalies } from '../utils/anomalyDetection';
import { validateCurrentPrices } from '../utils/validation';

import { useCrossChainQueries } from './useCrossChainQueries';

const logger = createLogger('useDataFetching');

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

interface FetchDataParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  setCurrentPrices: (prices: PriceData[]) => void;
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

  const { chainResults, isLoading, isFetching, errors, triggerForceRefresh, resetForceRefresh } =
    useCrossChainQueries(
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

  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

  const derivedData = useMemo(() => {
    const anomalies = detectAnomalies(currentPrices, supportedChains, thresholdConfig);
    const prevStats = calculatePriceStats(currentPrices);

    let recommendedBaseChain: Blockchain | null = null;
    if (supportedChains.length > 0) {
      if (currentPrices.length === 0) {
        recommendedBaseChain = supportedChains[0];
      } else {
        const maxTimestamp = Math.max(
          ...currentPrices.map((p) => p.timestamp).filter((t) => t > 0),
          0
        );

        const chainScores = supportedChains.map((chain) => {
          const priceData = currentPrices.find((p) => p.chain === chain);
          if (!priceData || priceData.price <= 0) {
            return { chain, score: -Infinity };
          }

          const stalenessMs =
            maxTimestamp > 0 && priceData.timestamp > 0
              ? maxTimestamp - priceData.timestamp
              : Infinity;
          const freshnessScore = stalenessMs < 60000 ? 100 : stalenessMs < 300000 ? 50 : 0;

          const priceValues = currentPrices.filter((p) => p.price > 0).map((p) => p.price);
          const medianPrice =
            priceValues.length > 0
              ? [...priceValues].sort((a, b) => a - b)[Math.floor(priceValues.length / 2)]
              : priceData.price;
          const deviation =
            medianPrice > 0 ? Math.abs((priceData.price - medianPrice) / medianPrice) * 100 : 0;
          const consistencyScore = Math.max(0, 100 - deviation * 10);

          const score = freshnessScore * 0.6 + consistencyScore * 0.4;
          return { chain, score };
        });

        chainScores.sort((a, b) => b.score - a.score);
        recommendedBaseChain = chainScores[0]?.chain ?? supportedChains[0];
      }
    }

    let crossChainComparison: CrossChainComparisonResult[] = [];
    if (currentPrices.length > 0 && supportedChains.length > 0) {
      const chainPrices: ChainPriceInfo[] = currentPrices
        .filter((p) => p.chain && supportedChains.includes(p.chain))
        .map((p) => ({
          chain: p.chain!,
          price: p.price,
          timestamp: p.timestamp,
        }));
      crossChainComparison = buildCrossChainComparisonFromPrices(chainPrices);
    }

    return { anomalies, prevStats, recommendedBaseChain, crossChainComparison };
  }, [currentPrices, supportedChains, thresholdConfig]);

  const prevDataSignatureRef = useRef('');
  useEffect(() => {
    const signature = currentPrices.map((p) => `${p.chain}:${p.price}:${p.timestamp}`).join('|');
    if (signature === prevDataSignatureRef.current) return;
    prevDataSignatureRef.current = signature;

    useCrossChainDataStore.setState({
      currentPrices,
      prevStats: derivedData.prevStats,
      anomalies: derivedData.anomalies,
      recommendedBaseChain: derivedData.recommendedBaseChain,
      crossChainComparison: derivedData.crossChainComparison,
    });
  }, [currentPrices, derivedData]);

  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading !== prevLoadingRef.current) {
      prevLoadingRef.current = isLoading;
      useCrossChainDataStore.setState({ loading: isLoading });
    }
  }, [isLoading]);

  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading || isFetching) {
      useCrossChainDataStore.setState({ refreshStatus: 'refreshing' });
    } else if (errors.length > 0) {
      useCrossChainDataStore.setState({ refreshStatus: 'error' });
      logger.warn('Cross-chain data fetching encountered errors', { errorCount: errors.length });
    } else if (!isLoading && !isFetching && supportedChains.length > 0) {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 1000) {
        lastUpdateTimeRef.current = now;
        useCrossChainDataStore.setState({
          refreshStatus: 'success',
          showRefreshSuccess: true,
          lastUpdated: new Date(now),
        });
      } else {
        useCrossChainDataStore.setState({
          refreshStatus: 'success',
          showRefreshSuccess: true,
        });
      }
      if (refreshSuccessTimerRef.current) {
        clearTimeout(refreshSuccessTimerRef.current);
      }
      refreshSuccessTimerRef.current = setTimeout(() => {
        useCrossChainDataStore.setState({ showRefreshSuccess: false });
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
    triggerForceRefresh();
    await queryClient.invalidateQueries({
      queryKey: crossChainKeys.byProvider(
        provider,
        paramsRef.current.selectedSymbol,
        String(paramsRef.current.selectedTimeRange)
      ),
    });
    resetForceRefresh();
  }, [queryClient, provider, triggerForceRefresh, resetForceRefresh]);

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
