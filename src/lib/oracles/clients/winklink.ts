import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  winklinkSymbols,
  WINKLINK_SYMBOL_ALIASES,
  WINKLINK_AVAILABLE_PAIRS,
} from '@/lib/oracles/constants/supportedSymbols';
import { getWINkLinkRealDataService } from '@/lib/oracles/services/winklinkRealDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const _logger = createLogger('WINkLinkClient');

export class WINkLinkClient extends BaseOracleClient {
  name = OracleProvider.WINKLINK;
  supportedChains = [Blockchain.TRON];

  defaultUpdateIntervalMinutes = 60;
  protected defaultChain = Blockchain.TRON;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (options?.signal?.aborted) {
      throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
    }

    try {
      const upperSymbol = symbol.toUpperCase();
      const resolvedSymbol = WINKLINK_SYMBOL_ALIASES[upperSymbol] || upperSymbol;

      if (resolvedSymbol === 'WIN') {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.WINKLINK,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 8,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain: chain || Blockchain.TRON,
            source: 'binance-api',
          };
        }

        throw this.createError(
          `Failed to fetch WIN token price from Binance API. Real-time data is required.`,
          'NO_DATA_AVAILABLE',
          { retryable: true }
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
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from WINkLink',
        'WINKLINK_ERROR'
      );
    }
  }

  getSupportedSymbols(): string[] {
    return [...winklinkSymbols];
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

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
