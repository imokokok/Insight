import { type HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import { PYTH_PRICE_FEED_IDS, CACHE_TTL, normalizeSymbol } from '../constants/pythConstants';
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
        const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

        if (!priceId) {
          logger.warn('No price feed ID found for symbol', { symbol });
          return null;
        }

        const priceUpdates = await hermesClient.getLatestPriceUpdates([priceId]);

        if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
          logger.warn('No price data available', { symbol });
          return null;
        }

        const parsed = priceUpdates.parsed[0];

        if (!parsed || !parsed.price || !isPythPriceRaw(parsed.price)) {
          logger.error('Invalid price data format', new Error(JSON.stringify(parsed)));
          return null;
        }

        return parsePythPrice(parsed.price, symbol, priceId);
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
    return null;
  }
}

export async function fetchMultiplePrices(
  hermesClient: HermesClient,
  symbols: string[]
): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>();

  const priceIds: string[] = [];
  const symbolToId = new Map<string, string>();

  for (const symbol of symbols) {
    const pythSymbol = normalizeSymbol(symbol);
    const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];
    if (priceId) {
      priceIds.push(priceId);
      symbolToId.set(priceId, symbol);
    }
  }

  if (priceIds.length === 0) {
    return results;
  }

  try {
    const priceUpdates = await withOracleRetry(
      () => hermesClient.getLatestPriceUpdates(priceIds),
      'getMultiplePrices',
      ORACLE_RETRY_PRESETS.standard
    );

    if (priceUpdates.parsed) {
      for (const parsed of priceUpdates.parsed) {
        if (parsed.price && isPythPriceRaw(parsed.price)) {
          const symbol = symbolToId.get(parsed.id);
          if (symbol) {
            const priceData = parsePythPrice(parsed.price, symbol);
            if (priceData) {
              results.set(symbol, priceData);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error(
      'Failed to get multiple prices',
      error instanceof Error ? error : new Error(String(error)),
      { symbols }
    );
  }

  return results;
}

export async function fetchPriceAtTimestamp(
  hermesClient: HermesClient,
  symbol: string,
  timestamp: number
): Promise<PriceData | null> {
  try {
    const pythSymbol = normalizeSymbol(symbol);
    const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

    if (!priceId) {
      logger.warn('No price feed ID found for symbol', { symbol });
      return null;
    }

    const result = await withOracleRetry(
      async () => {
        const priceUpdates = await hermesClient.getPriceUpdatesAtTimestamp(
          Math.floor(timestamp / 1000),
          [priceId]
        );

        if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
          return null;
        }

        const parsed = priceUpdates.parsed[0];
        if (!parsed || !parsed.price || !isPythPriceRaw(parsed.price)) {
          return null;
        }

        return parsePythPrice(parsed.price, symbol);
      },
      'getPriceAtTimestamp',
      ORACLE_RETRY_PRESETS.standard
    );

    return result;
  } catch (error) {
    logger.error(
      'Failed to get price at timestamp',
      error instanceof Error ? error : new Error(String(error)),
      { symbol, timestamp }
    );
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
    const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

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

        const batchSize = 5;
        for (let i = 0; i < timestamps.length; i += batchSize) {
          const batch = timestamps.slice(i, i + batchSize);
          const batchPromises = batch.map(async (timestamp) => {
            try {
              const priceUpdates = await hermesClient.getPriceUpdatesAtTimestamp(timestamp, [
                priceId,
              ]);

              if (priceUpdates.parsed && priceUpdates.parsed.length > 0) {
                const parsed = priceUpdates.parsed[0];
                if (parsed && parsed.price && isPythPriceRaw(parsed.price)) {
                  return parsePythPrice(parsed.price, symbol);
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
            await new Promise((resolve) => setTimeout(resolve, 100));
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
    return [];
  }
}
