import { NextRequest } from 'next/server';
import { OracleProvider, Blockchain } from '@/lib/types/oracle';
import {
  createErrorResponse,
  ErrorCodes,
} from '@/lib/api/utils';
import {
  validateRequiredParams,
  validateProvider,
  validatePeriod,
  handleGetPrice,
  handleGetHistoricalPrices,
  handleBatchPrices,
  createUnexpectedErrorResponse,
  BatchPriceRequest,
} from '@/lib/api/oracleHandlers';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-oracles');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain') as Blockchain | null;
    const period = searchParams.get('period');

    const validationError = validateRequiredParams({ provider: provider as OracleProvider, symbol: symbol ?? undefined });
    if (validationError) return validationError;

    const providerError = validateProvider(provider!);
    if (providerError) return providerError;

    const periodResult = validatePeriod(period);
    if (!periodResult.valid) return periodResult.error!;

    const chainValue = chain ? (chain as Blockchain) : undefined;

    if (periodResult.value) {
      return handleGetHistoricalPrices({
        provider: provider as OracleProvider,
        symbol: symbol!,
        chain: chainValue,
        period: periodResult.value,
      });
    }

    return handleGetPrice({
      provider: provider as OracleProvider,
      symbol: symbol!,
      chain: chainValue,
    });
  } catch (error) {
    logger.error(
      'Unexpected error in GET /api/oracles',
      error instanceof Error ? error : new Error(String(error))
    );
    return createUnexpectedErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requests } = body;

    if (!Array.isArray(requests)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Invalid request body. Expected { requests: [...] }',
        retryable: false,
        statusCode: 400,
      });
    }

    return handleBatchPrices(requests as BatchPriceRequest[]);
  } catch (error) {
    logger.error(
      'Error processing batch request',
      error instanceof Error ? error : new Error(String(error))
    );
    return createErrorResponse({
      code: ErrorCodes.BATCH_REQUEST_FAILED,
      message: error instanceof Error ? error.message : 'Failed to process batch request',
      retryable: true,
      statusCode: 500,
    });
  }
}
