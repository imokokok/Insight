import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';

import {
  PYTH_PRICE_FEED_IDS,
  HERMES_FALLBACK_URLS,
  HERMES_DIRECT_IPS,
  normalizeSymbol,
} from '../constants/pythConstants';

import { parsePythPrice } from './pythParser';
import { isPythPriceRaw } from './types';

const logger = createLogger('PythDirectFetch');

interface ParsedPriceFeed {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

const FETCH_TIMEOUT_MS = 15_000;

function buildUrls(priceId: string): Array<{ url: string; label: string }> {
  const urls: Array<{ url: string; label: string }> = [];

  for (const baseUrl of HERMES_FALLBACK_URLS) {
    urls.push({
      url: `${baseUrl}/v2/updates/price/latest?ids[]=${priceId}&parsed=true`,
      label: baseUrl,
    });
  }

  if (typeof process !== 'undefined' && typeof require !== 'undefined') {
    for (const ip of HERMES_DIRECT_IPS) {
      urls.push({
        url: `https://${ip}/v2/updates/price/latest?ids[]=${priceId}&parsed=true`,
        label: `direct-ip:${ip}`,
      });
    }
  }

  return urls;
}

async function fetchWithTimeout(
  url: string,
  label: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
  customHost?: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error(`Direct fetch to ${label} timed out after ${timeoutMs}ms`)),
    timeoutMs
  );

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (customHost) {
      headers['Host'] = customHost;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryFetchFromEndpoints(priceId: string): Promise<ParsedPriceFeed | null> {
  const endpoints = buildUrls(priceId);
  const hostHeader = 'hermes.pyth.network';

  for (const endpoint of endpoints) {
    const isDirectIp = endpoint.label.startsWith('direct-ip:');
    try {
      logger.info(`Trying direct fetch`, { endpoint: endpoint.label });

      const response = await fetchWithTimeout(
        endpoint.url,
        endpoint.label,
        FETCH_TIMEOUT_MS,
        isDirectIp ? hostHeader : undefined
      );

      if (!response.ok) {
        logger.warn(`Direct fetch returned HTTP ${response.status}`, {
          endpoint: endpoint.label,
        });
        continue;
      }

      const data = await response.json();

      const parsed = data?.parsed;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const feed = parsed[0];
        if (feed?.price && isPythPriceRaw(feed.price)) {
          logger.info(`Direct fetch succeeded`, { endpoint: endpoint.label });
          return feed as ParsedPriceFeed;
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const feed = data[0];
        if (feed?.price && isPythPriceRaw(feed.price)) {
          logger.info(`Direct fetch succeeded (raw array format)`, {
            endpoint: endpoint.label,
          });
          return feed as ParsedPriceFeed;
        }
      }

      logger.warn(`Direct fetch returned unexpected data format`, {
        endpoint: endpoint.label,
        dataKeys: typeof data === 'object' && data !== null ? Object.keys(data) : 'non-object',
      });
    } catch (error) {
      logger.warn(`Direct fetch failed`, {
        endpoint: endpoint.label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}

export async function fetchLatestPriceDirect(symbol: string): Promise<PriceData | null> {
  const pythSymbol = normalizeSymbol(symbol);
  const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

  if (!priceId) {
    logger.warn('No price feed ID found for symbol', { symbol });
    return null;
  }

  const feed = await tryFetchFromEndpoints(priceId);
  if (!feed || !feed.price) {
    return null;
  }

  return parsePythPrice(feed.price, symbol, priceId, pythSymbol);
}

export async function fetchHistoricalPricesDirect(
  symbol: string,
  hours: number = 24,
  intervalMinutes: number = 60
): Promise<PriceData[]> {
  const pythSymbol = normalizeSymbol(symbol);
  const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

  if (!priceId) {
    logger.warn('No price feed ID found for symbol', { symbol });
    return [];
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - hours * 60 * 60;
  const dataPoints = Math.ceil((hours * 60) / intervalMinutes);

  const timestamps: number[] = [];
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = from + i * (intervalMinutes * 60);
    if (timestamp <= now) {
      timestamps.push(timestamp);
    }
  }

  const allPrices: PriceData[] = [];
  const batchSize = 6;

  for (let i = 0; i < timestamps.length; i += batchSize) {
    const batch = timestamps.slice(i, i + batchSize);
    const batchPromises = batch.map(async (timestamp) => {
      try {
        const endpoints = buildUrls(priceId).map((ep) => ({
          ...ep,
          url: ep.url.replace('/price/latest?', `/price/${timestamp}?`),
        }));
        const hostHeader = 'hermes.pyth.network';

        for (const endpoint of endpoints) {
          const isDirectIp = endpoint.label.startsWith('direct-ip:');
          try {
            const response = await fetchWithTimeout(
              endpoint.url,
              endpoint.label,
              FETCH_TIMEOUT_MS,
              isDirectIp ? hostHeader : undefined
            );

            if (!response.ok) continue;

            const data = await response.json();
            const parsed = data?.parsed ?? data;

            if (Array.isArray(parsed) && parsed.length > 0) {
              const feed = parsed[0];
              if (feed?.price && isPythPriceRaw(feed.price)) {
                return parsePythPrice(feed.price, symbol, undefined, pythSymbol);
              }
            }
          } catch {
            continue;
          }
        }
        return null;
      } catch (error) {
        logger.warn(`Failed to get historical price at timestamp ${timestamp}`, {
          symbol,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((price) => {
      if (price) allPrices.push(price);
    });

    if (i + batchSize < timestamps.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
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

  return uniquePrices;
}
