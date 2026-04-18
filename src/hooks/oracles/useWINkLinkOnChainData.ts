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
 * Get token on-chain data from WINkLink oracle
 * Including Feed contract address, precision, network statistics and other price-related data
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
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchInterval: 60000, // Auto-refresh every minute
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
