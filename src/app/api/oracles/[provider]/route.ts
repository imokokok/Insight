import { type NextRequest } from 'next/server';

import { lenientRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import {
  handleGetPrice,
  handleGetHistoricalPrices,
  createUnexpectedErrorResponse,
} from '@/lib/api/oracleHandlers';
import { ApiResponseBuilder } from '@/lib/api/response';
import {
  OracleProviderPathParamSchema,
  OracleProviderQuerySchema,
} from '@/lib/security/validation';
import { createLogger } from '@/lib/utils/logger';
import { validateQuerySchema } from '@/lib/validation';
import { type Blockchain, type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const logger = createLogger('api-oracles-provider');

const VALID_PROVIDERS = ORACLE_PROVIDER_VALUES.join(', ');

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

    const providerResult = OracleProviderPathParamSchema.safeParse(provider);
    if (!providerResult.success) {
      return ApiResponseBuilder.badRequest(
        `Invalid provider: ${provider}. Valid providers: ${VALID_PROVIDERS}`
      );
    }

    const validation = await validateQuerySchema(OracleProviderQuerySchema)(request);

    if (!validation.success) {
      return validation.response!;
    }

    const { symbol, chain, period } = validation.data!.query!;
    const chainValue = chain as Blockchain | undefined;

    if (period) {
      return handleGetHistoricalPrices({
        provider: provider as OracleProvider,
        symbol,
        chain: chainValue,
        period: period as number,
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
