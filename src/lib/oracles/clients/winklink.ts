import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  winklinkSymbols,
  WINKLINK_SYMBOL_ALIASES,
  WINKLINK_AVAILABLE_PAIRS,
} from '@/lib/oracles/constants/supportedSymbols';
import { getWINkLinkRealDataService } from '@/lib/oracles/services/winklinkRealDataService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export class WINkLinkClient extends BaseOracleClient {
  name = OracleProvider.WINKLINK;
  supportedChains = [Blockchain.TRON];

  supportedSymbolsList = winklinkSymbols;

  defaultUpdateIntervalMinutes = 60;
  protected defaultChain = Blockchain.TRON;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(
    symbol: string,
    _chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    try {
      const upperSymbol = symbol.toUpperCase();
      const resolvedSymbol = WINKLINK_SYMBOL_ALIASES[upperSymbol] || upperSymbol;

      if (resolvedSymbol === 'WIN') {
        throw this.createError(
          'WIN token price is not available from WINkLink oracle network',
          'NO_DATA_AVAILABLE'
        );
      }

      const realDataService = getWINkLinkRealDataService();
      const realPrice = await realDataService.getPriceFromContract(
        resolvedSymbol,
        undefined,
        options?.signal
      );

      if (realPrice) {
        return realPrice;
      }

      throw this.createError(
        `Failed to fetch price from WINkLink contract for ${symbol}. ` +
          `Real-time data is required. Please check: 1) TRON RPC connection, 2) Contract address validity, 3) Symbol support.`,
        'NO_DATA_AVAILABLE',
        { retryable: true }
      );
    } catch (error) {
      this.handleGetPriceError(error, 'WINkLink', 'WINKLINK_ERROR');
    }
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    const resolvedSymbol = WINKLINK_SYMBOL_ALIASES[upperSymbol] || upperSymbol;
    const isSymbolInList = winklinkSymbols.includes(
      resolvedSymbol as (typeof winklinkSymbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      const chainKey = chain.toLowerCase();
      const chainSymbols = WINKLINK_AVAILABLE_PAIRS[chainKey];
      return chainSymbols ? chainSymbols.includes(resolvedSymbol) : false;
    }
    return true;
  }
}
