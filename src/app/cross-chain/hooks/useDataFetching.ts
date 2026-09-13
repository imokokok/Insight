import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  buildCrossChainComparisonFromPrices,
  type CrossChainComparisonResult,
  type ChainPriceInfo,
} from '@/lib/oracles/crossChainComparison';
import { resolveOracleAgeSeconds } from '@/lib/oracles/oracleAge';
import { crossChainKeys } from '@/lib/queryKeys';
import { createLogger } from '@/lib/utils/logger';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { validateCurrentPrices } from '../utils/validation';

import { useCrossChainQueries } from './useCrossChainQueries';

const logger = createLogger('useDataFetching');

const REFRESH_SUCCESS_DISPLAY_MS = 2000;

interface UseDataFetchingReturn {
  fetchData: () => Promise<void>;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useDataFetching(
  provider: OracleProvider,
  supportedChains: Blockchain[],
  params: {
    selectedSymbol: string;
    selectedTimeRange: number;
  },
  refetchInterval?: number
): UseDataFetchingReturn {
  const queryClient = useQueryClient();
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { chainResults, priceHistories, isLoading, isFetching, errors, triggerForceRefresh } =
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

  const derivedData = useMemo(() => {
    let recommendedBaseChain: Blockchain | null = null;
    if (supportedChains.length > 0) {
      if (currentPrices.length > 0) {
        const chainScores = supportedChains.map((chain) => {
          const priceData = currentPrices.find((p) => p.chain === chain);
          if (!priceData || priceData.price <= 0) {
            return { chain, score: -Infinity };
          }

          const dataAgeSeconds = resolveOracleAgeSeconds(priceData);
          const freshnessScore =
            dataAgeSeconds === null ? 0 : dataAgeSeconds < 60 ? 100 : dataAgeSeconds < 300 ? 50 : 0;

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
          dataAgeSeconds: resolveOracleAgeSeconds(p),
        }));
      crossChainComparison = buildCrossChainComparisonFromPrices(
        chainPrices,
        params.selectedSymbol
      );
    }

    return { recommendedBaseChain, crossChainComparison };
  }, [currentPrices, supportedChains, params.selectedSymbol]);

  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    let refreshStatus: 'idle' | 'refreshing' | 'success' | 'error' = 'idle';
    let showRefreshSuccess = false;
    let lastUpdated: Date | null = useCrossChainDataStore.getState().lastUpdated;

    if (isLoading || isFetching) {
      refreshStatus = 'refreshing';
    } else if (errors.length > 0) {
      refreshStatus = 'error';
      logger.warn('Cross-chain data fetching encountered errors', { errorCount: errors.length });
    } else if (!isLoading && !isFetching && currentPrices.length > 0) {
      const now = Date.now();
      refreshStatus = 'success';
      showRefreshSuccess = true;
      if (now - lastUpdateTimeRef.current > 1000) {
        lastUpdateTimeRef.current = now;
        lastUpdated = new Date(now);
      }
      if (refreshSuccessTimerRef.current) {
        clearTimeout(refreshSuccessTimerRef.current);
      }
      refreshSuccessTimerRef.current = setTimeout(() => {
        useCrossChainDataStore.setState({ showRefreshSuccess: false });
      }, REFRESH_SUCCESS_DISPLAY_MS);
    }

    useCrossChainDataStore.setState({
      currentPrices,
      priceHistories,
      recommendedBaseChain: derivedData.recommendedBaseChain,
      crossChainComparison: derivedData.crossChainComparison,
      loading: isLoading,
      refreshStatus,
      showRefreshSuccess,
      ...(showRefreshSuccess ? { lastUpdated } : {}),
    });
  }, [currentPrices, priceHistories, derivedData, isLoading, isFetching, errors]);

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
        params.selectedSymbol,
        String(params.selectedTimeRange)
      ),
    });
  }, [queryClient, provider, triggerForceRefresh, params.selectedSymbol, params.selectedTimeRange]);

  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: crossChainKeys.all });
  }, [queryClient]);

  const clearCacheForProvider = useCallback(
    (targetProvider: OracleProvider) => {
      queryClient.removeQueries({
        queryKey: crossChainKeys.byProvider(targetProvider, '', ''),
        exact: false,
      });
    },
    [queryClient]
  );

  return { fetchData, clearCache, clearCacheForProvider };
}
