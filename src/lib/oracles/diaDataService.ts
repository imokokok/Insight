import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('DIADataService');

const DIA_API_BASE_URL = 'https://api.diadata.org/v1';

const DIA_CHAIN_MAPPING: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: 'Ethereum',
  [Blockchain.ARBITRUM]: 'Arbitrum',
  [Blockchain.POLYGON]: 'Polygon',
  [Blockchain.AVALANCHE]: 'Avalanche',
  [Blockchain.BNB_CHAIN]: 'BinanceSmartChain',
  [Blockchain.BASE]: 'Base',
  [Blockchain.OPTIMISM]: 'Optimism',
  [Blockchain.FANTOM]: 'Fantom',
  [Blockchain.CRONOS]: 'Cronos',
  [Blockchain.MOONBEAM]: 'Moonbeam',
  [Blockchain.GNOSIS]: 'Gnosis',
  [Blockchain.KAVA]: 'Kava',
  [Blockchain.SOLANA]: 'Solana',
  [Blockchain.SUI]: 'Sui',
  [Blockchain.APTOS]: 'Aptos',
  [Blockchain.INJECTIVE]: 'Injective',
  [Blockchain.SEI]: 'Sei',
  [Blockchain.COSMOS]: 'Cosmos',
  [Blockchain.OSMOSIS]: 'Osmosis',
  [Blockchain.JUNO]: 'Juno',
  [Blockchain.CELESTIA]: 'Celestia',
  [Blockchain.TRON]: 'Tron',
  [Blockchain.TON]: 'Ton',
  [Blockchain.NEAR]: 'Near',
  [Blockchain.AURORA]: 'Aurora',
  [Blockchain.CELO]: 'Celo',
  [Blockchain.STARKNET]: 'Starknet',
  [Blockchain.BLAST]: 'Blast',
  [Blockchain.CARDANO]: 'Cardano',
  [Blockchain.POLKADOT]: 'Polkadot',
  [Blockchain.MANTLE]: 'Mantle',
  [Blockchain.LINEA]: 'Linea',
  [Blockchain.SCROLL]: 'Scroll',
  [Blockchain.ZKSYNC]: 'ZkSync',
  [Blockchain.STARKEX]: 'StarkEx',
};

