import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { DIA_API_BASE_URL } from '@/lib/oracles/diaUtils';
import { diaPriceService } from '@/lib/oracles/services/diaPriceService';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { OracleProvider, Blockchain, OracleServiceError } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export class DIAClient extends BaseOracleClient {
  name = OracleProvider.DIA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 5;
  protected historicalPriceConfidence = 0.95;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    if (options?.signal?.aborted) {
      throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
    }

    try {
      const result = await diaPriceService.getAssetPrice(symbol, chain, options?.signal);

      if (!result) {
        throw this.createError(
          `No price data available for ${symbol} from DIA oracle`,
          'NO_DATA_AVAILABLE'
        );
      }

      return {
        ...result,
        chain: chain || Blockchain.ETHEREUM,
        verification: buildApiVerification(
          `${DIA_API_BASE_URL}/assetQuotation/`,
          'assetQuotation',
          'DIA API'
        ),
      };
    } catch (error) {
      if (error instanceof OracleServiceError) throw error;
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from DIA oracle',
        'DIA_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    _symbol: string,
    _chain?: Blockchain,
    _periodHours: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    return [];
  }

  getSupportedSymbols(): string[] {
    return [...diaSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = diaSymbols.includes(symbol.toUpperCase() as (typeof diaSymbols)[number]);
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
}
