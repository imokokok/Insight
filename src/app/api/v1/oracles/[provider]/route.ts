import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from '@/lib/oracles/base/databaseOperations';
import {
  OracleProviderPathParamSchema,
  OracleProviderQuerySchema,
} from '@/lib/security/validation';
import { validateQuerySchema } from '@/lib/validation';
import { type Blockchain, type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const VALID_PROVIDERS = ORACLE_PROVIDER_VALUES.join(', ');

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const providerParam = context.validated?.params?.provider || '';

    const providerResult = OracleProviderPathParamSchema.safeParse(providerParam);
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
    const baseSymbol = symbol.split('/')[0].toUpperCase();

    try {
      if (period !== undefined) {
        const data = await fetchHistoricalPricesWithDatabase(
          validatedProvider,
          baseSymbol,
          chainValue,
          period,
          true
        );

        return NextResponse.json(
          ApiResponseBuilder.success(data, {
            provider: validatedProvider,
            symbol,
            chain: chainValue,
            period,
          })
        );
      }

      const data = await fetchPriceWithDatabase(
        validatedProvider,
        baseSymbol,
        chainValue,
        true,
        forceRefresh
      );

      return NextResponse.json(
        ApiResponseBuilder.success(data, {
          provider: validatedProvider,
          symbol,
          chain: chainValue,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        ApiResponseBuilder.error('ORACLE_ERROR', `Oracle operation failed: ${message}`, {
          retryable: true,
        }),
        { status: 500 }
      );
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
      apiKey: true,
      cors: true,
    },
  }
);
