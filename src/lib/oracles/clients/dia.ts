import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { DIA_API_BASE_URL } from '@/lib/oracles/diaUtils';
import { diaPriceService } from '@/lib/oracles/services/diaPriceService';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, OracleServiceError } from '@/types/oracle';
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
    symbol: string,
    chain?: Blockchain,
    periodHours: number = 24,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    try {
      if (options?.signal?.aborted) {
        throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
      }

      logger.info(`Fetching historical prices for ${symbol} from Binance API`, {
        chain,
        periodHours,
      });

      const historicalPrices = await binanceMarketService.getHistoricalPrices(
        symbol,
        Math.max(1, Math.ceil(periodHours / 24))
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.warn('No historical data available from Binance API', {
          symbol,
          chain,
          periodHours,
        });
        return [];
      }

      const latestPrice = historicalPrices[historicalPrices.length - 1].price;

      return historicalPrices.map((point) => {
        const change24h = latestPrice - point.price;
        const change24hPercent = point.price > 0 ? (change24h / point.price) * 100 : 0;

        return {
          provider: OracleProvider.DIA,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          chain: chain || Blockchain.ETHEREUM,
          source: 'binance-api',
        };
      });
    } catch (error) {
      logger.error(
        'Failed to fetch historical prices from Binance API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain, periodHours }
      );
      return [];
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
