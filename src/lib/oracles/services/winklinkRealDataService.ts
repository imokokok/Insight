import { TRON_CONFIG } from '@/lib/config/serverEnv';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { withOracleRetry } from '../utils/retry';

import type { CacheEntry } from '../base';

const logger = createLogger('WINkLinkRealDataService');

const TRON_RPC_ENDPOINTS = [
  TRON_CONFIG.rpcUrl,
  'https://api.trongrid.io',
  'https://nile.trongrid.io',
].filter((url, index, self) => url && self.indexOf(url) === index);

const TRONGRID_API_KEY = TRON_CONFIG.apiKey;

const WINKLINK_PRICE_FEEDS: Record<string, string> = {
  'BTC-USD': 'TQoijQ1iZKRgJsAAWNPMu6amgtCJ3WMUV7',
  'ETH-USD': 'TR2yWYWovJaSM7TfZq7L7sT7ZRugdJJQmL',
  'TRX-USD': 'TR5HtpPK4gX4RFC4DCBUHfFgsGkGFEzSAb',
  'USDT-USD': 'TKePc46n5CiUCR8LL788TFeKA4kjvNnuem',
  'USDC-USD': 'TNu3zS55MP4KnBBP6Maw1nHSzRpc3CXAxm',
  'USDD-USD': 'TJ7jEgoYVaeymVfYZ3bS57dYArwVDS1mhW',
  'WIN-USD': 'TSCef3LT3jpLwwXCWhZe3hZoMsYk1ZLif2',
  'BTT-USD': 'TBAAW545oJ6iTxqzezGvagrSUzCpz1S8eR',
  'JST-USD': 'TE5rKoDzKmpVAQp1sn7x6V8biivR3d5r47',
  'SUN-USD': 'TRMgzSPsuWEcVpd5hv19XtLeCk8Z799sZa',
  'LTC-USD': 'TGxGL85kN3W5sGdBiobgWabWFcMEtoqRJJ',
  'NFT-USD': 'TEC8b2oL6sAQFMiea73tTgjtTLwyV1GuZU',
  'TUSD-USD': 'TBc3yBP8xcyQ1E3hDTUhRxToMrgekLH2kh',
  'USDJ-USD': 'TB1MyT7pDCNg8w7cSW1QvYKs4WPzErzP5k',
  'WBTC-USD': 'TCYS6aj9shB6rZNpTCqSkN1aTwkSnz1wHq',
};

export interface WINkLinkTokenOnChainData {
  symbol: string;
  price: number;
  feedContractAddress: string | null;
  decimals: number | null;
  dataFeedsCount: number;
  activeNodes: number | null;
  nodeUptime: number;
  avgResponseTime: number;
  lastUpdated: number;
  priceUpdateTime: number | null;
  dataSource: string;
}

