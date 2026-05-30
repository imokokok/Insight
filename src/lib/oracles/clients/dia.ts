import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { DIA_API_BASE_URL } from '@/lib/oracles/diaUtils';
import { diaPriceService } from '@/lib/oracles/services/diaPriceService';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { OracleProvider, Blockchain } from '@/types/oracle';
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

  supportedSymbolsList = diaSymbols;

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
    this.validateGetPriceParams(symbol, options);

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
      this.handleGetPriceError(error, 'DIA oracle', 'DIA_ERROR');
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
}
