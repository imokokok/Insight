import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getProvidersForSymbol } from '@/lib/oracles/constants/supportedSymbols';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('V1PriceAPI');

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const symbolParam = context.validated?.params?.symbol;
    const symbol = symbolParam ? decodeURIComponent(symbolParam) : '';

    if (!symbol) {
      return NextResponse.json(
        ApiResponseBuilder.error('MISSING_SYMBOL', 'Symbol is required in the URL path'),
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') as Blockchain | null;
    const oracle = searchParams.get('oracle') as OracleProvider | null;

    const baseSymbol = symbol.split('/')[0].toUpperCase();

    try {
      const factory = getDefaultFactory();

      if (oracle) {
        const client = factory.getClient(oracle);
        const price = await client.getPrice(baseSymbol, chain || undefined);

        return NextResponse.json(
          ApiResponseBuilder.success({
            symbol,
            oracle,
            chain: chain || null,
            price: price.price,
            timestamp: price.timestamp,
            confidence: price.confidence,
            confidenceInterval: price.confidenceInterval || null,
            source: price.source || null,
            verification: price.verification || null,
          })
        );
      }

      const providersToQuery = getProvidersForSymbol(baseSymbol);

      const pricePromises = providersToQuery.map(async (provider) => {
        try {
          const client = factory.getClient(provider);
          const price = await client.getPrice(baseSymbol, chain || undefined);
          return price;
        } catch {
          logger.warn(`Failed to fetch price from ${provider} for ${baseSymbol}`);
          return null;
        }
      });

      const results = await Promise.allSettled(pricePromises);
      const priceData: PriceData[] = results
        .filter(
          (r): r is PromiseFulfilledResult<PriceData> =>
            r.status === 'fulfilled' && r.value !== null
        )
        .map((r) => r.value);

      if (priceData.length === 0) {
        return NextResponse.json(
          ApiResponseBuilder.error('NO_DATA', `No price data available for ${symbol}`),
          { status: 404 }
        );
      }

      const prices = priceData.map((p) => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const medianPrice = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];
      const spread = maxPrice - minPrice;
      const spreadPercent = avgPrice > 0 ? (spread / avgPrice) * 100 : 0;

      return NextResponse.json(
        ApiResponseBuilder.success({
          symbol,
          chain: chain || null,
          aggregatedPrice: medianPrice,
          priceRange: {
            min: minPrice,
            max: maxPrice,
            average: avgPrice,
            median: medianPrice,
            spread,
            spreadPercent: Number(spreadPercent.toFixed(4)),
          },
          providerCount: priceData.length,
          providers: priceData.map((p) => ({
            provider: p.provider,
            price: p.price,
            timestamp: p.timestamp,
            confidence: p.confidence,
            confidenceInterval: p.confidenceInterval || null,
            source: p.source || null,
            verification: p.verification || null,
          })),
        })
      );
    } catch (error) {
      logger.error('Price fetch failed', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch price data', {
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
