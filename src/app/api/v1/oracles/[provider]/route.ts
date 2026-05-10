import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
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
        ApiResponseBuilder.error(
          'INVALID_PROVIDER',
          `Invalid provider. Valid providers: ${VALID_PROVIDERS}`,
          {
            details: { validProviders: ORACLE_PROVIDER_VALUES },
          }
        ),
        { status: 400 }
      );
    }

    const validatedProvider = providerResult.data as OracleProvider;

    const validation = await validateQuerySchema(OracleProviderQuerySchema)(request);
    if (!validation.success) {
      return validation.response!;
    }

    const { symbol, chain, period, forceRefresh } = validation.data!.query!;
    const chainValue = chain as Blockchain | undefined;

    if (period !== undefined) {
      const result = await handleGetHistoricalPrices({
        provider: validatedProvider,
        symbol,
        chain: chainValue,
        period,
        forceRefresh,
      });

      if (result.status >= 400) {
        return result;
      }

      const body = await result.json();
      return NextResponse.json(
        ApiResponseBuilder.success(body, {
          provider: validatedProvider,
          symbol,
          chain: chainValue,
          period,
        })
      );
    }

    const result = await handleGetPrice({
      provider: validatedProvider,
      symbol,
      chain: chainValue,
      forceRefresh,
    });

    if (result.status >= 400) {
      return result;
    }

    const body = await result.json();
    return NextResponse.json(
      ApiResponseBuilder.success(body, {
        provider: validatedProvider,
        symbol,
        chain: chainValue,
      })
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
      apiKey: true,
    },
  }
);
