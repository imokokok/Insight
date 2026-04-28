import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { getDIAAssetConfig } from '@/lib/oracles/constants/diaConstants';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import type { DIAAssetQuotation } from '@/lib/oracles/diaTypes';
import { DIA_API_BASE_URL, fetchWithTimeout } from '@/lib/oracles/diaUtils';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('DIAClient');

const REQUEST_TIMEOUT = 15000;

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

    const stablecoins = [
      'USDT',
      'USDC',
      'DAI',
      'FRAX',
      'TUSD',
      'BUSD',
      'LUSD',
      'USDD',
      'USDJ',
      'USDP',
    ];
    if (stablecoins.includes(upperSymbol)) {
      return {
        provider: OracleProvider.DIA,
        symbol: upperSymbol,
        price: 1.0,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 1.0,
        change24h: 0,
        change24hPercent: 0,
        chain: chain || Blockchain.ETHEREUM,
        source: 'dia-api',
      };
    }

    try {
      logger.info(`Fetching price for ${upperSymbol} from DIA official API`, {
        chain: chain || 'default',
      });

      const assetConfig = getDIAAssetConfig(upperSymbol);

      if (!assetConfig) {
        logger.warn(`Symbol ${upperSymbol} not supported by DIA oracle`);
        throw this.createError(
          `Symbol ${symbol} is not supported by DIA oracle`,
          'SYMBOL_NOT_SUPPORTED'
        );
      }

      const url = `${DIA_API_BASE_URL}/assetQuotation/${assetConfig.blockchain}/${assetConfig.address}`;

      const quotation = await fetchWithTimeout<DIAAssetQuotation | null>(url, {
        timeout: REQUEST_TIMEOUT,
        signal: options?.signal,
      });

      if (!quotation || !quotation.Price) {
        logger.warn(`DIA API returned no data for ${upperSymbol}`);
        throw this.createError(
          `No price data available for ${symbol} from DIA oracle`,
          'NO_DATA_AVAILABLE'
        );
      }

      const change24h = quotation.Price - quotation.PriceYesterday;
      const change24hPercent =
        quotation.PriceYesterday > 0 ? (change24h / quotation.PriceYesterday) * 100 : 0;

      return {
        provider: OracleProvider.DIA,
        symbol: upperSymbol,
        price: quotation.Price,
        timestamp: new Date(quotation.Time).getTime(),
        decimals: 8,
        confidence: 0.95,
        change24h,
        change24hPercent,
        chain: chain || Blockchain.ETHEREUM,
        source: 'dia-api',
      };
    } catch (error) {
      if (error instanceof OracleError) throw error;
      logger.error(
        `Error fetching price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
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
