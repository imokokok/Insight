import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { handleGetPrice, handleGetHistoricalPrices } from '@/lib/api/oracleHandlers';
import {
  OracleProviderPathParamSchema,
  OracleProviderQuerySchema,
} from '@/lib/security/validation';
import { validateQuerySchema } from '@/lib/validation';
import { type Blockchain, type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const VALID_PROVIDERS = ORACLE_PROVIDER_VALUES.join(', ');

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const pathSegments = request.nextUrl.pathname.split('/');
    const providerSegment = pathSegments[pathSegments.length - 1];

    const providerResult = OracleProviderPathParamSchema.safeParse(providerSegment);
    if (!providerResult.success) {
      return NextResponse.json(
        { error: `Invalid provider: ${providerSegment}. Valid providers: ${VALID_PROVIDERS}` },
        { status: 400 }
      );
    }

    const validatedProvider = providerResult.data as OracleProvider;

    const validation = await validateQuerySchema(OracleProviderQuerySchema)(request);

    if (!validation.success) {
      return validation.response!;
    }

    const { symbol, chain, period } = validation.data!.query!;
    const chainValue = chain as Blockchain | undefined;

    if (period !== undefined) {
      return handleGetHistoricalPrices({
        provider: validatedProvider,
        symbol,
        chain: chainValue,
        period,
      });
    }

    return handleGetPrice({
      provider: validatedProvider,
      symbol,
      chain: chainValue,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'lenient' },
    },
  }
);
