import { buildStellarVerification } from '@/lib/oracles/utils/verificationUtils';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { BaseOracleClient, type OracleClientConfig } from '../base';
import {
  REFLECTOR_CRYPTO_ASSETS,
  REFLECTOR_FOREX_ASSETS,
  REFLECTOR_CRYPTO_CONTRACT,
  REFLECTOR_FOREX_CONTRACT,
} from '../constants/reflectorConstants';
import { getReflectorDataService } from '../services/reflectorDataService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

export class ReflectorClient extends BaseOracleClient {
  name = OracleProvider.REFLECTOR;
  supportedChains = [Blockchain.STELLAR];
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
    if (!symbol) {
      throw this.createUnsupportedSymbolError('', chain);
    }

    const upperSymbol = symbol.toUpperCase();

    if (!this.isSymbolSupported(upperSymbol, chain)) {
      throw this.createUnsupportedSymbolError(upperSymbol, chain);
    }

    try {
      const priceData = await withOracleRetry(
        async () => this.reflectorDataService.fetchLatestPrice(upperSymbol, options?.signal),
        `reflector:getPrice:${upperSymbol}`,
        // Reflector's fetchLatestPrice makes 2 sequential Stellar RPC calls
        // (decimals + lastprice) on cold cache, each with a 15s ceiling.
        // The standard preset's 15s timeout can't accommodate both — a single
        // slow RPC exhausts the budget and triggers a retry that may also
        // fail. Use 30s so both calls fit within one attempt.
        { ...ORACLE_RETRY_PRESETS.standard, timeout: 30000 },
        options?.signal
      );

      if (!priceData) {
        throw this.createNoDataError(upperSymbol, chain, 'Reflector contract returned no data');
      }

      const isCrypto = (REFLECTOR_CRYPTO_ASSETS as readonly string[]).includes(upperSymbol);
      const contractId = isCrypto ? REFLECTOR_CRYPTO_CONTRACT : REFLECTOR_FOREX_CONTRACT;

      // Central schema validation: Reflector's Stellar contract data is
      // untrusted; reject bad prices/timestamps before caching.
      return this.validatePriceData(
        {
          ...priceData,
          chain: chain || Blockchain.STELLAR,
          verification: buildStellarVerification(contractId, 'lastprice'),
        },
        'getPrice'
      );
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
    return [...REFLECTOR_CRYPTO_ASSETS, ...REFLECTOR_FOREX_ASSETS];
  }
}
