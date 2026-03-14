import { NextRequest } from 'next/server';
import { Blockchain, OracleProvider } from '@/types/oracle';
import {
  createErrorResponse,
  ErrorCodes,
} from '@/lib/api/utils';
import {
  validateProvider,
  validatePeriod,
  handleGetPrice,
  handleGetHistoricalPrices,
  createUnexpectedErrorResponse,
} from '@/lib/api/oracleHandlers';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-oracles-provider');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain');
    const period = searchParams.get('period');

    if (!symbol) {
      return createErrorResponse({
        code: ErrorCodes.MISSING_PARAMS,
        message: 'Missing required parameter: symbol',
        retryable: false,
        statusCode: 400,
      });
    }

    const providerError = validateProvider(provider);
    if (providerError) return providerError;

    const periodResult = validatePeriod(period);
    if (!periodResult.valid) return periodResult.error!;

    const chainValue = chain ? (chain as Blockchain) : undefined;

    if (periodResult.value) {
      return handleGetHistoricalPrices({
        provider: provider as OracleProvider,
        symbol,
        chain: chainValue,
        period: periodResult.value,
      });
    }

    return handleGetPrice({
      provider: provider as OracleProvider,
      symbol,
      chain: chainValue,
    });
  } catch (error) {
    logger.error(
      'Unexpected error in GET /api/oracles/[provider]',
      error instanceof Error ? error : new Error(String(error))
    );
    return createUnexpectedErrorResponse();
  }
}
