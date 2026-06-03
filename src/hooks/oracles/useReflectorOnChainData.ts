'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { REFLECTOR_ASSET_CONTRACT_MAP } from '@/lib/oracles/constants/reflectorConstants';
import { getReflectorDataService } from '@/lib/oracles/services/reflectorDataService';
import { type ReflectorTokenOnChainData } from '@/types/oracle';

interface UseReflectorOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export type { ReflectorTokenOnChainData };

export interface UseReflectorOnChainDataReturn {
  data: ReflectorTokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string): string[] => {
  return ['reflector', 'onchain-data', symbol.toUpperCase()];
};

export function useReflectorOnChainData(
  options: UseReflectorOnChainDataOptions
): UseReflectorOnChainDataReturn {
  const { symbol, enabled = true } = options;
  const service = useMemo(() => getReflectorDataService(), []);
  const queryKey = getQueryKey(symbol);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<ReflectorTokenOnChainData | null, Error>({
    queryKey,
    queryFn: async () => {
      const contractId = REFLECTOR_ASSET_CONTRACT_MAP[symbol.toUpperCase()];
      if (!contractId) {
        return null;
      }
      const [priceData, decimalsResult, resolution, version, assets, lastTimestamp] =
        await Promise.all([
          service.fetchLatestPrice(symbol),
          service.fetchDecimals(contractId),
          service.fetchResolution(contractId).catch(() => null),
          service.fetchVersion(contractId).catch(() => null),
          service.fetchAssets(),
          service.fetchLastTimestamp(contractId).catch(() => null),
        ]);

      if (!priceData) return null;

      return {
        symbol: priceData.symbol,
        price: priceData.price,
        decimals: decimalsResult.decimals,
        resolution: resolution ?? 300,
        version: version ?? 0,
        assets: assets ?? [],
        lastTimestamp: lastTimestamp ?? 0,
        nodeCount: 7,
        threshold: 4,
        baseAsset: 'USD',
        dataAge: priceData.timestamp ? Math.round((Date.now() - priceData.timestamp) / 1000) : null,
        lastUpdated: priceData.timestamp,
        source: 'SEP-40',
      };
    },
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
