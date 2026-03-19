'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { TellorClient } from '@/lib/oracles/tellor';
import type {
  PriceStreamPoint,
  MarketDepth,
  MultiChainAggregation,
  TellorNetworkStats,
  ReporterStats,
  RiskMetrics,
  EcosystemStats,
  DisputeStats,
  StakingCalculation,
  TellorNetworkHealth,
} from '@/lib/oracles/tellor';
import { PriceData, Blockchain } from '@/types/oracle';

const tellorClient = new TellorClient();

type TellorDataType =
  | 'price'
  | 'historical'
  | 'priceStream'
  | 'marketDepth'
  | 'multiChainAggregation'
  | 'networkStats'
  | 'liquidity'
  | 'staking'
  | 'reporters'
  | 'risk'
  | 'ecosystem'
  | 'disputes'
  | 'networkHealth';

const getTellorKey = (type: TellorDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['tellor', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseTellorPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useTellorPrice(options: UseTellorPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getTellorKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => tellorClient.getPrice(symbol, chain),
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

interface UseTellorHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useTellorHistorical(options: UseTellorHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getTellorKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => tellorClient.getHistoricalPrices(symbol, chain, period),
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

interface UseTellorPriceStreamOptions {
  symbol: string;
  limit?: number;
  enabled?: boolean;
}

export function useTellorPriceStream(options: UseTellorPriceStreamOptions) {
  const { symbol, limit = 50, enabled = true } = options;
  const queryKey = getTellorKey('priceStream', { symbol, limit });

  const { data, error, isLoading, refetch } = useQuery<PriceStreamPoint[], Error>({
    queryKey,
    queryFn: () => tellorClient.getPriceStream(symbol, limit),
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

interface UseTellorMarketDepthOptions {
  symbol: string;
  enabled?: boolean;
}

export function useTellorMarketDepth(options: UseTellorMarketDepthOptions) {
  const { symbol, enabled = true } = options;
  const queryKey = getTellorKey('marketDepth', { symbol });

  const { data, error, isLoading, refetch } = useQuery<MarketDepth, Error>({
    queryKey,
    queryFn: () => tellorClient.getMarketDepth(symbol),
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

interface UseTellorMultiChainAggregationOptions {
  symbol: string;
  enabled?: boolean;
}

export function useTellorMultiChainAggregation(options: UseTellorMultiChainAggregationOptions) {
  const { symbol, enabled = true } = options;
  const queryKey = getTellorKey('multiChainAggregation', { symbol });

  const { data, error, isLoading, refetch } = useQuery<MultiChainAggregation, Error>({
    queryKey,
    queryFn: () => tellorClient.getMultiChainAggregation(symbol),
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

export function useTellorNetworkStats(enabled = true) {
  const queryKey = getTellorKey('networkStats');

  const { data, error, isLoading, refetch } = useQuery<TellorNetworkStats, Error>({
    queryKey,
    queryFn: () => tellorClient.getNetworkStats(),
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

export function useTellorLiquidity(enabled = true) {
  const queryKey = getTellorKey('liquidity');

  const { data, error, isLoading, refetch } = useQuery<
    {
      totalLiquidity: number;
      avgSlippage: number;
      topPairs: { pair: string; liquidity: number; volume24h: number }[];
    },
    Error
  >({
    queryKey,
    queryFn: () => tellorClient.getLiquidityMetrics(),
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

export function useTellorStaking(enabled = true) {
  const queryKey = getTellorKey('staking');

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
    queryFn: () => tellorClient.getStakingData(),
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

export function useTellorReporters(enabled = true) {
  const queryKey = getTellorKey('reporters');

  const { data, error, isLoading, refetch } = useQuery<ReporterStats, Error>({
    queryKey,
    queryFn: () => tellorClient.getReporterStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    reporters: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellorRisk(enabled = true) {
  const queryKey = getTellorKey('risk');

  const { data, error, isLoading, refetch } = useQuery<RiskMetrics, Error>({
    queryKey,
    queryFn: () => tellorClient.getRiskMetrics(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    risk: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellorEcosystem(enabled = true) {
  const queryKey = getTellorKey('ecosystem');

  const { data, error, isLoading, refetch } = useQuery<EcosystemStats, Error>({
    queryKey,
    queryFn: () => tellorClient.getEcosystemStats(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ecosystem: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellorDisputes(enabled = true) {
  const queryKey = getTellorKey('disputes');

  const { data, error, isLoading, refetch } = useQuery<DisputeStats, Error>({
    queryKey,
    queryFn: () => tellorClient.getDisputeStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    disputes: data,
    error,
    isLoading,
    refetch,
  };
}

export function useTellorNetworkHealth(enabled = true) {
  const queryKey = getTellorKey('networkHealth');

  const { data, error, isLoading, refetch } = useQuery<TellorNetworkHealth, Error>({
    queryKey,
    queryFn: () => tellorClient.getNetworkHealth(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    networkHealth: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseStakingCalculatorOptions {
  stakeAmount: number;
  duration: number;
  isActiveReporter: boolean;
  disputeParticipation: number;
}

export function useStakingCalculator(options: UseStakingCalculatorOptions) {
  const calculation = useMemo<StakingCalculation>(() => {
    return tellorClient.calculateStaking({
      stakeAmount: options.stakeAmount,
      duration: options.duration,
      isActiveReporter: options.isActiveReporter,
      disputeParticipation: options.disputeParticipation,
    });
  }, [
    options.stakeAmount,
    options.duration,
    options.isActiveReporter,
    options.disputeParticipation,
  ]);

  return calculation;
}

interface UseTellorAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseTellorAllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  priceStream: PriceStreamPoint[];
  marketDepth: MarketDepth | undefined;
  multiChainAggregation: MultiChainAggregation | undefined;
  networkStats: TellorNetworkStats | undefined;
  networkHealth: TellorNetworkHealth | undefined;
  liquidity:
    | {
        totalLiquidity: number;
        avgSlippage: number;
        topPairs: { pair: string; liquidity: number; volume24h: number }[];
      }
    | undefined;
  staking:
    | {
        totalStaked: number;
        stakingApr: number;
        stakerCount: number;
        rewardPool: number;
      }
    | undefined;
  reporters: ReporterStats | undefined;
  risk: RiskMetrics | undefined;
  ecosystem: EcosystemStats | undefined;
  disputes: DisputeStats | undefined;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

export function useTellorAllData(options: UseTellorAllDataOptions): UseTellorAllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useTellorPrice({ symbol, chain, enabled });
  const historicalQuery = useTellorHistorical({ symbol, chain, period: 7, enabled });
  const priceStreamQuery = useTellorPriceStream({ symbol, limit: 50, enabled });
  const marketDepthQuery = useTellorMarketDepth({ symbol, enabled });
  const multiChainAggregationQuery = useTellorMultiChainAggregation({ symbol, enabled });
  const networkStatsQuery = useTellorNetworkStats(enabled);
  const networkHealthQuery = useTellorNetworkHealth(enabled);
  const liquidityQuery = useTellorLiquidity(enabled);
  const stakingQuery = useTellorStaking(enabled);
  const reportersQuery = useTellorReporters(enabled);
  const riskQuery = useTellorRisk(enabled);
  const ecosystemQuery = useTellorEcosystem(enabled);
  const disputesQuery = useTellorDisputes(enabled);

  const isLoading = useMemo(() => {
    if (!enabled) return false;
    return (
      priceQuery.isLoading ||
      historicalQuery.isLoading ||
      priceStreamQuery.isLoading ||
      marketDepthQuery.isLoading ||
      multiChainAggregationQuery.isLoading ||
      networkStatsQuery.isLoading ||
      networkHealthQuery.isLoading ||
      liquidityQuery.isLoading ||
      stakingQuery.isLoading ||
      reportersQuery.isLoading ||
      riskQuery.isLoading ||
      ecosystemQuery.isLoading ||
      disputesQuery.isLoading
    );
  }, [
    enabled,
    priceQuery.isLoading,
    historicalQuery.isLoading,
    priceStreamQuery.isLoading,
    marketDepthQuery.isLoading,
    multiChainAggregationQuery.isLoading,
    networkStatsQuery.isLoading,
    networkHealthQuery.isLoading,
    liquidityQuery.isLoading,
    stakingQuery.isLoading,
    reportersQuery.isLoading,
    riskQuery.isLoading,
    ecosystemQuery.isLoading,
    disputesQuery.isLoading,
  ]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    if (priceQuery.error) errs.push(priceQuery.error);
    if (historicalQuery.error) errs.push(historicalQuery.error);
    if (priceStreamQuery.error) errs.push(priceStreamQuery.error);
    if (marketDepthQuery.error) errs.push(marketDepthQuery.error);
    if (multiChainAggregationQuery.error) errs.push(multiChainAggregationQuery.error);
    if (networkStatsQuery.error) errs.push(networkStatsQuery.error);
    if (networkHealthQuery.error) errs.push(networkHealthQuery.error);
    if (liquidityQuery.error) errs.push(liquidityQuery.error);
    if (stakingQuery.error) errs.push(stakingQuery.error);
    if (reportersQuery.error) errs.push(reportersQuery.error);
    if (riskQuery.error) errs.push(riskQuery.error);
    if (ecosystemQuery.error) errs.push(ecosystemQuery.error);
    if (disputesQuery.error) errs.push(disputesQuery.error);
    return errs;
  }, [
    priceQuery.error,
    historicalQuery.error,
    priceStreamQuery.error,
    marketDepthQuery.error,
    multiChainAggregationQuery.error,
    networkStatsQuery.error,
    networkHealthQuery.error,
    liquidityQuery.error,
    stakingQuery.error,
    reportersQuery.error,
    riskQuery.error,
    ecosystemQuery.error,
    disputesQuery.error,
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
      networkHealthQuery.refetch(),
      liquidityQuery.refetch(),
      stakingQuery.refetch(),
      reportersQuery.refetch(),
      riskQuery.refetch(),
      ecosystemQuery.refetch(),
      disputesQuery.refetch(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    priceStream: priceStreamQuery.priceStream,
    marketDepth: marketDepthQuery.marketDepth,
    multiChainAggregation: multiChainAggregationQuery.multiChainAggregation,
    networkStats: networkStatsQuery.networkStats,
    networkHealth: networkHealthQuery.networkHealth,
    liquidity: liquidityQuery.liquidity,
    staking: stakingQuery.staking,
    reporters: reportersQuery.reporters,
    risk: riskQuery.risk,
    ecosystem: ecosystemQuery.ecosystem,
    disputes: disputesQuery.disputes,
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
