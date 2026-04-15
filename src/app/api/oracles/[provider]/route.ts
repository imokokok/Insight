import { type NextRequest } from 'next/server';

import { lenientRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import {
  validateProvider,
  validatePeriod,
  validateSymbol,
  validateChain,
  handleGetPrice,
  handleGetHistoricalPrices,
  createUnexpectedErrorResponse,
} from '@/lib/api/oracleHandlers';
import { ApiResponseBuilder } from '@/lib/api/response';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

const logger = createLogger('api-oracles-provider');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const rateLimitResult = await lenientRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain');
    const period = searchParams.get('period');

    if (!symbol) {
      return ApiResponseBuilder.badRequest('Missing required parameter: symbol');
    }

    const providerError = validateProvider(provider);
    if (providerError) return providerError;

    const symbolError = validateSymbol(symbol);
    if (symbolError) return symbolError;

    const periodNum = period ? parseInt(period, 10) : undefined;
    const periodError = validatePeriod(periodNum);
    if (periodError) return periodError;

    const chainValue = chain ? (chain as Blockchain) : undefined;

    if (chain) {
      const chainError = validateChain(chain);
      if (chainError) return chainError;
    }

    if (periodNum) {
      return handleGetHistoricalPrices({
        provider: provider as OracleProvider,
        symbol,
        chain: chainValue,
        period: periodNum,
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
    return createUnexpectedErrorResponse(error);
  }
}
