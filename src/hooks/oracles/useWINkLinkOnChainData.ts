'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  getWINkLinkRealDataService,
  type WINkLinkTokenOnChainData,
} from '@/lib/oracles/services/winklinkRealDataService';

interface UseWINkLinkOnChainDataOptions {
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
