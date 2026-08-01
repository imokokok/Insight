import { NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/response';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { ValidationError, InternalError, errorToResponse, isAppError } from '@/lib/errors';
import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from '@/lib/oracles/base/databaseOperations';
import { extractBaseSymbol } from '@/lib/oracles/client';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('OracleHandlers');

interface OracleQueryParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  period?: number;
  forceRefresh?: boolean;
}

async function fetchPriceFromOracle(params: OracleQueryParams): Promise<PriceData> {
  // Oracle services expect the base asset symbol (e.g. "BTC"), while the UI
  // passes the full pair (e.g. "BTC/USD").
  const baseSymbol = extractBaseSymbol(params.symbol);
  return fetchPriceWithDatabase(
    params.provider,
    baseSymbol,
    params.chain,
    true,
    params.forceRefresh
  );
}

async function fetchHistoricalFromOracle(params: OracleQueryParams): Promise<PriceData[]> {
  if (!params.period) {
    throw new ValidationError('Period is required for historical price queries', {
      field: 'period',
    });
  }
  const baseSymbol = extractBaseSymbol(params.symbol);
  return fetchHistoricalPricesWithDatabase(
    params.provider,
    baseSymbol,
    params.chain,
    params.period,
    true
  );
}

function createPriceResponse(data: PriceData, requestId?: string): NextResponse {
  return createCachedJsonResponse(ApiResponseBuilder.success(data, { requestId }), {
    preset: 'realtime',
  });
}

function createHistoryResponse(data: PriceData[], requestId?: string): NextResponse {
  return createCachedJsonResponse(ApiResponseBuilder.success(data, { requestId }), {
    preset: 'static',
  });
}

function handleOracleError(error: unknown): NextResponse {
  if (isAppError(error)) {
    return errorToResponse(error);
  }

  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return errorToResponse(new InternalError(`Oracle operation failed: ${message}`));
}

export async function handleGetPrice(params: OracleQueryParams, requestId?: string) {
  try {
    logger.info('Fetching price', {
      provider: params.provider,
      symbol: params.symbol,
      chain: params.chain,
      forceRefresh: params.forceRefresh,
    });
    const data = await fetchPriceFromOracle(params);
    logger.info('Price fetched successfully', {
      provider: params.provider,
      symbol: params.symbol,
      chain: params.chain,
      price: data.price,
    });

    if (params.forceRefresh) {
      return NextResponse.json(ApiResponseBuilder.success(data, { requestId }));
    }

    return createPriceResponse(data, requestId);
  } catch (error) {
    logger.error(
      `Error fetching price for ${params.provider}/${params.symbol}/${params.chain}: ${error instanceof Error ? error.message : String(error)}`
    );
    return handleOracleError(error);
  }
}

export async function handleGetHistoricalPrices(params: OracleQueryParams, requestId?: string) {
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
    return createHistoryResponse(data, requestId);
  } catch (error) {
    logger.error(
      `Error fetching historical prices for ${params.provider}/${params.symbol}/${params.chain}: ${error instanceof Error ? error.message : String(error)}`
    );
    return handleOracleError(error);
  }
}
