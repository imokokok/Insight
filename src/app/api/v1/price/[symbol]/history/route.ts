import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { handleGetHistoricalPrices } from '@/lib/api/oracleHandlers';
import { OracleProviderPathParamSchema } from '@/lib/security/validation';
import { type Blockchain, type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const pathSegments = request.nextUrl.pathname.split('/');
    const symbolSegment = pathSegments[pathSegments.length - 2];
    const symbol = decodeURIComponent(symbolSegment);

    if (!symbol) {
      return NextResponse.json(
        ApiResponseBuilder.error('MISSING_SYMBOL', 'Symbol is required in the URL path'),
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') as Blockchain | null;
    const provider = searchParams.get('provider') as OracleProvider | null;
    const periodStr = searchParams.get('period');
    const period = periodStr ? parseInt(periodStr, 10) : 24;

    if (isNaN(period) || period < 1 || period > 8760) {
      return NextResponse.json(
        ApiResponseBuilder.error('INVALID_PERIOD', 'Period must be between 1 and 8760 hours', {
          details: { provided: periodStr, validRange: '1-8760' },
        }),
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'MISSING_PROVIDER',
          'Provider query parameter is required for historical data. Example: ?provider=chainlink',
          {
            details: { validProviders: ORACLE_PROVIDER_VALUES },
          }
        ),
        { status: 400 }
      );
    }

    const providerResult = OracleProviderPathParamSchema.safeParse(provider);
    if (!providerResult.success) {
      return NextResponse.json(
        ApiResponseBuilder.error('INVALID_PROVIDER', `Invalid provider: ${provider}`, {
          details: { validProviders: ORACLE_PROVIDER_VALUES },
        }),
        { status: 400 }
      );
    }

    const validatedProvider = providerResult.data as OracleProvider;
    const chainValue = chain as Blockchain | undefined;

    const result = await handleGetHistoricalPrices({
      provider: validatedProvider,
      symbol,
      chain: chainValue,
      period,
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
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
      apiKey: true,
    },
  }
);
