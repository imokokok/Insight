import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';

import { DIA_CHAIN_MAPPING } from './constants/chainMapping';
import { NFT_COLLECTIONS } from './constants/nftCollections';
import {
  DIA_API_BASE_URL,
  CACHE_TTL,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  fetchWithTimeout,
} from './diaUtils';

import type { CacheEntry } from './base';
import type { DIANFTQuotation, DIANFTCollection, DIANFTData } from './diaTypes';

const logger = createLogger('DIANFTService');

const REQUEST_TIMEOUT = 10000;

export class DIANFTService {
  constructor(private cache: Map<string, CacheEntry<unknown>>) {}

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  async getNFTFloorPrice(
    collectionAddress: string,
    chain: Blockchain = Blockchain.ETHEREUM
  ): Promise<DIANFTQuotation | null> {
    const cacheKey = `nft:${collectionAddress}:${chain}`;
    const cached = this.getFromCache<DIANFTQuotation>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const blockchainName = DIA_CHAIN_MAPPING[chain];
          const url = `${DIA_API_BASE_URL}/NFTQuotation/${blockchainName}/${collectionAddress}`;
          return fetchWithTimeout<DIANFTQuotation | null>(url, { timeout: REQUEST_TIMEOUT });
        },
        DEFAULT_RETRY_CONFIG,
        'getNFTFloorPrice'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.NFT);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get NFT floor price',
        error instanceof Error ? error : new Error(String(error)),
        { collectionAddress, chain }
      );
      return null;
    }
  }

  async getNFTData(): Promise<DIANFTData> {
    const cacheKey = 'nftData';
    const cached = this.getFromCache<DIANFTData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const results = await Promise.allSettled(
        NFT_COLLECTIONS.map(async (nft) => {
          const nftData = await this.getNFTFloorPrice(nft.address, nft.chain);
          return { nft, nftData };
        })
      );

      const collections: DIANFTCollection[] = [];

      for (const result of results) {
        if (result.status !== 'fulfilled') {
          logger.warn('Failed to fetch NFT data', { reason: result.reason });
          continue;
        }

        const { nft, nftData } = result.value;
        if (!nftData) continue;

        const floorPriceChange24h =
          nftData.FloorPriceYesterday > 0
            ? ((nftData.FloorPrice - nftData.FloorPriceYesterday) / nftData.FloorPriceYesterday) *
              100
            : 0;

        collections.push({
          id: `dia-nft-${nft.symbol.toLowerCase()}`,
          name: nft.name,
          symbol: nft.symbol,
          floorPrice: nftData.FloorPrice,
          floorPriceChange24h: Number(floorPriceChange24h.toFixed(2)),
          volume24h: nftData.VolumeYesterday || 0,
          totalSupply: 10000,
          chain: nft.chain,
          updateFrequency: 300,
          confidence: 0.95,
        });
      }

      if (collections.length === 0) {
        logger.warn('[DIA] No NFT data available from API');
        return {
          collections: [],
          totalCollections: 0,
          byChain: {},
          trending: [],
        };
      }

      const byChain: Partial<Record<Blockchain, number>> = {
        [Blockchain.ETHEREUM]: collections.filter((c) => c.chain === Blockchain.ETHEREUM).length,
        [Blockchain.POLYGON]: 0,
        [Blockchain.ARBITRUM]: 0,
      };

      const nftData: DIANFTData = {
        collections,
        totalCollections: collections.length,
        byChain,
        trending: collections.slice(0, 3),
      };

      this.setCache(cacheKey, nftData, CACHE_TTL.NFT);
      return nftData;
    } catch (error) {
      logger.error(
        'Failed to get NFT data from DIA API',
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        collections: [],
        totalCollections: 0,
        byChain: {},
        trending: [],
      };
    }
  }
}
