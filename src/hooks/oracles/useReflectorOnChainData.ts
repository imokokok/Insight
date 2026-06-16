'use client';

import { REFLECTOR_ASSET_CONTRACT_MAP } from '@/lib/oracles/constants/reflectorConstants';
import { getReflectorDataService } from '@/lib/oracles/services/reflectorDataService';
import { type Blockchain, type ReflectorTokenOnChainData } from '@/types/oracle';

import { createOnChainDataHookFromQueryFn, type OnChainDataReturn } from './createOnChainDataHook';

export type { ReflectorTokenOnChainData };

export type UseReflectorOnChainDataReturn = OnChainDataReturn<ReflectorTokenOnChainData>;

export const useReflectorOnChainData = createOnChainDataHookFromQueryFn<ReflectorTokenOnChainData>(
  'reflector',
  async (symbol: string, _chain?: Blockchain) => {
    const contractId = REFLECTOR_ASSET_CONTRACT_MAP[symbol.toUpperCase()];
    if (!contractId) {
      return null;
    }
    const service = getReflectorDataService();
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
  }
);
