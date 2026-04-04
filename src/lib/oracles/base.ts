import { validateOracleData, safeValidateOracleData } from '@/lib/validation/oracleValidation';
import { PriceDataSchema } from '@/lib/validation/schemas';
import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  type OracleError,
  type ErrorCode,
} from '@/types/oracle';

import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from './base/databaseOperations';
import {
  shouldUseDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  configureStorage,
  getStorageConfig,
} from './storage';

import type { OracleStorageConfig } from './storage';

export { shouldUseDatabase, configureStorage, getStorageConfig };
export type { OracleStorageConfig };

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
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
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

  protected createError(message: string, code?: string): OracleError {
    return {
      message,
      provider: this.name,
      code: code as ErrorCode,
    };
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
