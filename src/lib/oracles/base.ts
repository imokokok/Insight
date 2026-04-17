import { PriceDataSchema } from '@/lib/security/validation';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { validateOracleData, safeValidateOracleData } from '@/lib/validation/oracleValidation';
import {
  type OracleProvider,
  Blockchain,
  type PriceData,
  OracleError,
  type OracleErrorCode,
} from '@/types/oracle';

import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from './base/databaseOperations';
import { shouldUseDatabase, configureStorage, getStorageConfig } from './utils/storage';

import type { OracleStorageConfig } from './utils/storage';

export { shouldUseDatabase, configureStorage, getStorageConfig };
export type { OracleStorageConfig };

export const ORACLE_CACHE_TTL = {
  PRICE: 30000,
  HISTORICAL: 60000,
  NETWORK_STATS: 120000,
  PROVIDERS: 60000,
  NFT: 60000,
  SUPPLY: 300000,
  ECOSYSTEM: 600000,
} as const;

export const MAX_CACHE_SIZE = 1000;

export type OracleCacheTTLKey = keyof typeof ORACLE_CACHE_TTL;

export interface OracleCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/** @deprecated Use OracleCacheEntry instead */
export type CacheEntry<T> = OracleCacheEntry<T>;

export class OracleCache {
  private cache: Map<string, OracleCacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as OracleCacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    while (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stopCleanupInterval();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      cleaned++;
    }

    return cleaned;
  }
}

export const OracleErrorCodes = {
  SYMBOL_NOT_SUPPORTED: 'SYMBOL_NOT_SUPPORTED' as OracleErrorCode,
  NO_DATA_AVAILABLE: 'NO_DATA_AVAILABLE' as OracleErrorCode,
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE' as OracleErrorCode,
  NETWORK_ERROR: 'NETWORK_ERROR' as OracleErrorCode,
  TIMEOUT_ERROR: 'TIMEOUT_ERROR' as OracleErrorCode,
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR' as OracleErrorCode,
  INVALID_RESPONSE: 'INVALID_RESPONSE' as OracleErrorCode,
  STALE_DATA: 'STALE_DATA' as OracleErrorCode,
  INVALID_PRICE: 'INVALID_PRICE' as OracleErrorCode,
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA' as OracleErrorCode,
} as const;

export type OracleErrorCodeType = (typeof OracleErrorCodes)[keyof typeof OracleErrorCodes];

export interface OracleClientConfig {
  useDatabase?: boolean;
  validateData?: boolean;
  useRealData?: boolean;
}

const DEFAULT_CLIENT_CONFIG: OracleClientConfig = {
  useDatabase: true,
  validateData: true,
};

export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData>;
  abstract getSupportedSymbols(): string[];

  defaultUpdateIntervalMinutes: number = 1;
  chainUpdateIntervals: Partial<Record<Blockchain, number>> = {};

  protected historicalPriceConfidence: number = 0.95;
  protected defaultChain: Blockchain = Blockchain.ETHEREUM;

  protected config: OracleClientConfig;

  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
  }

  protected getHistoricalPriceConfidence(_chain?: Blockchain): number {
    return this.historicalPriceConfidence;
  }

  protected onNoHistoricalData(_symbol: string): PriceData[] {
    return [];
  }

  protected onHistoricalDataError(_symbol: string, _error: unknown): PriceData[] {
    return [];
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    if (options?.signal?.aborted) {
      return [];
    }

    try {
      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(
        symbol,
        period
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        return this.onNoHistoricalData(symbol);
      }

      const targetChain = chain || this.defaultChain;
      const latestPrice = historicalPrices[historicalPrices.length - 1].price;
      const confidence = this.getHistoricalPriceConfidence(targetChain);

      return historicalPrices.map((point) => {
        const change24h = latestPrice - point.price;
        const change24hPercent = point.price > 0 ? (change24h / point.price) * 100 : 0;

        return {
          provider: this.name,
          chain: targetChain,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          source: 'binance-api',
        };
      });
    } catch (error) {
      return this.onHistoricalDataError(symbol, error);
    }
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const supportedSymbols = this.getSupportedSymbols();
    const isSymbolInList = supportedSymbols.includes(symbol);

    if (!isSymbolInList) {
      return false;
    }

    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }

    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }

  getUpdateInterval(chain?: Blockchain): number {
    if (chain && this.chainUpdateIntervals[chain] !== undefined) {
      return this.chainUpdateIntervals[chain]!;
    }
    return this.defaultUpdateIntervalMinutes;
  }

  protected createError(
    message: string,
    code?: OracleErrorCode,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
    }
  ): OracleError {
    return new OracleError(message, this.name, code, options);
  }

  protected createUnsupportedSymbolError(symbol: string, chain?: Blockchain): OracleError {
    return this.createError(
      `Symbol '${symbol}' is not supported${chain ? ` on chain '${chain}'` : ''} by ${this.name}`,
      OracleErrorCodes.SYMBOL_NOT_SUPPORTED,
      {
        retryable: false,
        details: {
          symbol,
          chain,
          supportedSymbols: this.getSupportedSymbols(),
          supportedChains: this.supportedChains,
        },
      }
    );
  }

  protected createNoDataError(symbol: string, chain?: Blockchain, reason?: string): OracleError {
    return this.createError(
      `No data available for symbol '${symbol}'${chain ? ` on chain '${chain}'` : ''}${reason ? `: ${reason}` : ''}`,
      OracleErrorCodes.NO_DATA_AVAILABLE,
      {
        retryable: true,
        details: {
          symbol,
          chain,
          reason,
        },
      }
    );
  }

  protected createProviderError(
    reason: string,
    originalError?: Error | unknown,
    options?: {
      retryable?: boolean;
      code?: OracleErrorCode;
    }
  ): OracleError {
    return this.createError(
      `Provider ${this.name} error: ${reason}`,
      options?.code ?? OracleErrorCodes.PROVIDER_UNAVAILABLE,
      {
        retryable: options?.retryable ?? true,
        details: {
          reason,
          originalError:
            originalError instanceof Error
              ? {
                  name: originalError.name,
                  message: originalError.message,
                  stack: originalError.stack,
                }
              : originalError,
        },
      }
    );
  }

  protected validatePriceData(data: unknown, context?: string): PriceData {
    if (!this.config.validateData) {
      return data as PriceData;
    }
    return validateOracleData(PriceDataSchema, data, context) as PriceData;
  }

  protected safeValidatePriceData(data: unknown, context?: string): PriceData | null {
    if (!this.config.validateData) {
      return data as PriceData;
    }
    return safeValidateOracleData(PriceDataSchema, data, context) as PriceData | null;
  }

  protected validatePriceDataArray(data: unknown[], context?: string): PriceData[] {
    if (!this.config.validateData) {
      return data as PriceData[];
    }
    return data.map((item, index) =>
      this.validatePriceData(item, context ? `${context}[${index}]` : `[${index}]`)
    );
  }

  /** @deprecated Use OracleRepository.fetchPrice() instead */
  async fetchPriceWithDatabase(symbol: string, chain: Blockchain | undefined): Promise<PriceData> {
    return fetchPriceWithDatabase(this.name, symbol, chain, this.config.useDatabase ?? true);
  }

  /** @deprecated Use OracleRepository.fetchHistoricalPrices() instead */
  async fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    period: number
  ): Promise<PriceData[]> {
    return fetchHistoricalPricesWithDatabase(
      this.name,
      symbol,
      chain,
      period,
      this.config.useDatabase ?? true
    );
  }
}
