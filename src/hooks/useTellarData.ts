'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { TellarClient } from '@/lib/oracles/tellar';
import type {
  PriceStreamPoint,
  MarketDepth,
  MultiChainAggregation,
  TellarNetworkStats,
} from '@/lib/oracles/tellar';
import { PriceData, Blockchain } from '@/types/oracle';

const tellarClient = new TellarClient();

type TellarDataType =
  | 'price'
  | 'historical'
  | 'priceStream'
  | 'marketDepth'
  | 'multiChainAggregation'
  | 'networkStats'
  | 'liquidity'
  | 'staking';

const getTellarKey = (type: TellarDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['tellar', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseTellarPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useTellarPrice(options: UseTellarPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getTellarKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => tellarClient.getPrice(symbol, chain),
    enabled,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    price: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseTellarHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useTellarHistorical(options: UseTellarHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getTellarKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => tellarClient.getHistoricalPrices(symbol, chain, period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseTellarPriceStreamOptions {
  symbol: string;
  limit?: number;
  enabled?: boolean;
}

export function useTellarPriceStream(options: UseTellarPriceStreamOptions) {
  const { symbol, limit = 50, enabled = true } = options;
  const queryKey = getTellarKey('priceStream', { symbol, limit });

  const { data, error, isLoading, refetch } = useQuery<PriceStreamPoint[], Error>({
    queryKey,
    queryFn: () => tellarClient.getPriceStream(symbol, limit),
    enabled,
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    priceStream: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseTellarMarketDepthOptions {
  symbol: string;
  enabled?: boolean;
}

export function useTellarMarketDepth(options: UseTellarMarketDepthOptions) {
  const { symbol, enabled = true } = options;
  const queryKey = getTellarKey('marketDepth', { symbol });

  const { data, error, isLoading, refetch } = useQuery<MarketDepth, Error>({
    queryKey,
    queryFn: () => tellarClient.getMarketDepth(symbol),
    enabled,
    staleTime: 10000,
    gcTime: 60000,
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    marketDepth: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseTellarMultiChainAggregationOptions {
  symbol: string;
  enabled?: boolean;
}

export function useTellarMultiChainAggregation(options: UseTellarMultiChainAggregationOptions) {
  const { symbol, enabled = true } = options;
  const queryKey = getTellarKey('multiChainAggregation', { symbol });

  const { data, error, isLoading, refetch } = useQuery<MultiChainAggregation, Error>({
    queryKey,
    queryFn: () => tellarClient.getMultiChainAggregation(symbol),
    enabled,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    multiChainAggregation: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellarNetworkStats(enabled = true) {
  const queryKey = getTellarKey('networkStats');

  const { data, error, isLoading, refetch } = useQuery<TellarNetworkStats, Error>({
    queryKey,
    queryFn: () => tellarClient.getNetworkStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    networkStats: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellarLiquidity(enabled = true) {
  const queryKey = getTellarKey('liquidity');

  const { data, error, isLoading, refetch } = useQuery<
    {
      totalLiquidity: number;
      avgSlippage: number;
      topPairs: { pair: string; liquidity: number; volume24h: number }[];
    },
    Error
  >({
    queryKey,
    queryFn: () => tellarClient.getLiquidityMetrics(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    liquidity: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellarStaking(enabled = true) {
  const queryKey = getTellarKey('staking');

  const { data, error, isLoading, refetch } = useQuery<
    {
      totalStaked: number;
      stakingApr: number;
      stakerCount: number;
      rewardPool: number;
    },
    Error
  >({
    queryKey,
    queryFn: () => tellarClient.getStakingData(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    staking: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseTellarAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseTellarAllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  priceStream: PriceStreamPoint[];
  marketDepth: MarketDepth | undefined;
  multiChainAggregation: MultiChainAggregation | undefined;
  networkStats: TellarNetworkStats | undefined;
  liquidity: {
    totalLiquidity: number;
    avgSlippage: number;
    topPairs: { pair: string; liquidity: number; volume24h: number }[];
  } | undefined;
  staking: {
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  } | undefined;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

export function useTellarAllData(options: UseTellarAllDataOptions): UseTellarAllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useTellarPrice({ symbol, chain, enabled });
  const historicalQuery = useTellarHistorical({ symbol, chain, period: 7, enabled });
  const priceStreamQuery = useTellarPriceStream({ symbol, limit: 50, enabled });
  const marketDepthQuery = useTellarMarketDepth({ symbol, enabled });
  const multiChainAggregationQuery = useTellarMultiChainAggregation({ symbol, enabled });
  const networkStatsQuery = useTellarNetworkStats(enabled);
  const liquidityQuery = useTellarLiquidity(enabled);
  const stakingQuery = useTellarStaking(enabled);

  const isLoading = useMemo(() => {
    if (!enabled) return false;
    return (
      priceQuery.isLoading ||
      historicalQuery.isLoading ||
      priceStreamQuery.isLoading ||
      marketDepthQuery.isLoading ||
      multiChainAggregationQuery.isLoading ||
      networkStatsQuery.isLoading ||
      liquidityQuery.isLoading ||
      stakingQuery.isLoading
    );
  }, [
    enabled,
    priceQuery.isLoading,
    historicalQuery.isLoading,
    priceStreamQuery.isLoading,
    marketDepthQuery.isLoading,
    multiChainAggregationQuery.isLoading,
    networkStatsQuery.isLoading,
    liquidityQuery.isLoading,
    stakingQuery.isLoading,
  ]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    if (priceQuery.error) errs.push(priceQuery.error);
    if (historicalQuery.error) errs.push(historicalQuery.error);
    if (priceStreamQuery.error) errs.push(priceStreamQuery.error);
    if (marketDepthQuery.error) errs.push(marketDepthQuery.error);
    if (multiChainAggregationQuery.error) errs.push(multiChainAggregationQuery.error);
    if (networkStatsQuery.error) errs.push(networkStatsQuery.error);
    if (liquidityQuery.error) errs.push(liquidityQuery.error);
    if (stakingQuery.error) errs.push(stakingQuery.error);
    return errs;
  }, [
    priceQuery.error,
    historicalQuery.error,
    priceStreamQuery.error,
    marketDepthQuery.error,
    multiChainAggregationQuery.error,
    networkStatsQuery.error,
    liquidityQuery.error,
    stakingQuery.error,
  ]);

  const isError = errors.length > 0;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      priceQuery.refetch(),
      historicalQuery.refetch(),
      priceStreamQuery.refetch(),
      marketDepthQuery.refetch(),
      multiChainAggregationQuery.refetch(),
      networkStatsQuery.refetch(),
      liquidityQuery.refetch(),
      stakingQuery.refetch(),
    ]);
  }, [
    priceQuery.refetch,
    historicalQuery.refetch,
    priceStreamQuery.refetch,
    marketDepthQuery.refetch,
    multiChainAggregationQuery.refetch,
    networkStatsQuery.refetch,
    liquidityQuery.refetch,
    stakingQuery.refetch,
  ]);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    priceStream: priceStreamQuery.priceStream,
    marketDepth: marketDepthQuery.marketDepth,
    multiChainAggregation: multiChainAggregationQuery.multiChainAggregation,
    networkStats: networkStatsQuery.networkStats,
    liquidity: liquidityQuery.liquidity,
    staking: stakingQuery.staking,
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
