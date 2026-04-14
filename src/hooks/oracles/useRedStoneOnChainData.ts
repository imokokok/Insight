'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  RedStoneClient,
  type RedStoneTokenOnChainData,
} from '@/lib/oracles/clients/redstone';

export interface UseRedStoneOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export interface UseRedStoneOnChainDataReturn {
  data: RedStoneTokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string): string[] => {
  return ['redstone', 'onchain-data', symbol.toUpperCase()];
};

/**
 * 获取RedStone预言机的代币链上数据
 * 包括24h涨跌、买卖价差、数据源等与价格相关的数据
 */
export function useRedStoneOnChainData(
  options: UseRedStoneOnChainDataOptions
): UseRedStoneOnChainDataReturn {
  const { symbol, enabled = true } = options;
  const redstoneClient = useMemo(() => new RedStoneClient(), []);
  const queryKey = getQueryKey(symbol);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<RedStoneTokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => redstoneClient.getTokenOnChainData(symbol),
    enabled: enabled && !!symbol,
    staleTime: 60000, // 1分钟
    gcTime: 300000, // 5分钟
    refetchInterval: 60000, // 每分钟自动刷新
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    data: data || null,
    isLoading,
    isError,
    error: error || null,
    refetch,
  };
}
