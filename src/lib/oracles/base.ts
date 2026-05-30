import {
  PriceDataSchema,
  validateOracleData,
  safeValidateOracleData,
} from '@/lib/security/validation';
import { TTLCache, type CacheEntry } from '@/lib/utils/cache';
import { createLogger } from '@/lib/utils/logger';
import {
  type OracleProvider,
  Blockchain,
  type PriceData,
  OracleServiceError,
  type OracleErrorCode,
} from '@/types/oracle';

import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from './base/databaseOperations';

const logger = createLogger('BaseOracleClient');

export const ORACLE_CACHE_TTL = {
  PRICE: 30000,
  HISTORICAL: 60000,
  NETWORK_STATS: 120000,
  PROVIDERS: 60000,
} as const;

export const MAX_CACHE_SIZE = 1000;

export type OracleCacheEntry<T> = CacheEntry<T>;

export class OracleCache {
  private impl: TTLCache;

  constructor() {
    this.impl = new TTLCache({ maxSize: MAX_CACHE_SIZE, cleanupIntervalMs: 60000 });
  }

  get<T>(key: string): T | null {
    return this.impl.get<T>(key);
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.impl.set(key, data, ttl);
  }

  delete(key: string): boolean {
    return this.impl.delete(key);
  }

  clear(): void {
    this.impl.clear();
  }

  destroy(): void {
    this.impl.destroy();
  }

  has(key: string): boolean {
    return this.impl.has(key);
  }

  size(): number {
    return this.impl.size;
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.impl.size,
      keys: this.impl.keys(),
    };
  }

  startCleanupInterval(): void {
    this.impl.startCleanupInterval();
  }

  stopCleanupInterval(): void {
    this.impl.stopCleanupInterval();
  }

  cleanup(): number {
    return 0;
  }
}

export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | null = null;
  return () => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

const OracleErrorCodes = {
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

  protected supportedSymbolsList: readonly string[] = [];

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
    _symbol: string,
    _chain?: Blockchain,
    _period: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    return [];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    const supportedSymbols = this.getSupportedSymbols();
    const isSymbolInList = supportedSymbols.some((s) => s.toUpperCase() === upperSymbol);

    if (!isSymbolInList) {
      return false;
    }

    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }

    return true;
  }

  getSupportedSymbols(): string[] {
    return [...this.supportedSymbolsList];
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

  protected validateGetPriceParams(symbol: string, options?: { signal?: AbortSignal }): void {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }
    if (options?.signal?.aborted) {
      throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
    }
  }

  protected handleGetPriceError(error: unknown, providerLabel: string, errorCode?: string): never {
    if (error instanceof OracleServiceError) throw error;
    if (error && typeof error === 'object' && 'code' in error) throw error;
    throw this.createError(
      error instanceof Error ? error.message : `Failed to fetch price from ${providerLabel}`,
      (errorCode || 'PROVIDER_ERROR') as OracleErrorCode
    );
  }

  protected createError(
    message: string,
    code?: OracleErrorCode,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
    }
  ): OracleServiceError {
    return new OracleServiceError(message, this.name, code, options);
  }

  protected createUnsupportedSymbolError(symbol: string, chain?: Blockchain): OracleServiceError {
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

  protected createNoDataError(
    symbol: string,
    chain?: Blockchain,
    reason?: string
  ): OracleServiceError {
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
  ): OracleServiceError {
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
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Price data validation is disabled - skipping validation', { context });
      }
      return data as PriceData;
    }
    return validateOracleData(PriceDataSchema, data, context) as PriceData;
  }

  protected safeValidatePriceData(data: unknown, context?: string): PriceData | null {
    if (!this.config.validateData) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Price data validation is disabled - skipping validation', { context });
      }
      return data as PriceData;
    }
    const result = safeValidateOracleData(PriceDataSchema, data, context);
    if (!result.ok && process.env.NODE_ENV === 'development') {
      logger.warn('Price data validation failed silently', { context, error: result.error });
    }
    return result.ok ? result.data : null;
  }

  protected validatePriceDataArray(data: unknown[], context?: string): PriceData[] {
    if (!this.config.validateData) {
      return data as PriceData[];
    }
    return data.map((item, index) =>
      this.validatePriceData(item, context ? `${context}[${index}]` : `[${index}]`)
    );
  }

  async fetchPriceWithDatabase(symbol: string, chain: Blockchain | undefined): Promise<PriceData> {
    return fetchPriceWithDatabase(this.name, symbol, chain, this.config.useDatabase ?? true);
  }

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