class WINkLinkRealDataService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private static instance: WINkLinkRealDataService | null = null;
  private readonly maxCacheSize = 1000;
  private readonly defaultCacheTTL = 5 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    logger.info('WINkLinkRealDataService initialized', { rpcUrl: TRON_RPC_ENDPOINTS[0] });
    this.startCleanupInterval();
  }

  static getInstance(): WINkLinkRealDataService {
    if (!WINkLinkRealDataService.instance) {
      WINkLinkRealDataService.instance = new WINkLinkRealDataService();
    }
    return WINkLinkRealDataService.instance;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`, { remaining: this.cache.size });
    }
  }

  private enforceCacheLimit(): void {
    if (this.cache.size >= this.maxCacheSize) {
      const entriesToDelete = Math.ceil(this.maxCacheSize * 0.2);
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < entriesToDelete && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
      logger.warn(`Cache limit reached, removed ${entriesToDelete} oldest entries`);
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
    this.enforceCacheLimit();
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultCacheTTL,
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    logger.info('WINkLinkRealDataService destroyed');
  }

  private parseHexToBigInt(hex: string | null | undefined): bigint | null {
    if (!hex || typeof hex !== 'string') return null;

    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      logger.warn('Invalid hex string', { hex });
      return null;
    }

    try {
      return BigInt('0x' + cleanHex);
    } catch {
      return null;
    }
  }

  async getPriceFromContract(
    symbol: string,
    chain?: string,
    signal?: AbortSignal
  ): Promise<PriceData | null> {
    const cacheKey = `real-price:${symbol}${chain ? `:${chain}` : ''}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    if (signal?.aborted) {
      return null;
    }

    try {
      const normalizedSymbol = symbol.toUpperCase().replace('/', '-');
      const pairKey = normalizedSymbol.includes('-') ? normalizedSymbol : `${normalizedSymbol}-USD`;
      const contractAddress = WINKLINK_PRICE_FEEDS[pairKey];

      if (!contractAddress) {
        logger.warn('No WINkLink price feed found for symbol', {
          symbol,
          normalizedSymbol,
          pairKey,
          availablePairs: Object.keys(WINKLINK_PRICE_FEEDS),
        });
        return null;
      }

      logger.info('Fetching price from WINkLink contract', { symbol, pairKey, contractAddress });

      const [decimalsResult, answerResult, timestampResult] = await Promise.allSettled([
        this.callContractMethodWithRetry(contractAddress, 'decimals', 3, signal),
        this.callContractMethodWithRetry(contractAddress, 'latestAnswer', 3, signal),
        this.callContractMethodWithRetry(contractAddress, 'latestTimestamp', 3, signal),
      ]);

      const decimals = decimalsResult.status === 'fulfilled' ? decimalsResult.value : null;
      const latestAnswer = answerResult.status === 'fulfilled' ? answerResult.value : null;
      const latestTimestamp = timestampResult.status === 'fulfilled' ? timestampResult.value : null;

      logger.info('Raw contract data', { symbol, latestAnswer, decimals, latestTimestamp });

      if (!latestAnswer || !decimals) {
        logger.warn('Invalid price data from WINkLink contract', {
          symbol,
          latestAnswer,
          decimals,
        });
        return null;
      }

      const decimalPlaces = this.parseHexToBigInt(decimals);
      const priceRaw = this.parseHexToBigInt(latestAnswer);
      const timestampRaw = this.parseHexToBigInt(latestTimestamp);

      if (!decimalPlaces || !priceRaw) {
        logger.warn('Failed to parse price data', { symbol, decimals, latestAnswer });
        return null;
      }

      const decPlaces = Number(decimalPlaces);
      const rawStr = priceRaw.toString();
      const isNegative = rawStr.startsWith('-');
      const absStr = isNegative ? rawStr.slice(1) : rawStr;
      let priceValue: number;
      if (absStr.length > decPlaces) {
        const intPart = absStr.slice(0, absStr.length - decPlaces) || '0';
        const decPart = absStr.slice(absStr.length - decPlaces);
        priceValue = parseFloat(`${intPart}.${decPart}`);
      } else {
        const paddedDec = absStr.padStart(decPlaces, '0');
        priceValue = parseFloat(`0.${paddedDec}`);
      }
      if (isNegative) {
        priceValue = -priceValue;
      }

      const timestamp = timestampRaw ? Number(timestampRaw) * 1000 : Date.now();

      logger.info('Parsed price data', {
        symbol,
        priceValue,
        decimalPlaces: Number(decimalPlaces),
        timestamp,
      });

      if (priceValue <= 0) {
        logger.warn('Invalid price value from WINkLink contract', {
          symbol,
          priceValue,
          decimalPlaces: decPlaces,
        });
        return null;
      }

      const priceData: PriceData = {
        provider: OracleProvider.WINKLINK,
        symbol: symbol.toUpperCase(),
        price: priceValue,
        timestamp: timestamp || Date.now(),
        decimals: Number(decimalPlaces),
        confidence: 0.98,
        change24h: 0,
        change24hPercent: 0,
        chain: Blockchain.TRON,
        source: `WINkLink:${contractAddress}`,
      };

      this.setCache(cacheKey, priceData, 30000);
      logger.info('Successfully fetched price from WINkLink', { symbol, price: priceValue });
      return priceData;
    } catch (error) {
      logger.error(
        'Failed to get price from WINkLink contract',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    periodHours: number = 24
  ): Promise<Array<{ price: number; timestamp: number }>> {
    const cacheKey = `historical:${symbol}:${periodHours}`;
    const cached = this.getFromCache<Array<{ price: number; timestamp: number }>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { binanceMarketService } =
        await import('@/lib/services/marketData/binanceMarketService');

      const historicalPrices = await binanceMarketService.getHistoricalPrices(
        symbol,
        Math.max(1, Math.ceil(periodHours / 24))
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.warn(`No historical data available for ${symbol} from Binance`);
        return [];
      }

      logger.info('Using Binance historical data for WINkLink', {
        symbol,
        points: historicalPrices.length,
        periodHours,
      });

      const dataPoints = historicalPrices.map((point) => ({
        price: point.price,
        timestamp: point.timestamp,
      }));

      this.setCache(cacheKey, dataPoints, 5 * 60 * 1000);
      return dataPoints;
    } catch (error) {
      logger.error(
        'Failed to get historical prices',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, periodHours }
      );
      return [];
    }
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { signal?: AbortSignal },
    timeoutMs: number = 15000
  ): Promise<Response> {
    const externalSignal = options.signal;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = externalSignal ? () => controller.abort() : null;
    if (onAbort && externalSignal) {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      const { signal: _externalSignal, ...fetchOptions } = options;
      return await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      if (onAbort && externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  private async callContractMethodWithRetry(
    contractAddress: string,
    method: string,
    maxRetries: number = 3,
    signal?: AbortSignal
  ): Promise<string | null> {
    try {
      return await withOracleRetry(
        async () => {
          if (signal?.aborted) {
            throw new Error(`Request aborted for method ${method}`);
          }
          const result = await this.callContractMethod(contractAddress, method, signal);
          if (result === null) {
            throw new Error(`Contract method ${method} returned null`);
          }
          return result;
        },
        `callContractMethod:${method}`,
        {
          maxAttempts: maxRetries,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          timeout: 15000,
        }
      );
    } catch {
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (TRONGRID_API_KEY) {
      headers['TRON-PRO-API-KEY'] = TRONGRID_API_KEY;
    }

    return headers;
  }

  private async callContractMethod(
    contractAddress: string,
    method: string,
    signal?: AbortSignal
  ): Promise<string | null> {
    let lastError: Error | null = null;

    for (const rpcUrl of TRON_RPC_ENDPOINTS) {
      if (signal?.aborted) {
        return null;
      }

      try {
        const functionSelector = this.getFunctionSelector(method);

        if (!functionSelector) {
          logger.warn(`Unknown method: ${method}`);
          return null;
        }

        const url = `${rpcUrl}/wallet/triggerconstantcontract`;
        const body = {
          owner_address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
          contract_address: contractAddress,
          function_selector: functionSelector,
          parameter: '',
          visible: true,
        };

        logger.debug(`Calling TRON contract`, { url, contractAddress, method, functionSelector });

        const response = await this.fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
            signal,
          },
          15000
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          lastError = new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          logger.warn(`TRON RPC ${rpcUrl} failed`, { method, status: response.status });
          continue;
        }

        const data = await response.json();
        logger.debug(`TRON contract response`, { method, data });

        if (data.result && data.result.result === true) {
          const hexValue = data.constant_result?.[0];
          if (hexValue && hexValue !== '0x') {
            return hexValue;
          }
        }

        if (data.result && data.result.message) {
          const errorMessage = Buffer.from(data.result.message, 'hex').toString('utf8');
          logger.warn(`TRON contract call failed`, { method, error: errorMessage, rpcUrl });
        }

        lastError = new Error(`Contract call returned no result for ${method}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (signal?.aborted) {
          return null;
        }

        logger.warn(`TRON RPC ${rpcUrl} failed for method ${method}`, {
          error: lastError.message,
        });
      }
    }

    if (lastError) {
      logger.error(`All TRON RPC endpoints failed for method ${method}`, lastError, {
        contractAddress,
      });
    }
    return null;
  }

  private getFunctionSelector(method: string): string {
    const selectors: Record<string, string> = {
      latestAnswer: 'latestAnswer()',
      latestTimestamp: 'latestTimestamp()',
      latestRound: 'latestRound()',
      decimals: 'decimals()',
      description: 'description()',
    };
    return selectors[method] || `${method}()`;
  }

  getSupportedPriceFeeds(): Array<{ symbol: string; address: string }> {
    return Object.entries(WINKLINK_PRICE_FEEDS).map(([symbol, address]) => ({
      symbol: symbol.replace('-', '/'),
      address,
    }));
  }

  isSupported(symbol: string): boolean {
    const pairKey = symbol.toUpperCase().replace('/', '-');
    return pairKey in WINKLINK_PRICE_FEEDS;
  }

  async getTokenOnChainData(symbol: string): Promise<WINkLinkTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.getFromCache<WINkLinkTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const priceData = await this.getPriceFromContract(symbol);
      const responseTime = Date.now() - startTime;

      if (!priceData) {
        logger.warn('No price data available for token', { symbol });
        return null;
      }

      const normalizedSymbol = symbol.toUpperCase().replace('/', '-');
      const pairKey = normalizedSymbol.includes('-') ? normalizedSymbol : `${normalizedSymbol}-USD`;
      const feedContractAddress = WINKLINK_PRICE_FEEDS[pairKey] || null;

      const now = Date.now();
      const priceAge = priceData.timestamp ? Math.round((now - priceData.timestamp) / 1000) : null;

      // Calculate node availability based on price update freshness
      // WINkLink is expected to update prices every 30 seconds
      // If price age is within 60 seconds, node availability is 99.9%
      // If price age is within 120 seconds, node availability is 99.5%
      // If price age is within 300 seconds, node availability is 99.0%
      // If price age exceeds 300 seconds, node availability is 98.0%
      let nodeUptime: number;
      if (priceAge === null) {
        nodeUptime = 99.0;
      } else if (priceAge <= 60) {
        nodeUptime = 99.9;
      } else if (priceAge <= 120) {
        nodeUptime = 99.5;
      } else if (priceAge <= 300) {
        nodeUptime = 99.0;
      } else {
        nodeUptime = 98.0;
      }

      const onChainData: WINkLinkTokenOnChainData = {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        feedContractAddress,
        decimals: priceData.decimals || null,
        dataFeedsCount: Object.keys(WINKLINK_PRICE_FEEDS).length,
        activeNodes: null,
        nodeUptime,
        avgResponseTime: responseTime,
        lastUpdated: priceData.timestamp,
        priceUpdateTime: priceAge,
        dataSource: priceData.source || 'WINkLink',
      };

      this.setCache(cacheKey, onChainData, 60000);
      logger.info('Successfully fetched WINkLink token on-chain data', {
        symbol,
        price: onChainData.price,
        feedContractAddress: onChainData.feedContractAddress,
        responseTime,
        priceAge,
        nodeUptime,
      });

      return onChainData;
    } catch (error) {
      logger.error(
        'Failed to get WINkLink token on-chain data',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

export function getWINkLinkRealDataService(): WINkLinkRealDataService {
  return WINkLinkRealDataService.getInstance();
}
