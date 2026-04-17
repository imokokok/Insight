'use client';

import { useQuery } from '@tanstack/react-query';

import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/twapConstants';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import type { Blockchain } from '@/types/oracle';

export interface TwapOnChainData {
  poolAddress: string;
  feeTier: number;
  liquidity: string;
  twapInterval: number;
  twapPrice: number;
  spotPrice: number;
  priceDeviation: number;
  tick: number;
  sqrtPriceX96: string;
  confidence: number;
}

export interface UseTwapOnChainDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseTwapOnChainDataReturn {
  data: TwapOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTwapOnChainData(options: UseTwapOnChainDataOptions): UseTwapOnChainDataReturn {
  const { symbol, chain, enabled = true } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['twap-on-chain', symbol, chain],
    queryFn: async ({ signal }) => {
      const chainId = BLOCKCHAIN_TO_CHAIN_ID[chain || 'ethereum'] || 1;
      const twapData = await twapOnChainService.getTwapPrice(
        symbol.toUpperCase(),
        chainId,
        undefined,
        signal
      );
      const priceDeviation =
        twapData.spotPrice > 0
          ? Math.abs(twapData.twapPrice - twapData.spotPrice) / twapData.spotPrice
          : 0;
      return {
        poolAddress: twapData.poolAddress,
        feeTier: twapData.feeTier,
        liquidity: twapData.liquidity.toString(),
        twapInterval: twapData.twapInterval,
        twapPrice: twapData.twapPrice,
        spotPrice: twapData.spotPrice,
        priceDeviation,
        tick: twapData.tick,
        sqrtPriceX96: twapData.sqrtPriceX96.toString(),
        confidence: twapData.confidence,
      } as TwapOnChainData;
    },
    enabled: enabled && !!symbol,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
    retry: 2,
  });

  return {
    data: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: async () => {
      await queryRefetch();
    },
  };
}
