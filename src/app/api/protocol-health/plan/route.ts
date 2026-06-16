import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import {
  calculatePositionCriticalDeviation,
  calculateSafetyParameterPlan,
  type PositionInput,
} from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('api-safety-plan');

const AssetEntrySchema = z.object({
  symbol: z.string().min(1),
  amount: z.number().positive(),
});

const PlanRequestSchema = z.object({
  position: z.object({
    protocolId: z.string().min(1, 'Protocol ID is required'),
    collaterals: z.array(AssetEntrySchema).min(1, 'At least one collateral is required'),
    borrows: z.array(AssetEntrySchema).min(1, 'At least one borrow is required'),
  }),
  targetDeviationPercent: z.number().min(0.1).max(99),
});

interface PriceLookup {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
}

async function fetchPricesForPosition(
  queries: { provider: OracleProvider; symbol: string }[]
): Promise<PriceLookup[]> {
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

    const validation = PlanRequestSchema.safeParse(body);
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

    const { position, targetDeviationPercent } = validation.data;
    const input: PositionInput = {
      protocolId: position.protocolId,
      collaterals: position.collaterals,
      borrows: position.borrows,
    };

    try {
      // 先跑正向计算（复用现有逻辑）
      const result = await calculatePositionCriticalDeviation(input, fetchPricesForPosition);

      // 再跑反向规划
      const plan = calculateSafetyParameterPlan(result, targetDeviationPercent);

      logger.info(
        `Safety plan generated for ${position.protocolId}: target δ=${targetDeviationPercent}%, targetHF=${plan.targetHealthFactor}`
      );

      return NextResponse.json({
        success: true,
        data: { result, plan },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(`Safety plan calculation failed: ${message}`);
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
