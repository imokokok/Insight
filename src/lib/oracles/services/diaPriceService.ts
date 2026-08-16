import { createLogger, normalizeError } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { OracleCache, ORACLE_CACHE_TTL } from '../base';
import { getDIAAssetConfigAsync } from '../constants/diaConstants';
import { DIA_API_BASE_URL, fetchWithTimeout } from '../diaUtils';
import { ORACLE_RETRY_PRESETS, withOracleRetry } from '../utils/retry';

import type { DIAAssetQuotation } from '../diaTypes';

const logger = createLogger('DIAPriceService');

const REQUEST_TIMEOUT = 15000;

export class DIAPriceService {
  constructor(private cache: OracleCache) {}

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

      const assetConfig = await getDIAAssetConfigAsync(upperSymbol);

      let url: string;
      if (assetConfig) {
        // Precise, address-based quotation for symbols we have a verified
        // blockchain + contract mapping for.
        url = `${DIA_API_BASE_URL}/assetQuotation/${assetConfig.blockchain}/${assetConfig.address}`;
      } else {
        // No hardcoded mapping and no DB feed for this symbol. DIA's free API
        // also exposes a symbol-based quotation endpoint, so fall back to it
        // instead of returning null. This is what makes the diaSymbols
        // whitelist actually deliver data: the DIA_ASSET_MAPPING/DB address set
        // is intentionally small, and without this fallback every whitelisted
        // symbol lacking a pinned contract address (liquid majors like
        // DOGE/XRP/SHIB/PEPE that DIA serves for free) silently dropped out.
        // Symbols are not unique, so DIA returns the highest-volume match - an
        // acceptable best-effort for cross-oracle comparison. 404 => symbol
        // genuinely unsupported (resolved to null, not retried).
        url = `${DIA_API_BASE_URL}/quotation/${upperSymbol}`;
      }

      // DIA's public API (api.diadata.org) is flaky and occasionally returns
      // 5xx / times out for a few seconds. Without a retry, a single transient
      // blip fails every DIA feed in that 15-min snapshot run (each feed fails
      // once in the daily report). Wrap the fetch in the same retry preset used
      // by winklink/reflector so transient timeouts and 429/5xx are retried.
      // 404 still resolves to null (not retried — symbol genuinely unsupported).
      const quotation = await withOracleRetry<DIAAssetQuotation | null>(
        () =>
          fetchWithTimeout<DIAAssetQuotation | null>(url, {
            timeout: REQUEST_TIMEOUT,
            signal,
          }),
        `dia:quotation:${upperSymbol}`,
        ORACLE_RETRY_PRESETS.standard,
        signal
      );

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

      this.cache.set(cacheKey, result, ORACLE_CACHE_TTL.PRICE);
      logger.info('Successfully fetched price from DIA API', {
        symbol,
        price: result.price,
        source: 'dia-api',
      });
      return result;
    } catch (error) {
      logger.error('Failed to get price from DIA API', normalizeError(error), { symbol, chain });
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
