import { type NextResponse } from 'next/server';

import { createCachedJsonResponse } from '@/lib/api/utils';
import {
  ValidationError,
  NotFoundError,
  InternalError,
  errorToResponse,
  isAppError,
} from '@/lib/errors';
import { OracleClientFactory, ORACLE_CACHE_TTL } from '@/lib/oracles';
import { type PriceRecord } from '@/lib/supabase/queries';
import { createLogger } from '@/lib/utils/logger';
import { normalizeTimestamp } from '@/lib/utils/timestamp';
import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  ORACLE_PROVIDER_VALUES,
} from '@/types/oracle';

const logger = createLogger('OracleHandlers');

// 使用统一的缓存配置
export const PRICE_CACHE_TTL = ORACLE_CACHE_TTL.PRICE;
export const HISTORY_CACHE_TTL = ORACLE_CACHE_TTL.HISTORICAL;
export const HISTORY_STALE_THRESHOLD = 5 * 60 * 1000;

export interface OracleQueryParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  period?: number;
}

export interface BatchPriceRequest {
  provider: OracleProvider | string;
  symbol: string;
  chain?: Blockchain | string;
}

interface OracleClientInterface {
  getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  getHistoricalPrices(symbol: string, chain?: Blockchain, period?: number): Promise<PriceData[]>;
  name: OracleProvider;
  supportedChains: Blockchain[];
}

type OracleClient = OracleClientInterface;

export function getOracleClient(provider: OracleProvider): OracleClient | null {
  try {
    const client = OracleClientFactory.getClient(provider);
    return client as OracleClient;
  } catch {
    return null;
  }
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

export async function fetchPriceFromOracle(params: OracleQueryParams): Promise<PriceData> {
  const client = getOracleClient(params.provider);
  if (!client) {
    throw new NotFoundError(`Oracle provider not found: ${params.provider}`);
  }

  return client.getPrice(params.symbol, params.chain);
}

export async function fetchHistoricalFromOracle(params: OracleQueryParams): Promise<PriceData[]> {
  const client = getOracleClient(params.provider);
  if (!client) {
    throw new NotFoundError(`Oracle provider not found: ${params.provider}`);
  }

  return client.getHistoricalPrices(params.symbol, params.chain, params.period);
}

export async function fetchBatchPrices(
  requests: BatchPriceRequest[]
): Promise<Record<string, PriceData>> {
  const results: Record<string, PriceData> = {};

  await Promise.all(
    requests.map(async (request) => {
      try {
        const price = await fetchPriceFromOracle(request as OracleQueryParams);
        const key = `${request.provider}:${request.symbol}:${request.chain || 'default'}`;
        results[key] = price;
      } catch (error) {
        console.error(`Failed to fetch price for ${request.provider}:${request.symbol}:`, error);
      }
    })
  );

  return results;
}

export function createPriceResponse(data: PriceData): NextResponse {
  const maxAge = PRICE_CACHE_TTL / 1000;
  const staleWhileRevalidate = 60;
  return createCachedJsonResponse(data, {
    header: `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  });
}

export function createHistoryResponse(data: PriceData[]): NextResponse {
  const maxAge = HISTORY_CACHE_TTL / 1000;
  const staleWhileRevalidate = Math.floor(HISTORY_CACHE_TTL / 1000) * 2;
  return createCachedJsonResponse(data, {
    header: `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  });
}

export function handleOracleError(error: unknown): NextResponse {
  if (isAppError(error)) {
    return errorToResponse(error);
  }

  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return errorToResponse(new InternalError(`Oracle operation failed: ${message}`));
}

export function priceRecordToPriceData(record: PriceRecord): PriceData {
  return {
    symbol: record.symbol,
    price: record.price,
    timestamp: normalizeTimestamp(record.timestamp),
    provider: record.source as OracleProvider,
    source: record.source as OracleProvider,
    confidence: record.confidence ?? undefined,
  };
}

export function priceDataToRecord(
  data: PriceData,
  chain?: Blockchain
): Omit<PriceRecord, 'id' | 'created_at'> {
  return {
    provider: data.provider,
    symbol: data.symbol,
    price: data.price,
    timestamp: String(normalizeTimestamp(data.timestamp)),
    source: data.source,
    chain: chain || null,
    confidence: data.confidence ?? null,
  };
}

// 兼容旧版 API 的导出
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
  const data = await fetchHistoricalFromOracle(params);
  return createHistoryResponse(data);
}

export async function handleBatchPrices(requests: BatchPriceRequest[]) {
  const results = await fetchBatchPrices(requests);
  return createCachedJsonResponse({ results }, { header: 'public, max-age=60' });
}

export function createUnexpectedErrorResponse(error: unknown) {
  return handleOracleError(error);
}
