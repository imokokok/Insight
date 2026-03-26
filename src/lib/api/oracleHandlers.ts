import { type NextResponse } from 'next/server';

import { createCachedJsonResponse, CacheConfig } from '@/lib/api/utils';
import {
  ValidationError,
  NotFoundError,
  InternalError,
  PriceFetchError,
  errorToResponse,
  isAppError,
} from '@/lib/errors';
import { ChainlinkClient, BandProtocolClient, UMAClient, API3Client } from '@/lib/oracles';
import { type PriceRecord } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';
import { normalizeTimestamp } from '@/lib/utils/timestamp';
import {
  OracleProvider,
  type Blockchain,
  type PriceData,
  ORACLE_PROVIDER_VALUES,
} from '@/types/oracle';

export const PRICE_CACHE_TTL = 30 * 1000;
export const HISTORY_STALE_THRESHOLD = 5 * 60 * 1000;

export interface OracleQueryParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  period?: number;
}

export interface BatchPriceRequest {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

type OracleClient = InstanceType<typeof ChainlinkClient>;

const clients: Partial<Record<OracleProvider, OracleClient>> = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.API3]: new API3Client(),
};

export function getOracleClient(provider: OracleProvider): OracleClient | null {
  return clients[provider] || null;
}

export function isValidProvider(provider: string): provider is OracleProvider {
  return ORACLE_PROVIDER_VALUES.includes(provider as OracleProvider);
}

export function validateProvider(provider: string): NextResponse | null {
  if (!isValidProvider(provider)) {
    return errorToResponse(
      new ValidationError(
        `Invalid provider: ${provider}. Valid providers: ${ORACLE_PROVIDER_VALUES.join(', ')}`,
        {
          field: 'provider',
          value: provider,
          constraints: {
            allowedValues: ORACLE_PROVIDER_VALUES.join(', '),
          },
        }
      )
    );
  }
  return null;
}

export function validateRequiredParams(params: Partial<OracleQueryParams>): NextResponse | null {
  if (!params.provider || !params.symbol) {
    return errorToResponse(
      new ValidationError('Missing required parameters: provider, symbol', {
        constraints: {
          required: 'provider, symbol',
        },
      })
    );
  }
  if (!isValidProvider(params.provider)) {
    return errorToResponse(
      new ValidationError(
        `Invalid provider: ${params.provider}. Valid providers: ${ORACLE_PROVIDER_VALUES.join(', ')}`,
        {
          field: 'provider',
          value: params.provider,
          constraints: {
            allowedValues: ORACLE_PROVIDER_VALUES.join(', '),
          },
        }
      )
    );
  }
  return null;
}

export function validatePeriod(period: string | null): {
  valid: boolean;
  value?: number;
  error?: NextResponse;
} {
  if (!period) {
    return { valid: true };
  }

  const periodNum = parseInt(period, 10);
  if (isNaN(periodNum) || periodNum < 1) {
    return {
      valid: false,
      error: errorToResponse(
        new ValidationError('Invalid period. Must be a positive integer.', {
          field: 'period',
          value: period,
          constraints: {
            type: 'positive integer',
          },
        })
      ),
    };
  }
  return { valid: true, value: periodNum };
}

function mapRecordToPriceData(record: PriceRecord): PriceData {
  return {
    provider: record.provider as OracleProvider,
    symbol: record.symbol,
    chain: record.chain as Blockchain | undefined,
    price: record.price,
    timestamp: new Date(record.timestamp).getTime(),
    decimals: 8,
    confidence: record.confidence || undefined,
    source: record.source || undefined,
  };
}

export async function handleGetPrice(params: OracleQueryParams): Promise<NextResponse> {
  const { provider, symbol, chain } = params;
  const client = getOracleClient(provider);
  const queries = getServerQueries();

  if (!client) {
    return errorToResponse(
      new NotFoundError(`Client not found for provider: ${provider}`, {
        resource: 'OracleClient',
        identifier: provider,
      })
    );
  }

  try {
    const cachedPrice = await queries.getLatestPrice(provider, symbol, chain);

    if (cachedPrice) {
      const cachedTimestamp = new Date(cachedPrice.timestamp).getTime();
      const isFresh = Date.now() - cachedTimestamp < PRICE_CACHE_TTL;

      if (isFresh) {
        return createCachedJsonResponse(
          {
            provider,
            symbol,
            chain: chain || null,
            data: mapRecordToPriceData(cachedPrice),
            timestamp: Date.now(),
            source: 'cache',
          },
          CacheConfig.PRICE
        );
      }
    }

    const priceData = await client.getPrice(symbol, chain);

    await queries.savePriceRecord({
      provider: priceData.provider,
      symbol: priceData.symbol,
      chain: priceData.chain,
      price: priceData.price,
      timestamp: normalizeTimestamp(priceData.timestamp),
      decimals: priceData.decimals,
      confidence: priceData.confidence,
      source: priceData.source,
      ttl: '1h',
    });

    return createCachedJsonResponse(
      {
        provider,
        symbol,
        chain: chain || null,
        data: priceData,
        timestamp: Date.now(),
        source: 'fresh',
      },
      CacheConfig.PRICE
    );
  } catch (error) {
    if (isAppError(error)) {
      return errorToResponse(error);
    }
    return errorToResponse(
      new PriceFetchError(
        `Failed to fetch price for ${symbol} from ${provider}`,
        {
          provider,
          symbol,
          chain,
          retryable: true,
        },
        undefined,
        error instanceof Error ? error : undefined
      )
    );
  }
}

