import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { DIANetworkService } from './diaNetworkService';
import { DIANFTService } from './diaNFTService';
import { DIAPriceService } from './diaPriceService';
import { DIA_API_BASE_URL } from './diaUtils';

import type {
  CacheEntry,
  DIANFTQuotation,
  DIASupply,
  DIADigitalAsset,
  DIAExchange,
  DIANetworkStatsData,
  DIAStakingData,
  DIANFTData,
  DIAEcosystemIntegration,
} from './diaTypes';

const logger = createLogger('DIADataService');

export class DIADataService {
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

  async getAssetPrice(symbol: string, chain?: Blockchain): Promise<PriceData | null> {
    return this.priceService.getAssetPrice(symbol, chain);
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

export function resetDIADataService(): void {
  const instance = DIADataService.getInstance();
  instance.clearCache();
}

export type {
  DIAAssetQuotation,
  DIANFTQuotation,
  DIASupply,
  DIADigitalAsset,
  DIAExchange,
  DIANetworkStatsData,
  DIAStakingData,
  DIANFTCollection,
  DIANFTData,
  DIAEcosystemIntegration,
  RetryConfig,
} from './diaTypes';
