'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  RedStoneClient,
  type RedStoneTokenOnChainData,
} from '@/lib/services/oracle/clients/redstone';

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

/**
 * 格式化涨跌金额显示
 */
export function formatChangeAmount(change: number | null | undefined): string {
  if (change === null || change === undefined || isNaN(change)) return '-';
  const sign = change >= 0 ? '+' : '';
  return `${sign}$${change.toFixed(2)}`;
}

/**
 * 格式化买卖价差显示
 */
export function formatSpread(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(price)) return '-';
  return `$${price.toFixed(4)}`;
}

/**
 * 格式化数据源提供商显示
 */
export function formatProvider(provider: string | null | undefined): string {
  if (!provider) return '-';
  // 简化提供商名称
  return provider.replace('redstone-', '').toUpperCase();
}
