'use client';

import { useQuery } from '@tanstack/react-query';

import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/twapConstants';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { Blockchain, type TwapOnChainData } from '@/types/oracle';

import {
  type OnChainDataOptions,
  type OnChainDataReturn,
  ON_CHAIN_DATA_QUERY_OPTIONS,
} from './createOnChainDataHook';

export type { TwapOnChainData };

export type UseTwapOnChainDataReturn = OnChainDataReturn<TwapOnChainData>;

export function useTwapOnChainData(options: OnChainDataOptions): UseTwapOnChainDataReturn {
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
      const chainKey = chain || Blockchain.ETHEREUM;
      const chainId = BLOCKCHAIN_TO_CHAIN_ID[chainKey];
      if (!chainId) {
        throw new Error(`Unsupported chain for TWAP: ${chainKey}`);
      }
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
    ...ON_CHAIN_DATA_QUERY_OPTIONS,
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
