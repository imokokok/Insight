import { type NextResponse } from 'next/server';

import { createCachedJsonResponse } from '@/lib/api/utils';
import { ValidationError, InternalError, errorToResponse, isAppError } from '@/lib/errors';
import { ORACLE_CACHE_TTL } from '@/lib/oracles';
import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from '@/lib/oracles/base/databaseOperations';
import { createLogger } from '@/lib/utils/logger';
import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  ORACLE_PROVIDER_VALUES,
  BLOCKCHAIN_VALUES,
} from '@/types/oracle';

const logger = createLogger('OracleHandlers');

const PRICE_CACHE_TTL = ORACLE_CACHE_TTL.PRICE;
const HISTORY_CACHE_TTL = ORACLE_CACHE_TTL.HISTORICAL;

const BATCH_MAX_CONCURRENT = 6;

interface OracleQueryParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  period?: number;
}

interface BatchPriceRequest {
  provider: OracleProvider | string;
  symbol: string;
  chain?: Blockchain | string;
}

function isValidProvider(provider: string): provider is OracleProvider {
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

export function validateSymbol(symbol: string): NextResponse | null {
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    return errorToResponse(
      new ValidationError('Invalid symbol: must be a non-empty string', {
        field: 'symbol',
        value: symbol,
      })
    );
  }

  const trimmedSymbol = symbol.trim();
  if (trimmedSymbol.length > 20) {
    return errorToResponse(
      new ValidationError('Invalid symbol: must be at most 20 characters', {
        field: 'symbol',
        value: symbol,
        constraints: {
          maxLength: 20,
        },
      })
    );
  }

  if (!/^[A-Za-z0-9\-_./]+$/.test(trimmedSymbol)) {
    return errorToResponse(
      new ValidationError('Invalid symbol: contains invalid characters', {
        field: 'symbol',
        value: symbol,
        constraints: {
          pattern: 'alphanumeric, dash, underscore, dot, slash',
        },
      })
    );
  }

  return null;
}

export function validatePeriod(period: number | undefined): NextResponse | null {
  if (period !== undefined && (typeof period !== 'number' || period <= 0 || period > 365)) {
    return errorToResponse(
      new ValidationError('Invalid period: must be a positive number between 1 and 365', {
        field: 'period',
        value: period,
        constraints: {
          min: 1,
          max: 365,
        },
      })
    );
  }
  return null;
}

export function validateChain(chain: string): NextResponse | null {
  if (!BLOCKCHAIN_VALUES.includes(chain as Blockchain)) {
    return errorToResponse(
      new ValidationError(
        `Invalid chain: ${chain}. Valid chains: ${BLOCKCHAIN_VALUES.join(', ')}`,
        {
          field: 'chain',
          value: chain,
          constraints: {
            allowedValues: BLOCKCHAIN_VALUES.join(', '),
          },
        }
      )
    );
  }
  return null;
}

async function fetchPriceFromOracle(params: OracleQueryParams): Promise<PriceData> {
  return fetchPriceWithDatabase(params.provider, params.symbol, params.chain, true);
}

async function fetchHistoricalFromOracle(params: OracleQueryParams): Promise<PriceData[]> {
  if (!params.period) {
    throw new ValidationError('Period is required for historical price queries', {
      field: 'period',
    });
  }
  return fetchHistoricalPricesWithDatabase(
    params.provider,
    params.symbol,
    params.chain,
    params.period,
    true
  );
}

interface BatchPriceResult {
  success: boolean;
  data?: PriceData;
  error?: {
    message: string;
    code?: string;
  };
}

async function fetchBatchPrices(
  requests: BatchPriceRequest[]
): Promise<Record<string, BatchPriceResult>> {
  const results: Record<string, BatchPriceResult> = {};

  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < requests.length) {
      const index = nextIndex++;
      const request = requests[index];
      const key = `${request.provider}:${request.symbol}:${request.chain || 'default'}`;

      try {
        const price = await fetchPriceWithDatabase(
          request.provider as OracleProvider,
          request.symbol,
          request.chain as Blockchain | undefined,
          true
        );
        results[key] = {
          success: true,
          data: price,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          `Failed to fetch price for ${key}`,
          error instanceof Error ? error : new Error(String(error))
        );

        results[key] = {
          success: false,
          error: {
            message: errorMessage,
            code: isAppError(error) ? error.code : undefined,
          },
        };
      }
    }
  }

  const workers = Array.from({ length: Math.min(BATCH_MAX_CONCURRENT, requests.length) }, () =>
    runWorker()
  );
  await Promise.all(workers);

  return results;
}

function createPriceResponse(data: PriceData): NextResponse {
  const maxAge = PRICE_CACHE_TTL / 1000;
  const staleWhileRevalidate = 60;
  return createCachedJsonResponse(data, {
    header: `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  });
}

function createHistoryResponse(data: PriceData[]): NextResponse {
  const maxAge = HISTORY_CACHE_TTL / 1000;
  const staleWhileRevalidate = Math.floor(HISTORY_CACHE_TTL / 1000) * 2;
  return createCachedJsonResponse(data, {
    header: `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  });
}

function handleOracleError(error: unknown): NextResponse {
  if (isAppError(error)) {
    return errorToResponse(error);
  }

  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return errorToResponse(new InternalError(`Oracle operation failed: ${message}`));
}

export async function handleGetPrice(params: OracleQueryParams) {
  try {
    logger.info('Fetching price', {
      provider: params.provider,
      symbol: params.symbol,
      chain: params.chain,
    });
    const data = await fetchPriceFromOracle(params);
    logger.info('Price fetched successfully', {
      provider: params.provider,
      symbol: params.symbol,
      chain: params.chain,
      price: data.price,
    });
    return createPriceResponse(data);
  } catch (error) {
    logger.error(
      `Error fetching price for ${params.provider}/${params.symbol}/${params.chain}: ${error instanceof Error ? error.message : String(error)}`
    );
    return handleOracleError(error);
  }
}

export async function handleGetHistoricalPrices(params: OracleQueryParams) {
  try {
    logger.info('Fetching historical prices', {
      provider: params.provider,
      symbol: params.symbol,
      chain: params.chain,
      period: params.period,
    });
    const data = await fetchHistoricalFromOracle(params);
    logger.info('Historical prices fetched successfully', {
      provider: params.provider,
      symbol: params.symbol,
      chain: params.chain,
      dataPoints: data.length,
    });
    return createHistoryResponse(data);
  } catch (error) {
    logger.error(
      `Error fetching historical prices for ${params.provider}/${params.symbol}/${params.chain}: ${error instanceof Error ? error.message : String(error)}`
    );
    return handleOracleError(error);
  }
}

export async function handleBatchPrices(requests: BatchPriceRequest[]) {
  const results = await fetchBatchPrices(requests);
  return createCachedJsonResponse({ results }, { header: 'public, max-age=60' });
}

export function createUnexpectedErrorResponse(error: unknown) {
  return handleOracleError(error);
}
