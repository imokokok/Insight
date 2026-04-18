import { createLogger } from '@/lib/utils/logger';

import { PYTH_PRICE_FEED_IDS, CACHE_TTL } from '../constants/pythConstants';
import { PYTH_PUBLISHERS, PYTH_PUBLISHER_STATS } from '../constants/pythPublishersData';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

import { calculateTotalSubmissions, calculateAverageLatency } from './calculations';
import { type PythCache } from './pythCache';

import type {
  PublisherData,
  ValidatorData,
  PythServiceNetworkStats,
  PythServicePriceFeed,
} from './types';

const logger = createLogger('PythMetadataFetching');

export async function fetchPublishers(cache: PythCache): Promise<PublisherData[]> {
  const cacheKey = 'publishers';
  const cached = cache.get<PublisherData[]>(cacheKey);
  if (cached) {
    logger.debug('Returning cached publishers');
    return cached;
  }

  logger.info('Returning official Pyth publishers data');
  const publishers = PYTH_PUBLISHERS.map((p) => ({
    ...p,
    lastUpdate: Date.now(),
  }));

  cache.set(cacheKey, publishers, CACHE_TTL.PUBLISHERS);
  return publishers;
}

export async function fetchValidators(cache: PythCache): Promise<ValidatorData[]> {
  const cacheKey = 'validators';
  const cached = cache.get<ValidatorData[]>(cacheKey);
  if (cached) {
    logger.debug('Returning cached validators');
    return cached;
  }

  logger.warn('No validator data available - API does not provide validator data');
  return [];
}

export async function fetchPriceFeeds(cache: PythCache): Promise<PythServicePriceFeed[]> {
  const cacheKey = 'priceFeeds';
  const cached = cache.get<PythServicePriceFeed[]>(cacheKey);
  if (cached) {
    logger.debug('Returning cached price feeds');
    return cached;
  }

  try {
    const result = await withOracleRetry(
      async () => {
        const feeds: PythServicePriceFeed[] = [];

        for (const [symbol, id] of Object.entries(PYTH_PRICE_FEED_IDS)) {
          feeds.push({
            id,
            symbol,
            description: `${symbol} Price Feed`,
            assetType: symbol.includes('USD') ? 'Crypto' : 'Unknown',
            status: 'active',
          });
        }

        return feeds;
      },
      'getPriceFeeds',
      ORACLE_RETRY_PRESETS.standard
    );

    cache.set(cacheKey, result, CACHE_TTL.FEEDS);
    return result;
  } catch (error) {
    logger.error(
      'Failed to get price feeds',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function fetchNetworkStats(cache: PythCache): Promise<PythServiceNetworkStats> {
  const cacheKey = 'networkStats';
  const cached = cache.get<PythServiceNetworkStats>(cacheKey);
  if (cached) {
    logger.debug('Returning cached network stats');
    return cached;
  }

  try {
    const result = await withOracleRetry(
      async () => {
        const [publishers, feeds] = await Promise.all([
          fetchPublishers(cache),
          fetchPriceFeeds(cache),
        ]);

        const activePublishers = publishers.filter((p) => p.status === 'active').length;

        return {
          totalPublishers: publishers.length,
          activePublishers,
          totalPriceFeeds: feeds.length,
          totalSubmissions24h: calculateTotalSubmissions(publishers),
          averageLatency: calculateAverageLatency(publishers),
          uptimePercentage: 99.9,
          lastUpdated: Date.now(),
        };
      },
      'getNetworkStats',
      ORACLE_RETRY_PRESETS.standard
    );

    cache.set(cacheKey, result, CACHE_TTL.STATS);
    return result;
  } catch (error) {
    logger.error(
      'Failed to get network stats',
      error instanceof Error ? error : new Error(String(error))
    );
    return getFallbackNetworkStats();
  }
}

function getFallbackNetworkStats(): PythServiceNetworkStats {
  return {
    totalPublishers: PYTH_PUBLISHER_STATS.totalPublishers,
    activePublishers: PYTH_PUBLISHER_STATS.activePublishers,
    totalPriceFeeds: Object.keys(PYTH_PRICE_FEED_IDS).length,
    totalSubmissions24h: PYTH_PUBLISHER_STATS.totalStake,
    averageLatency: 42,
    uptimePercentage: 99.9,
    lastUpdated: Date.now(),
  };
}
