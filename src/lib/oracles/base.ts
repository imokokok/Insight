import { validateOracleData, safeValidateOracleData } from '@/lib/validation/oracleValidation';
import { PriceDataSchema } from '@/lib/validation/schemas';
import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  type OracleError,
} from '@/types/oracle';

import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from './base/databaseOperations';
import { generateMockPrice, generateMockHistoricalPrices } from './base/mockGenerator';
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
  fallbackToMock?: boolean;
  validateData?: boolean;
}

const DEFAULT_CLIENT_CONFIG: OracleClientConfig = {
  useDatabase: true,
  fallbackToMock: true,
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

  defaultUpdateIntervalMinutes: number = 1;
  chainUpdateIntervals: Partial<Record<Blockchain, number>> = {};

  protected config: OracleClientConfig;

  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
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
      code,
    };
  }

  protected validatePriceData(data: unknown, context?: string): PriceData {
    if (!this.config.validateData) {
      return data as PriceData;
    }
    return validateOracleData(PriceDataSchema, data, context);
  }

  protected safeValidatePriceData(data: unknown, context?: string): PriceData | null {
    if (!this.config.validateData) {
      return data as PriceData;
    }
    return safeValidateOracleData(PriceDataSchema, data, context);
  }

  protected validatePriceDataArray(data: unknown[], context?: string): PriceData[] {
    if (!this.config.validateData) {
      return data as PriceData[];
    }
    return data.map((item, index) =>
      this.validatePriceData(item, context ? `${context}[${index}]` : `[${index}]`)
    );
  }

  protected generateMockPrice(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    timestamp?: number
  ): PriceData {
    return generateMockPrice(this.name, symbol, basePrice, chain, timestamp);
  }

  protected generateMockHistoricalPrices(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    period: number = 24
  ): PriceData[] {
    return generateMockHistoricalPrices(this.name, symbol, basePrice, chain, period);
  }

  async fetchPriceWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    mockGenerator: () => PriceData
  ): Promise<PriceData> {
    return fetchPriceWithDatabase(
      this.name,
      symbol,
      chain,
      this.config.useDatabase ?? true,
      mockGenerator
    );
  }

  async fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    period: number,
    mockGenerator: () => PriceData[]
  ): Promise<PriceData[]> {
    return fetchHistoricalPricesWithDatabase(
      this.name,
      symbol,
      chain,
      period,
      this.config.useDatabase ?? true,
      mockGenerator
    );
  }
}
