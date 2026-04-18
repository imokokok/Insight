import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { BaseOracleClient, type OracleClientConfig } from '../base';
import { REFLECTOR_CRYPTO_ASSETS } from '../constants/reflectorConstants';
import { getReflectorDataService } from '../services/reflectorDataService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

export class ReflectorClient extends BaseOracleClient {
  name = OracleProvider.REFLECTOR as OracleProvider;
  supportedChains = [Blockchain.STELLAR] as Blockchain[];
  defaultUpdateIntervalMinutes = 5;

  private reflectorDataService = getReflectorDataService();

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();

    if (!this.isSymbolSupported(upperSymbol, chain)) {
      throw this.createUnsupportedSymbolError(upperSymbol, chain);
    }

    if (this.config.useRealData === false) {
      throw this.createError(
        'Real Reflector data is disabled. USE_REAL_REFLECTOR_DATA must be true.',
        'PROVIDER_UNAVAILABLE' as Parameters<typeof this.createError>[1],
        { retryable: false }
      );
    }

    try {
      const priceData = await withOracleRetry(
        async () => this.reflectorDataService.fetchLatestPrice(upperSymbol, options?.signal),
        `reflector:getPrice:${upperSymbol}`,
        ORACLE_RETRY_PRESETS.standard
      );

      if (!priceData) {
        throw this.createNoDataError(upperSymbol, chain, 'Reflector contract returned no data');
      }

      return {
        ...priceData,
        chain: chain || Blockchain.STELLAR,
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createProviderError(`Failed to fetch price for ${upperSymbol}`, error, {
        retryable: true,
      });
    }
  }

  getSupportedSymbols(): string[] {
    return [...REFLECTOR_CRYPTO_ASSETS];
  }

  protected onHistoricalDataError(_symbol: string, _error: unknown): PriceData[] {
    return [];
  }
}
