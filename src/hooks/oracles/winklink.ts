'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';

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

export interface DataSourceState<T = unknown> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export type WinklinkDataStates = Record<string, DataSourceState<unknown>> & {
  price: DataSourceState<
    ReturnType<WINkLinkClient['getPrice']> extends Promise<infer T> ? T : never
  >;
  historical: DataSourceState<
    ReturnType<WINkLinkClient['getHistoricalPrices']> extends Promise<infer T> ? T : never
  >;
  tron: DataSourceState<TRONEcosystem>;
  staking: DataSourceState<NodeStakingData>;
  gaming: DataSourceState<WINkLinkGamingData>;
  network: DataSourceState<
    ReturnType<WINkLinkClient['getNetworkStats']> extends Promise<infer T> ? T : never
  >;
  risk: DataSourceState<WINkLinkRiskMetrics>;
};

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
  const [dataLastUpdated, setDataLastUpdated] = useState<Record<string, Date | null>>({
    price: null,
    historical: null,
    tron: null,
    staking: null,
    gaming: null,
    network: null,
    risk: null,
  });

  const updateDataLastUpdated = useCallback((key: string) => {
    setDataLastUpdated((prev) => ({ ...prev, [key]: new Date() }));
  }, []);

  const results = useQueries({
    queries: [
      {
        queryKey: ['winklink', 'price', symbol, chain],
        queryFn: async () => {
          const result = await client.getPrice(symbol, chain);
          updateLastUpdated();
          updateDataLastUpdated('price');
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'historical', symbol, chain, 24],
        queryFn: async () => {
          const result = await client.getHistoricalPrices(symbol, chain, 24);
          updateDataLastUpdated('historical');
          return result;
        },
        enabled,
        refetchInterval: 300000,
      },
      {
        queryKey: ['winklink', 'tron'],
        queryFn: async () => {
          const result = await client.getTRONEcosystem();
          updateDataLastUpdated('tron');
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'staking'],
        queryFn: async () => {
          const result = await client.getNodeStaking();
          updateDataLastUpdated('staking');
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'gaming'],
        queryFn: async () => {
          const result = await client.getGamingData();
          updateDataLastUpdated('gaming');
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'network'],
        queryFn: async () => {
          const result = await client.getNetworkStats();
          updateDataLastUpdated('network');
          return result;
        },
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['winklink', 'risk'],
        queryFn: async () => {
          const result = await client.getRiskMetrics();
          updateDataLastUpdated('risk');
          return result;
        },
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

  useEffect(() => {
    const errors = results.filter((r) => r.isError && r.error);
    if (errors.length > 0) {
      console.group('[WINkLink] 数据加载错误');
      errors.forEach((result, index) => {
        const keys = ['price', 'historical', 'tron', 'staking', 'gaming', 'network', 'risk'];
        console.error(`[${keys[index]}] 加载失败:`, result.error);
      });
      console.groupEnd();
    }
  }, [results]);

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
  }, []);

  const createDataSourceState = <T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
    key: string,
    refetchFn: () => Promise<void>
  ): DataSourceState<T> => ({
    data: result.data as T | null,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error as Error | null,
    lastUpdated: dataLastUpdated[key],
    refetch: refetchFn,
  });

  const dataStates: WinklinkDataStates = useMemo(
    () =>
      ({
        price: createDataSourceState(priceResult, 'price', async () => {
          await priceResult.refetch();
          updateDataLastUpdated('price');
        }),
        historical: createDataSourceState(historicalResult, 'historical', async () => {
          await historicalResult.refetch();
          updateDataLastUpdated('historical');
        }),
        tron: createDataSourceState(tronResult, 'tron', async () => {
          await tronResult.refetch();
          updateDataLastUpdated('tron');
        }),
        staking: createDataSourceState(stakingResult, 'staking', async () => {
          await stakingResult.refetch();
          updateDataLastUpdated('staking');
        }),
        gaming: createDataSourceState(gamingResult, 'gaming', async () => {
          await gamingResult.refetch();
          updateDataLastUpdated('gaming');
        }),
        network: createDataSourceState(networkResult, 'network', async () => {
          await networkResult.refetch();
          updateDataLastUpdated('network');
        }),
        risk: createDataSourceState(riskResult, 'risk', async () => {
          await riskResult.refetch();
          updateDataLastUpdated('risk');
        }),
      }) as WinklinkDataStates,
    [
      priceResult,
      historicalResult,
      tronResult,
      stakingResult,
      gamingResult,
      networkResult,
      riskResult,
      dataLastUpdated,
      updateDataLastUpdated,
    ]
  );

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
      dataStates,
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
      dataStates,
    ]
  );
}
