import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { fetchPricesForPosition } from '@/lib/api/services/priceQueries';
import {
  calculatePositionCriticalDeviation,
  calculateSafetyParameterPlan,
  type PositionCriticalResult,
  type PositionInput,
} from '@/lib/protocols/protocolHealth';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { createLogger } from '@/lib/utils/logger';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';

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
  // 允许前端传入已有的正向计算结果，避免重复获取数据
  existingResult: z.custom<PositionCriticalResult>().optional(),
});

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

    const { position, targetDeviationPercent, existingResult } = validation.data;

    try {
      // 优先使用前端传入的正向计算结果，避免重复数据获取
      let result: PositionCriticalResult;
      if (existingResult) {
        // 校验 result 与 position 匹配
        const positionKey = `${position.protocolId}:${position.collaterals.map((c) => `${c.symbol}:${c.amount}`).join(',')}:${position.borrows.map((b) => `${b.symbol}:${b.amount}`).join(',')}`;
        const resultKey = `${existingResult.protocolId}:${existingResult.collaterals.map((c) => `${c.symbol}:${c.amount}`).join(',')}:${existingResult.borrows.map((b) => `${b.symbol}:${b.amount}`).join(',')}`;
        if (positionKey === resultKey) {
          result = existingResult;
        } else {
          // position 不匹配，回退到完整计算
          logger.info('Existing result does not match position, falling back to full calculation');
          const input: PositionInput = {
            protocolId: position.protocolId,
            collaterals: position.collaterals,
            borrows: position.borrows,
          };
          // Fetch live depeg/peg deviations for position assets
          const allSymbols = [
            ...position.collaterals.map((c) => c.symbol),
            ...position.borrows.map((b) => b.symbol),
          ];
          const liveAssetDeviations = await fetchLiveDepegDeviations(allSymbols);
          result = await calculatePositionCriticalDeviation(
            input,
            fetchPricesForPosition,
            [],
            liveAssetDeviations
          );
        }
      } else {
        // 无缓存结果，执行完整正向计算
        const input: PositionInput = {
          protocolId: position.protocolId,
          collaterals: position.collaterals,
          borrows: position.borrows,
        };
        // Fetch live depeg/peg deviations for position assets
        const allSymbols = [
          ...position.collaterals.map((c) => c.symbol),
          ...position.borrows.map((b) => b.symbol),
        ];
        const liveAssetDeviations = await fetchLiveDepegDeviations(allSymbols);
        result = await calculatePositionCriticalDeviation(
          input,
          fetchPricesForPosition,
          [],
          liveAssetDeviations
        );
      }

      // 反向规划（纯计算，无 I/O）
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
    skipInternalAuthAndRateLimit: true,
  }
);

/**
 * Fetch live depeg/peg deviations for position assets.
 * Non-blocking: errors are logged but don't fail the calculation.
 */
async function fetchLiveDepegDeviations(symbols: string[]): Promise<Record<string, number>> {
  const deviations: Record<string, number> = {};
  if (symbols.length === 0) return deviations;

  try {
    const [stablecoinSnapshots, wrappedSnapshots] = await Promise.allSettled([
      calculateAllStablecoinSnapshots(),
      calculateAllWrappedAssetSnapshots(),
    ]);

    if (stablecoinSnapshots.status === 'fulfilled') {
      for (const snapshot of stablecoinSnapshots.value) {
        if (symbols.includes(snapshot.symbol) && Math.abs(snapshot.maxDeviationPercent) > 0) {
          deviations[snapshot.symbol] = snapshot.maxDeviationPercent;
        }
      }
    }

    if (wrappedSnapshots.status === 'fulfilled') {
      for (const snapshot of wrappedSnapshots.value) {
        if (symbols.includes(snapshot.symbol) && Math.abs(snapshot.deviationPercent) > 0) {
          deviations[snapshot.symbol] = snapshot.deviationPercent;
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch live depeg/peg data, skipping live risk factor', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return deviations;
}
