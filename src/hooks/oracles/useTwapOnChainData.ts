'use client';

import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/twapConstants';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { Blockchain, type TwapOnChainData } from '@/types/oracle';

import { createOnChainDataHook, type OnChainDataReturn } from './createOnChainDataHook';

export type { TwapOnChainData };

export type UseTwapOnChainDataReturn = OnChainDataReturn<TwapOnChainData>;

export const useTwapOnChainData = createOnChainDataHook<TwapOnChainData>(
  'twap',
  async (symbol: string, chain: Blockchain | undefined, signal?: AbortSignal) => {
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
  }
);
