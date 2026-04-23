'use client';

import { useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { REFLECTOR_ASSET_CONTRACT_MAP } from '@/lib/oracles/constants/reflectorConstants';
import { getReflectorDataService } from '@/lib/oracles/services/reflectorDataService';

interface UseReflectorOnChainDataOptions {
  symbol: string;
  enabled?: boolean;
}

export interface ReflectorTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  resolution: number;
  version: number;
  assets: string[];
  lastTimestamp: number;
  nodeCount: number;
  threshold: number;
  baseAsset: string;
  dataAge: number | null;
  lastUpdated: number;
  source: string;
}

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
      const [priceData, metadata] = await Promise.all([
        service.fetchLatestPrice(symbol),
        service.fetchOnChainMetadata(contractId),
      ]);

      if (!priceData) return null;

      return {
        symbol: priceData.symbol,
        price: priceData.price,
        decimals: metadata.decimals,
        resolution: metadata.resolution,
        version: metadata.version,
        assets: metadata.assets,
        lastTimestamp: metadata.lastTimestamp,
        nodeCount: metadata.nodeCount,
        threshold: metadata.threshold,
        baseAsset: metadata.baseAsset,
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
