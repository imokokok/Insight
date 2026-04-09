'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  getWINkLinkRealDataService,
  type WINkLinkTokenOnChainData,
} from '@/lib/oracles/winklinkRealDataService';

export interface UseWINkLinkOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export interface UseWINkLinkOnChainDataReturn {
  data: WINkLinkTokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string): string[] => {
  return ['winklink', 'onchain-data', symbol.toUpperCase()];
};

/**
 * 获取WINkLink预言机的代币链上数据
 * 包括Feed合约地址、精度、网络统计等与价格相关的数据
 */
export function useWINkLinkOnChainData(
  options: UseWINkLinkOnChainDataOptions
): UseWINkLinkOnChainDataReturn {
  const { symbol, enabled = true } = options;
  const winklinkService = useMemo(() => getWINkLinkRealDataService(), []);
  const queryKey = getQueryKey(symbol);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<WINkLinkTokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => winklinkService.getTokenOnChainData(symbol),
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
 * 格式化合约地址显示（缩短）
 */
export function formatContractAddress(address: string | null | undefined): string {
  if (!address) return '-';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 格式化TPS显示
 */
export function formatTPS(tps: number | null | undefined): string {
  if (tps === null || tps === undefined || isNaN(tps)) return '-';
  return `${tps.toFixed(1)}`;
}

/**
 * 格式化区块高度显示
 */
export function formatBlockHeight(height: number | null | undefined): string {
  if (height === null || height === undefined || isNaN(height)) return '-';
  if (height >= 1e6) {
    return `${(height / 1e6).toFixed(2)}M`;
  }
  if (height >= 1e3) {
    return `${(height / 1e3).toFixed(2)}K`;
  }
  return height.toLocaleString();
}
