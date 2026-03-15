'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { DIAClient } from '@/lib/oracles/dia';
import type {
  DataSourceTransparency,
  CrossChainCoverage,
  DataSourceVerification,
  DIANetworkStats,
} from '@/lib/oracles/dia';
import { PriceData, Blockchain } from '@/types/oracle';

const diaClient = new DIAClient();

type DIADataType =
  | 'price'
  | 'historical'
  | 'dataTransparency'
  | 'crossChainCoverage'
  | 'dataSourceVerification'
  | 'networkStats'
  | 'staking';

const getDIAKey = (type: DIADataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['dia', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseDIAPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useDIAPrice(options: UseDIAPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getDIAKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => diaClient.getPrice(symbol, chain),
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

interface UseDIAHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useDIAHistorical(options: UseDIAHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getDIAKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => diaClient.getHistoricalPrices(symbol, chain, period),
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

export function useDIADataTransparency(enabled = true) {
  const queryKey = getDIAKey('dataTransparency');

  const { data, error, isLoading, refetch } = useQuery<DataSourceTransparency[], Error>({
    queryKey,
    queryFn: () => diaClient.getDataTransparency(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    dataTransparency: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useDIACrossChainCoverage(enabled = true) {
  const queryKey = getDIAKey('crossChainCoverage');

  const { data, error, isLoading, refetch } = useQuery<CrossChainCoverage, Error>({
    queryKey,
    queryFn: () => diaClient.getCrossChainCoverage(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    crossChainCoverage: data,
    error,
    isLoading,
    refetch,
  };
}

export function useDIADataSourceVerification(enabled = true) {
  const queryKey = getDIAKey('dataSourceVerification');

  const { data, error, isLoading, refetch } = useQuery<DataSourceVerification[], Error>({
    queryKey,
    queryFn: () => diaClient.getDataSourceVerification(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    dataSourceVerification: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useDIANetworkStats(enabled = true) {
  const queryKey = getDIAKey('networkStats');

  const { data, error, isLoading, refetch } = useQuery<DIANetworkStats, Error>({
    queryKey,
    queryFn: () => diaClient.getNetworkStats(),
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

export function useDIAStaking(enabled = true) {
  const queryKey = getDIAKey('staking');

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
    queryFn: () => diaClient.getStakingData(),
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

interface UseDIAAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseDIAAllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  dataTransparency: DataSourceTransparency[];
  crossChainCoverage: CrossChainCoverage | undefined;
  dataSourceVerification: DataSourceVerification[];
  networkStats: DIANetworkStats | undefined;
  staking:
    | {
        totalStaked: number;
        stakingApr: number;
        stakerCount: number;
        rewardPool: number;
      }
    | undefined;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

export function useDIAAllData(options: UseDIAAllDataOptions): UseDIAAllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useDIAPrice({ symbol, chain, enabled });
  const historicalQuery = useDIAHistorical({ symbol, chain, period: 7, enabled });
  const dataTransparencyQuery = useDIADataTransparency(enabled);
  const crossChainCoverageQuery = useDIACrossChainCoverage(enabled);
  const dataSourceVerificationQuery = useDIADataSourceVerification(enabled);
  const networkStatsQuery = useDIANetworkStats(enabled);
  const stakingQuery = useDIAStaking(enabled);

  const isLoading = useMemo(() => {
    if (!enabled) return false;
    return (
      priceQuery.isLoading ||
      historicalQuery.isLoading ||
      dataTransparencyQuery.isLoading ||
      crossChainCoverageQuery.isLoading ||
      dataSourceVerificationQuery.isLoading ||
      networkStatsQuery.isLoading ||
      stakingQuery.isLoading
    );
  }, [
    enabled,
    priceQuery.isLoading,
    historicalQuery.isLoading,
    dataTransparencyQuery.isLoading,
    crossChainCoverageQuery.isLoading,
    dataSourceVerificationQuery.isLoading,
    networkStatsQuery.isLoading,
    stakingQuery.isLoading,
  ]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    if (priceQuery.error) errs.push(priceQuery.error);
    if (historicalQuery.error) errs.push(historicalQuery.error);
    if (dataTransparencyQuery.error) errs.push(dataTransparencyQuery.error);
    if (crossChainCoverageQuery.error) errs.push(crossChainCoverageQuery.error);
    if (dataSourceVerificationQuery.error) errs.push(dataSourceVerificationQuery.error);
    if (networkStatsQuery.error) errs.push(networkStatsQuery.error);
    if (stakingQuery.error) errs.push(stakingQuery.error);
    return errs;
  }, [
    priceQuery.error,
    historicalQuery.error,
    dataTransparencyQuery.error,
    crossChainCoverageQuery.error,
    dataSourceVerificationQuery.error,
    networkStatsQuery.error,
    stakingQuery.error,
  ]);

  const isError = errors.length > 0;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      priceQuery.refetch(),
      historicalQuery.refetch(),
      dataTransparencyQuery.refetch(),
      crossChainCoverageQuery.refetch(),
      dataSourceVerificationQuery.refetch(),
      networkStatsQuery.refetch(),
      stakingQuery.refetch(),
    ]);
  }, [
    priceQuery.refetch,
    historicalQuery.refetch,
    dataTransparencyQuery.refetch,
    crossChainCoverageQuery.refetch,
    dataSourceVerificationQuery.refetch,
    networkStatsQuery.refetch,
    stakingQuery.refetch,
  ]);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    dataTransparency: dataTransparencyQuery.dataTransparency,
    crossChainCoverage: crossChainCoverageQuery.crossChainCoverage,
    dataSourceVerification: dataSourceVerificationQuery.dataSourceVerification,
    networkStats: networkStatsQuery.networkStats,
    staking: stakingQuery.staking,
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
