import { PriceDataSchema } from '@/lib/security/validation';
import { validateOracleData, safeValidateOracleData } from '@/lib/validation/oracleValidation';
import {
  type OracleProvider,
  type Blockchain,
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

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class OracleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private accessOrder: string[] = [];
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    while (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.findOldestExpiredEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.removeFromAccessOrder(oldestKey);
      } else {
        const firstKey = this.accessOrder.shift();
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    this.accessOrder.push(key);
  }

  delete(key: string): boolean {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stopCleanupInterval();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
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
      this.removeFromAccessOrder(key);
      cleaned++;
    }

    return cleaned;
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private findOldestExpiredEntry(): string | null {
    const now = Date.now();
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl && entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
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
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData[]>;
  abstract getSupportedSymbols(): string[];

  defaultUpdateIntervalMinutes: number = 1;
  chainUpdateIntervals: Partial<Record<Blockchain, number>> = {};

  protected config: OracleClientConfig;

  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
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
