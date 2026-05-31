import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { OracleCache } from '../base';
import { getDIAAssetConfig } from '../constants/diaConstants';
import { CACHE_TTL, DIA_API_BASE_URL, fetchWithTimeout } from '../diaUtils';

import type { DIAAssetQuotation } from '../diaTypes';

const logger = createLogger('DIAPriceService');

const REQUEST_TIMEOUT = 15000;

export class DIAPriceService {
  constructor(private cache: OracleCache) {}

  destroy(): void {}

  async getAssetPrice(
    symbol: string,
    chain?: Blockchain,
    signal?: AbortSignal
  ): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}:${chain || 'default'}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price', { symbol, chain });
      return cached;
    }

    if (signal?.aborted) {
      logger.debug('Request aborted before fetch', { symbol });
      return null;
    }

    const upperSymbol = symbol.toUpperCase();

    try {
      logger.info('Fetching price from DIA official API', { symbol, chain });

      const assetConfig = getDIAAssetConfig(upperSymbol);

      if (!assetConfig) {
        logger.warn('Symbol not supported by DIA oracle', { symbol });
        return null;
      }

      const url = `${DIA_API_BASE_URL}/assetQuotation/${assetConfig.blockchain}/${assetConfig.address}`;

      const quotation = await fetchWithTimeout<DIAAssetQuotation | null>(url, {
        timeout: REQUEST_TIMEOUT,
        signal,
      });

      if (!quotation || !quotation.Price) {
        logger.warn('DIA API returned no data for symbol', { symbol });
        return null;
      }

      const change24h = quotation.Price - quotation.PriceYesterday;
      const change24hPercent =
        quotation.PriceYesterday > 0 ? (change24h / quotation.PriceYesterday) * 100 : 0;

      const result: PriceData = {
        provider: OracleProvider.DIA,
        symbol: upperSymbol,
        price: quotation.Price,
        timestamp: new Date(quotation.Time).getTime(),
        decimals: 8,
        confidence: 0.95,
        change24h,
        change24hPercent,
        chain,
        source: 'dia-api',
        ingestionTimestamp: Date.now(),
      };

      this.cache.set(cacheKey, result, CACHE_TTL.PRICE);
      logger.info('Successfully fetched price from DIA API', {
        symbol,
        price: result.price,
        source: 'dia-api',
      });
      return result;
    } catch (error) {
      logger.error(
        'Failed to get price from DIA API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return null;
    }
  }

  async getHistoricalPrices(
    _symbol: string,
    _chain?: Blockchain,
    _periodHours: number = 24
  ): Promise<PriceData[]> {
    return [];
  }
}

const diaPriceCache = new OracleCache();
export const diaPriceService = new DIAPriceService(diaPriceCache);
