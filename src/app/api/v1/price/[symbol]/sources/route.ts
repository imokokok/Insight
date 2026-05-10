import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('V1SourcesAPI');

const providerToSymbolKey: Record<OracleProvider, keyof typeof oracleSupportedSymbols> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.PYTH]: 'pyth',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
  [OracleProvider.WINKLINK]: 'winklink',
  [OracleProvider.SUPRA]: 'supra',
  [OracleProvider.TWAP]: 'twap',
  [OracleProvider.REFLECTOR]: 'reflector',
  [OracleProvider.FLARE]: 'flare',
};

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
    const baseSymbol = symbol.split('/')[0].toUpperCase();

    try {
      const factory = getDefaultFactory();

      const providersToQuery = Object.values(OracleProvider).filter((provider) => {
        const key = providerToSymbolKey[provider];
        const supported = oracleSupportedSymbols[key] as readonly string[];
        return supported.includes(baseSymbol);
      });

      const pricePromises = providersToQuery.map(async (provider) => {
        try {
          const client = factory.getClient(provider);
          const price = await client.getPrice(baseSymbol, chain || undefined);
          return { provider, price, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return { provider, price: null, error: message };
        }
      });

      const results = await Promise.allSettled(pricePromises);

      const sources = results
        .filter((r) => r.status === 'fulfilled')
        .map(
          (r) =>
            (
              r as PromiseFulfilledResult<{
                provider: OracleProvider;
                price: PriceData | null;
                error: string | null;
              }>
            ).value
        );

      const available = sources.filter(
        (s): s is { provider: OracleProvider; price: PriceData; error: string | null } =>
          s.price !== null
      );
      const unavailable = sources.filter(
        (s): s is { provider: OracleProvider; price: null; error: string } => s.error !== null
      );

      return NextResponse.json(
        ApiResponseBuilder.success({
          symbol,
          chain: chain || null,
          availableCount: available.length,
          unavailableCount: unavailable.length,
          sources: available.map((s) => ({
            provider: s.provider,
            price: s.price!.price,
            timestamp: s.price!.timestamp,
            confidence: s.price!.confidence,
            confidenceInterval: s.price!.confidenceInterval || null,
            source: s.price!.source || null,
          })),
          unavailable: unavailable.map((s) => ({
            provider: s.provider,
            error: s.error,
          })),
        })
      );
    } catch (error) {
      logger.error(
        'Sources fetch failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch source data', {
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
    },
  }
);
