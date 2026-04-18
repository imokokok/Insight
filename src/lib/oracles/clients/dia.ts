import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('DIAClient');

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

    const upperSymbol = symbol.toUpperCase();

    try {
      logger.info(`Fetching price for ${upperSymbol} from Binance API`, {
        chain: chain || 'default',
      });

      const marketData = await binanceMarketService.getTokenMarketData(symbol);

      if (marketData) {
        return {
          provider: OracleProvider.DIA,
          symbol: upperSymbol,
          price: marketData.currentPrice,
          timestamp: new Date(marketData.lastUpdated).getTime(),
          decimals: 8,
          confidence: 0.95,
          change24h: marketData.priceChange24h,
          change24hPercent: marketData.priceChangePercentage24h,
          chain: chain || Blockchain.ETHEREUM,
          source: 'binance-api',
        };
      }

      logger.error(`No price data available for ${upperSymbol} from Binance API`);
      throw this.createError(
        `No price data available for ${symbol} from Binance API. Binance returned no market data.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      if (error instanceof OracleError) throw error;
      logger.error(
        `Error fetching price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Binance API',
        'DIA_ERROR'
      );
    }
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
