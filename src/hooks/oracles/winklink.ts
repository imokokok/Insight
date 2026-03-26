'use client';

import { useMemo, useCallback, useState } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { WINkLinkClient } from '@/lib/oracles';
import type {
  TRONEcosystem,
  NodeStakingData,
  WINkLinkGamingData,
  WINkLinkRiskMetrics,
} from '@/lib/oracles';
import { type Blockchain } from '@/types/oracle';

const client = new WINkLinkClient();

function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateLastUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return { lastUpdated, updateLastUpdated };
}

export function useWINkLinkPrice(symbol: string) {
  return useQuery({
    queryKey: ['winklink', 'price', symbol],
    queryFn: () => client.getPrice(symbol),
    refetchInterval: 60000,
  });
}

export function useWINkLinkHistoricalPrices(symbol: string, period: number = 24) {
  return useQuery({
    queryKey: ['winklink', 'historical', symbol, period],
    queryFn: () => client.getHistoricalPrices(symbol, undefined, period),
    refetchInterval: 300000,
  });
}

export function useWINkLinkTRONEcosystem() {
  return useQuery<TRONEcosystem>({
    queryKey: ['winklink', 'tron'],
    queryFn: () => client.getTRONEcosystem(),
    refetchInterval: 60000,
  });
}

export function useWINkLinkStaking() {
  return useQuery<NodeStakingData>({
    queryKey: ['winklink', 'staking'],
    queryFn: () => client.getNodeStaking(),
    refetchInterval: 60000,
  });
}

export function useWINkLinkGamingData() {
  return useQuery<WINkLinkGamingData>({
    queryKey: ['winklink', 'gaming'],
    queryFn: () => client.getGamingData(),
    refetchInterval: 60000,
  });
}

export function useWINkLinkNetworkStats() {
  return useQuery({
    queryKey: ['winklink', 'network'],
    queryFn: () => client.getNetworkStats(),
    refetchInterval: 60000,
  });
}

export function useWINkLinkRiskMetrics() {
  return useQuery<WINkLinkRiskMetrics>({
    queryKey: ['winklink', 'risk'],
    queryFn: () => client.getRiskMetrics(),
    refetchInterval: 60000,
  });
}

interface UseWINkLinkAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useWINkLinkAllData({ symbol, chain, enabled = true }: UseWINkLinkAllDataOptions) {
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: ['winklink', 'price', symbol, chain],
        queryFn: async () => {
          const result = await client.getPrice(symbol, chain);
          updateLastUpdated();
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'historical', symbol, chain, 24],
        queryFn: () => client.getHistoricalPrices(symbol, chain, 24),
        enabled,
        refetchInterval: 300000,
      },
      {
        queryKey: ['winklink', 'tron'],
        queryFn: () => client.getTRONEcosystem(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'staking'],
        queryFn: () => client.getNodeStaking(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'gaming'],
        queryFn: () => client.getGamingData(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'network'],
        queryFn: () => client.getNetworkStats(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'risk'],
        queryFn: () => client.getRiskMetrics(),
        enabled,
        refetchInterval: 60000,
      },
    ],
  });

  const [
    priceResult,
    historicalResult,
    tronResult,
    stakingResult,
    gamingResult,
    networkResult,
    riskResult,
  ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      tronIntegration: tronResult.data ?? null,
      staking: stakingResult.data ?? null,
      gaming: gamingResult.data ?? null,
      networkStats: networkResult.data ?? null,
      riskMetrics: riskResult.data ?? null,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    }),
    [
      priceResult.data,
      historicalResult.data,
      tronResult.data,
      stakingResult.data,
      gamingResult.data,
      networkResult.data,
      riskResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    ]
  );
}