const DIA_ASSET_ADDRESSES: Record<string, Partial<Record<Blockchain, string>>> = {
  DIA: {
    [Blockchain.ETHEREUM]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    [Blockchain.ARBITRUM]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    [Blockchain.POLYGON]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    [Blockchain.BASE]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
  },
  ETH: {
    [Blockchain.ETHEREUM]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [Blockchain.ARBITRUM]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [Blockchain.OPTIMISM]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [Blockchain.POLYGON]: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    [Blockchain.BASE]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  },
  BTC: {
    [Blockchain.ETHEREUM]: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    [Blockchain.ARBITRUM]: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    [Blockchain.OPTIMISM]: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  },
  USDC: {
    [Blockchain.ETHEREUM]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    [Blockchain.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    [Blockchain.OPTIMISM]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    [Blockchain.POLYGON]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    [Blockchain.AVALANCHE]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    [Blockchain.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  USDT: {
    [Blockchain.ETHEREUM]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    [Blockchain.ARBITRUM]: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    [Blockchain.OPTIMISM]: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    [Blockchain.POLYGON]: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  LINK: {
    [Blockchain.ETHEREUM]: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    [Blockchain.ARBITRUM]: '0xf97f4df25173781c2f0c0b8c1e9c0e8c0c0c0c0c',
    [Blockchain.POLYGON]: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
  },
};

const CACHE_TTL = {
  PRICE: 30000,
  HISTORICAL: 60000,
  NFT: 60000,
  SUPPLY: 300000,
  DIGITAL_ASSETS: 300000,
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface DIAAssetQuotation {
  Symbol: string;
  Name: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  Source: string;
}

interface DIANFTQuotation {
  Collection: string;
  FloorPrice: number;
  FloorPriceUSD: number;
  FloorPriceYesterday: number;
  VolumeYesterday: number;
  Time: string;
  Blockchain: string;
}

interface DIASupply {
  Symbol: string;
  Name: string;
  CirculatingSupply: number;
  TotalSupply: number;
  MaxSupply: number;
}

interface DIADigitalAsset {
  Asset: string;
  Name: string;
  Blockchain: string;
  Address: string;
  Decimals: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.baseDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`${operationName} failed (attempt ${attempt}/${config.maxAttempts})`, {
        error: lastError.message,
      });

      if (attempt < config.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
}

export class DIADataService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private static instance: DIADataService | null = null;

  constructor() {
    logger.info('DIADataService initialized', { baseUrl: DIA_API_BASE_URL });
  }

  static getInstance(): DIADataService {
    if (!DIADataService.instance) {
      DIADataService.instance = new DIADataService();
    }
    return DIADataService.instance;
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

  async getAssetPrice(symbol: string, chain?: Blockchain): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}:${chain || 'default'}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price', { symbol, chain });
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          let url: string;
          const upperSymbol = symbol.toUpperCase();

          if (chain && DIA_ASSET_ADDRESSES[upperSymbol]?.[chain]) {
            const address = DIA_ASSET_ADDRESSES[upperSymbol][chain];
            const blockchainName = DIA_CHAIN_MAPPING[chain];
            url = `${DIA_API_BASE_URL}/assetQuotation/${blockchainName}/${address}`;
          } else {
            url = `${DIA_API_BASE_URL}/assetQuotation/${upperSymbol}`;
          }

          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              logger.warn('Asset not found in DIA', { symbol, chain });
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: DIAAssetQuotation = await response.json();
          return this.parseAssetQuotation(data, chain);
        },
        DEFAULT_RETRY_CONFIG,
        'getAssetPrice'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get asset price',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return null;
    }
  }

  async getForexRate(symbol: string): Promise<PriceData | null> {
    const cacheKey = `forex:${symbol}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/forexQuotation/${symbol.toUpperCase()}`;
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          return this.parseForexQuotation(data);
        },
        DEFAULT_RETRY_CONFIG,
        'getForexRate'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get forex rate',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
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
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.json();
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

  async getSupply(symbol: string): Promise<DIASupply | null> {
    const cacheKey = `supply:${symbol}`;
    const cached = this.getFromCache<DIASupply>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/supply/${symbol.toUpperCase()}`;
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.json();
        },
        DEFAULT_RETRY_CONFIG,
        'getSupply'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.SUPPLY);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get supply data',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  async getDigitalAssets(): Promise<DIADigitalAsset[]> {
    const cacheKey = 'digitalAssets';
    const cached = this.getFromCache<DIADigitalAsset[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/digitalAssets`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.json();
        },
        DEFAULT_RETRY_CONFIG,
        'getDigitalAssets'
      );

      this.setCache(cacheKey, result, CACHE_TTL.DIGITAL_ASSETS);
      return result;
    } catch (error) {
      logger.error(
        'Failed to get digital assets',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    periodHours: number = 24
  ): Promise<PriceData[]> {
    const cacheKey = `historical:${symbol}:${chain || 'default'}:${periodHours}`;
    const cached = this.getFromCache<PriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const currentPriceData = await this.getAssetPrice(symbol, chain);
      if (!currentPriceData) {
        return [];
      }

      const result = this.generateSimulatedHistoricalPrices(currentPriceData, periodHours);

      this.setCache(cacheKey, result, CACHE_TTL.HISTORICAL);
      return result;
    } catch (error) {
      logger.error(
        'Failed to get historical prices',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain, periodHours }
      );
      return [];
    }
  }

  private generateSimulatedHistoricalPrices(
    currentPriceData: PriceData,
    periodHours: number
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const dataPoints = Math.min(periodHours * 4, 96);
    const intervalMs = (periodHours * 60 * 60 * 1000) / dataPoints;

    const annualVolatility = 0.35;
    const hoursPerYear = 365 * 24;
    const hourlyVolatility = annualVolatility / Math.sqrt(hoursPerYear);
    const drift = 0.0;

    const basePrice = currentPriceData.price;
    const priceHistory: number[] = new Array(dataPoints);
    priceHistory[dataPoints - 1] = basePrice;

    for (let i = dataPoints - 2; i >= 0; i--) {
      const randomShock = this.boxMullerRandom();
      const dt = 1;
      const logReturn =
        (drift - 0.5 * hourlyVolatility * hourlyVolatility) * dt +
        hourlyVolatility * Math.sqrt(dt) * randomShock;

      priceHistory[i] = priceHistory[i + 1] * Math.exp(-logReturn);
    }

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (dataPoints - 1 - i) * intervalMs;
      const price = priceHistory[i];
      const prevPrice = i > 0 ? priceHistory[i - 1] : price;
      const change24h = price - prevPrice;
      const change24hPercent = prevPrice > 0 ? (change24h / prevPrice) * 100 : 0;

      prices.push({
        provider: currentPriceData.provider,
        symbol: currentPriceData.symbol,
        price,
        timestamp,
        decimals: currentPriceData.decimals,
        confidence: currentPriceData.confidence ? currentPriceData.confidence * 0.95 : undefined,
        change24h,
        change24hPercent,
        chain: currentPriceData.chain,
        source: currentPriceData.source,
      });
    }

    return prices;
  }

  private boxMullerRandom(): number {
    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  private parseAssetQuotation(data: DIAAssetQuotation, chain?: Blockchain): PriceData {
    const price = data.Price;
    const priceYesterday = data.PriceYesterday || price;
    const change24h = price - priceYesterday;
    const change24hPercent = priceYesterday > 0 ? (change24h / priceYesterday) * 100 : 0;

    return {
      provider: OracleProvider.DIA,
      symbol: data.Symbol,
      price,
      timestamp: new Date(data.Time).getTime(),
      decimals: 8,
      confidence: 0.98,
      change24h,
      change24hPercent,
      chain,
      source: data.Source,
    };
  }

  private parseForexQuotation(data: { Symbol: string; Price: number; Time: string }): PriceData {
    return {
      provider: OracleProvider.DIA,
      symbol: data.Symbol,
      price: data.Price,
      timestamp: new Date(data.Time).getTime(),
      decimals: 6,
      confidence: 0.99,
      change24h: 0,
      change24hPercent: 0,
    };
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

export type { DIAAssetQuotation, DIANFTQuotation, DIASupply, DIADigitalAsset, RetryConfig };
