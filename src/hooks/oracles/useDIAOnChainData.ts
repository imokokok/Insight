'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getDIADataService, type DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import type { Blockchain } from '@/types/oracle';

interface UseDIAOnChainDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseDIAOnChainDataReturn {
  data: DIATokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string, chain?: Blockchain): string[] => {
  return ['dia', 'onchain-data', symbol.toUpperCase(), chain || 'default'];
};

/**
 * Get token on-chain data from DIA oracle
 * Including supply, market cap, exchange count and other real on-chain data
 */
export function useDIAOnChainData(options: UseDIAOnChainDataOptions): UseDIAOnChainDataReturn {
  const { symbol, chain, enabled = true } = options;
  const diaService = useMemo(() => getDIADataService(), []);
  const queryKey = getQueryKey(symbol, chain);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<DIATokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => diaService.getTokenOnChainData(symbol, chain),
    enabled: enabled && !!symbol,
    staleTime: 0,
    gcTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
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