export async function handleGetHistoricalPrices(
  params: OracleQueryParams & { period: number }
): Promise<NextResponse> {
  const { provider, symbol, chain, period } = params;
  const client = getOracleClient(provider);
  const queries = getServerQueries();

  if (!client) {
    return errorToResponse(
      new NotFoundError(`Client not found for provider: ${provider}`, {
        resource: 'OracleClient',
        identifier: provider,
      })
    );
  }

  const endTime = Date.now();
  const startTime = endTime - period * 24 * 60 * 60 * 1000;

  try {
    const cachedHistory = await queries.getPriceRecords({
      provider,
      symbol,
      chain,
      startTime,
      endTime,
      limit: period * 24,
    });

    if (cachedHistory && cachedHistory.length > 0) {
      const latestRecord = cachedHistory[0];
      const latestTimestamp = new Date(latestRecord.timestamp).getTime();
      const isStale = Date.now() - latestTimestamp > HISTORY_STALE_THRESHOLD;

      if (!isStale) {
        const historicalPrices = cachedHistory.map(mapRecordToPriceData);

        return createCachedJsonResponse(
          {
            provider,
            symbol,
            chain: chain || null,
            period,
            data: historicalPrices,
            count: historicalPrices.length,
            timestamp: Date.now(),
            source: 'cache',
          },
          CacheConfig.HISTORY
        );
      }
    }

    const historicalPrices = await client.getHistoricalPrices(symbol, chain, period);

    const recordsToSave = historicalPrices.map((price) => ({
      provider: price.provider,
      symbol: price.symbol,
      chain: price.chain,
      price: price.price,
      timestamp: normalizeTimestamp(price.timestamp),
      decimals: price.decimals,
      confidence: price.confidence,
      source: price.source,
      ttl: '3d',
    }));

    if (recordsToSave.length > 0) {
      await queries.savePriceRecords(recordsToSave);
    }

    return createCachedJsonResponse(
      {
        provider,
        symbol,
        chain: chain || null,
        period,
        data: historicalPrices,
        count: historicalPrices.length,
        timestamp: Date.now(),
        source: 'fresh',
      },
      CacheConfig.HISTORY
    );
  } catch (error) {
    if (isAppError(error)) {
      return errorToResponse(error);
    }
    return errorToResponse(
      new PriceFetchError(
        `Failed to fetch historical prices for ${symbol} from ${provider}`,
        {
          provider,
          symbol,
          chain,
          timestamp: Date.now(),
          retryable: true,
        },
        undefined,
        error instanceof Error ? error : undefined
      )
    );
  }
}

export async function handleBatchPrices(requests: BatchPriceRequest[]): Promise<NextResponse> {
  const queries = getServerQueries();

  const results = await Promise.allSettled(
    requests.map(async (req) => {
      const { provider, symbol, chain } = req;
      const client = getOracleClient(provider);

      if (!client) {
        throw new ValidationError(`Invalid provider: ${provider}`, {
          field: 'provider',
          value: provider,
        });
      }

      const cachedPrice = await queries.getLatestPrice(provider, symbol, chain);

      if (cachedPrice) {
        const cachedTimestamp = new Date(cachedPrice.timestamp).getTime();
        const isFresh = Date.now() - cachedTimestamp < PRICE_CACHE_TTL;

        if (isFresh) {
          return {
            provider,
            symbol,
            chain,
            data: mapRecordToPriceData(cachedPrice),
            source: 'cache',
          };
        }
      }

      const priceData = await client.getPrice(symbol, chain);

      await queries.savePriceRecord({
        provider: priceData.provider,
        symbol: priceData.symbol,
        chain: priceData.chain,
        price: priceData.price,
        timestamp: normalizeTimestamp(priceData.timestamp),
        decimals: priceData.decimals,
        confidence: priceData.confidence,
        source: priceData.source,
        ttl: '1h',
      });

      return { provider, symbol, chain, data: priceData, source: 'fresh' };
    })
  );

  const data = results.map((result, index) => ({
    request: requests[index],
    status: result.status,
    data: result.status === 'fulfilled' ? result.value.data : null,
    source: result.status === 'fulfilled' ? result.value.source : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));

  return createCachedJsonResponse(
    {
      timestamp: Date.now(),
      results: data,
    },
    CacheConfig.PRICE
  );
}

export function createUnexpectedErrorResponse(): NextResponse {
  return errorToResponse(new InternalError('An unexpected error occurred'));
}
