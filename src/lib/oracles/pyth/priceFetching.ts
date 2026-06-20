import { type HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import { CACHE_TTL, normalizeSymbol, getPythFeedIdAsync } from '../constants/pythConstants';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

import { type PythCache } from './pythCache';
import { parsePythPrice } from './pythParser';
import { isPythPriceRaw } from './types';

const logger = createLogger('PythPriceFetching');

export async function fetchLatestPrice(
  hermesClient: HermesClient,
  cache: PythCache,
  symbol: string,
  signal?: AbortSignal
): Promise<PriceData | null> {
  const cacheKey = `price:${symbol}`;
  const cached = cache.get<PriceData>(cacheKey);
  if (cached) {
    logger.debug('Returning cached price', { symbol });
    return cached;
  }

  if (signal?.aborted) {
    logger.debug('Request aborted before fetch', { symbol });
    return null;
  }

  try {
    const result = await withOracleRetry(
      async () => {
        if (signal?.aborted) {
          return null;
        }

        const pythSymbol = normalizeSymbol(symbol);
        const priceId = await getPythFeedIdAsync(symbol);

        if (!priceId) {
          logger.warn('No price feed ID found for symbol', { symbol });
          return null;
        }

        const priceUpdates = await hermesClient.getLatestPriceUpdates([priceId], {
          parsed: true,
        });

        if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
          logger.warn('No price data available', { symbol });
          return null;
        }

        const parsedItem = priceUpdates.parsed[0];

        if (!parsedItem || !parsedItem.price || !isPythPriceRaw(parsedItem.price)) {
          logger.error('Invalid price data format', new Error(JSON.stringify(parsedItem)));
          return null;
        }

        return parsePythPrice(parsedItem.price, symbol, priceId, pythSymbol);
      },
      'getLatestPrice',
      ORACLE_RETRY_PRESETS.standard
    );

    if (result) {
      cache.set(cacheKey, result, CACHE_TTL.PRICE);
    }

    return result;
  } catch (error) {
    logger.error(
      'Failed to get latest price',
      error instanceof Error ? error : new Error(String(error)),
      { symbol }
    );
    const errMsg = error instanceof Error ? error.message : String(error);
    if (
      errMsg.includes('503') ||
      errMsg.includes('Service Temporarily Unavailable') ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('timeout') ||
      errMsg.includes('fetch failed')
    ) {
      throw error;
    }
    return null;
  }
}

export async function fetchHistoricalPrices(
  hermesClient: HermesClient,
  cache: PythCache,
  symbol: string,
  hours: number = 24,
  intervalMinutes: number = 60
): Promise<PriceData[]> {
  const cacheKey = `historical:${symbol}:${hours}:${intervalMinutes}`;
  const cached = cache.get<PriceData[]>(cacheKey);
  if (cached) {
    logger.debug('Returning cached historical prices', { symbol, hours });
    return cached;
  }

  try {
    const pythSymbol = normalizeSymbol(symbol);
    const priceId = await getPythFeedIdAsync(symbol);

    if (!priceId) {
      logger.warn('No price feed ID found for symbol', { symbol });
      return [];
    }

    const now = Math.floor(Date.now() / 1000);
    const from = now - hours * 60 * 60;
    const dataPoints = Math.ceil((hours * 60) / intervalMinutes);

    logger.info(`Fetching historical prices for ${symbol} (${hours}h, ${dataPoints} points)`);

    const result = await withOracleRetry(
      async () => {
        const allPrices: PriceData[] = [];
        const timestamps: number[] = [];

        for (let i = 0; i < dataPoints; i++) {
          const timestamp = from + i * (intervalMinutes * 60);
          if (timestamp <= now) {
            timestamps.push(timestamp);
          }
        }

        const batchSize = 10;
        for (let i = 0; i < timestamps.length; i += batchSize) {
          const batch = timestamps.slice(i, i + batchSize);
          const batchPromises = batch.map(async (timestamp) => {
            try {
              const priceUpdates = await hermesClient.getPriceUpdatesAtTimestamp(
                timestamp,
                [priceId],
                { parsed: true }
              );

              if (priceUpdates.parsed && priceUpdates.parsed.length > 0) {
                const parsedItem = priceUpdates.parsed[0];
                if (parsedItem && parsedItem.price && isPythPriceRaw(parsedItem.price)) {
                  return parsePythPrice(parsedItem.price, symbol, undefined, pythSymbol);
                }
              }
              return null;
            } catch (error) {
              logger.warn(`Failed to get price at timestamp ${timestamp}`, {
                symbol,
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach((price) => {
            if (price) {
              allPrices.push(price);
            }
          });

          if (i + batchSize < timestamps.length) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        if (allPrices.length === 0) {
          logger.warn('No historical price data available', { symbol, hours });
          return [];
        }

        allPrices.sort((a, b) => a.timestamp - b.timestamp);

        const uniquePrices: PriceData[] = [];
        const seenTimestamps = new Set<number>();
        for (const price of allPrices) {
          if (!seenTimestamps.has(price.timestamp)) {
            seenTimestamps.add(price.timestamp);
            uniquePrices.push(price);
          }
        }

        logger.info(`Fetched ${uniquePrices.length} unique historical price points for ${symbol}`);
        return uniquePrices;
      },
      'getHistoricalPrices',
      ORACLE_RETRY_PRESETS.standard
    );

    if (result.length > 0) {
      cache.set(cacheKey, result, CACHE_TTL.PRICE);
      logger.info(`Successfully cached ${result.length} historical price points for ${symbol}`);
    }

    return result;
  } catch (error) {
    logger.error(
      'Failed to get historical prices',
      error instanceof Error ? error : new Error(String(error)),
      { symbol, hours }
    );
    const errMsg = error instanceof Error ? error.message : String(error);
    if (
      errMsg.includes('503') ||
      errMsg.includes('Service Temporarily Unavailable') ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('timeout') ||
      errMsg.includes('fetch failed')
    ) {
      throw error;
    }
    return [];
  }
}
