import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { DIA_API_BASE_URL } from '../diaUtils';

import { DIANetworkService } from './diaNetworkService';
import { DIANFTService } from './diaNFTService';
import { DIAPriceService } from './diaPriceService';

import type { CacheEntry } from '../base';
import type {
  DIANFTQuotation,
  DIASupply,
  DIADigitalAsset,
  DIAExchange,
  DIANetworkStatsData,
  DIAStakingData,
  DIANFTData,
  DIAEcosystemIntegration,
} from '../diaTypes';

const logger = createLogger('DIADataService');

// Token on-chain data aggregation interface
interface DIATokenOnChainDataInternal {
  symbol: string;
  price: number;
  change24hPercent: number;
  // Supply data
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  marketCap: number | null;
  // Exchange data
  exchangeCount: number;
  activeExchangeCount: number;
  totalTradingPairs: number;
  totalVolume24h: number;
  // Data freshness
  lastUpdated: number;
  dataSource: string;
}

class DIADataService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private static instance: DIADataService | null = null;
  private priceService: DIAPriceService;
  private nftService: DIANFTService;
  private networkService: DIANetworkService;

  constructor() {
    this.priceService = new DIAPriceService(this.cache);
    this.nftService = new DIANFTService(this.cache);
    this.networkService = new DIANetworkService(this.cache);
    logger.info('DIADataService initialized', { baseUrl: DIA_API_BASE_URL });
  }

  static getInstance(): DIADataService {
    if (!DIADataService.instance) {
      DIADataService.instance = new DIADataService();
    }
    return DIADataService.instance;
  }

  async getAssetPrice(
    symbol: string,
    chain?: Blockchain,
    signal?: AbortSignal
  ): Promise<PriceData | null> {
    return this.priceService.getAssetPrice(symbol, chain, signal);
  }

  async getForexRate(symbol: string): Promise<PriceData | null> {
    return this.priceService.getForexRate(symbol);
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    periodHours: number = 24
  ): Promise<PriceData[]> {
    return this.priceService.getHistoricalPrices(symbol, chain, periodHours);
  }

  async getNFTFloorPrice(
    collectionAddress: string,
    chain: Blockchain = Blockchain.ETHEREUM
  ): Promise<DIANFTQuotation | null> {
    return this.nftService.getNFTFloorPrice(collectionAddress, chain);
  }

  async getNFTData(): Promise<DIANFTData> {
    return this.nftService.getNFTData();
  }

  async getSupply(symbol: string): Promise<DIASupply | null> {
    return this.networkService.getSupply(symbol);
  }

  async getExchanges(): Promise<DIAExchange[]> {
    return this.networkService.getExchanges();
  }

  async getDigitalAssets(): Promise<DIADigitalAsset[]> {
    return this.networkService.getDigitalAssets();
  }

  async getNetworkStats(): Promise<DIANetworkStatsData | null> {
    return this.networkService.getNetworkStats();
  }

  async getStakingData(): Promise<DIAStakingData | null> {
    return this.networkService.getStakingData(this.getAssetPrice.bind(this));
  }

  async getEcosystemIntegrations(): Promise<DIAEcosystemIntegration[]> {
    return this.networkService.getEcosystemIntegrations();
  }

  /**
   * Get complete on-chain data for a token (supply + exchange data)
   * Used for statistics card display on the price query page
   */
  async getTokenOnChainData(
    symbol: string,
    chain?: Blockchain
  ): Promise<DIATokenOnChainDataInternal | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.getFromCache<DIATokenOnChainDataInternal>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch price, supply, and exchange data in parallel
      const [priceData, supplyData, exchanges] = await Promise.all([
        this.priceService.getAssetPrice(symbol, chain),
        this.networkService.getSupply(symbol),
        this.networkService.getExchanges(),
      ]);

      if (!priceData) {
        logger.warn('No price data available for token', { symbol });
        return null;
      }

      // Calculate exchange statistics
      const activeExchanges = exchanges.filter((e) => e.ScraperActive);
      const totalVolume24h = exchanges.reduce((sum, e) => sum + (e.Volume24h || 0), 0);
      const totalPairs = exchanges.reduce((sum, e) => sum + (e.Pairs || 0), 0);

      // Calculate market cap
      const marketCap =
        supplyData?.CirculatingSupply && priceData.price
          ? supplyData.CirculatingSupply * priceData.price
          : null;

      const onChainData: DIATokenOnChainDataInternal = {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        change24hPercent: priceData.change24hPercent || 0,
        circulatingSupply: supplyData?.CirculatingSupply || null,
        totalSupply: supplyData?.TotalSupply || null,
        maxSupply: supplyData?.MaxSupply || null,
        marketCap,
        exchangeCount: exchanges.length,
        activeExchangeCount: activeExchanges.length,
        totalTradingPairs: totalPairs,
        totalVolume24h,
        lastUpdated: priceData.timestamp,
        dataSource: priceData.source || 'DIA',
      };

      this.setCache(cacheKey, onChainData, 60000); // 1-minute cache
      logger.info('Successfully fetched token on-chain data', {
        symbol,
        price: onChainData.price,
        marketCap: onChainData.marketCap,
        exchangeCount: onChainData.exchangeCount,
      });

      return onChainData;
    } catch (error) {
      logger.error(
        'Failed to get token on-chain data',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

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

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export function getDIADataService(): DIADataService {
  return DIADataService.getInstance();
}

function resetDIADataService(): void {
  const instance = DIADataService.getInstance();
  instance.clearCache();
}

// Re-export on-chain data interface
export type DIATokenOnChainData = DIATokenOnChainDataInternal;
