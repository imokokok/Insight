import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
} from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('api-protocol-health');

const PositionCriticalRequestSchema = z.object({
  protocolId: z.string().min(1, 'Protocol ID is required'),
  collateralSymbol: z.string().min(1, 'Collateral symbol is required'),
  collateralAmount: z.number().positive('Collateral amount must be positive'),
  borrowSymbol: z.string().min(1, 'Borrow symbol is required'),
  borrowAmount: z.number().positive('Borrow amount must be positive'),
});

async function fetchPricesForPosition(
  queries: { provider: OracleProvider; symbol: string }[]
): Promise<
  Array<{
    provider: OracleProvider;
    symbol: string;
    price: number;
    timestamp: number;
  }>
> {
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      try {
        const priceData: PriceData = await fetchPriceWithDatabase(
          query.provider,
          query.symbol,
          undefined,
          true,
          false
        );
        return {
          provider: query.provider,
          symbol: query.symbol,
          price: priceData.price ?? 0,
          timestamp: priceData.timestamp ?? Date.now(),
        };
      } catch (error) {
        logger.warn(
          `Failed to fetch price for ${query.provider}/${query.symbol}: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          provider: query.provider,
          symbol: query.symbol,
          price: 0,
          timestamp: Date.now(),
        };
      }
    })
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      provider: 'chainlink' as OracleProvider,
      symbol: '',
      price: 0,
      timestamp: Date.now(),
    };
  });
}

export const POST = createApiHandler(
  async (request: NextRequest) => {
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }

    const validation = PositionCriticalRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { errors } },
        },
        { status: 400 }
      );
    }

    const input: PositionInput = validation.data;

    try {
      const result = await calculatePositionCriticalDeviation(input, fetchPricesForPosition);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CALCULATION_ERROR', message },
        },
        { status: 500 }
      );
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
      cors: true,
    },
  }
);
