import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { reputationService } from '@/lib/oracles/services/reputationService';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
  type OracleWarning,
} from '@/lib/protocols/protocolHealth';
import { getProtocolById } from '@/lib/protocols/protocolRegistry';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

import { fetchPricesForPosition } from './priceQueries';

const logger = createLogger('api-protocol-health');

const AssetEntrySchema = z.object({
  symbol: z.string().min(1),
  amount: z.number().positive(),
});

const PositionCriticalRequestSchema = z
  .object({
    protocolId: z.string().min(1, 'Protocol ID is required'),
    // Multi-asset mode
    collaterals: z.array(AssetEntrySchema).min(1, 'At least one collateral is required').optional(),
    borrows: z.array(AssetEntrySchema).min(1, 'At least one borrow is required').optional(),
    // Backward compatible single-asset mode
    collateralSymbol: z.string().min(1).optional(),
    collateralAmount: z.number().positive().optional(),
    borrowSymbol: z.string().min(1).optional(),
    borrowAmount: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      // 多资产模式或单资产模式至少满足一种
      const hasMultiAsset =
        data.collaterals && data.collaterals.length > 0 && data.borrows && data.borrows.length > 0;
      const hasSingleAsset =
        data.collateralSymbol && data.collateralAmount && data.borrowSymbol && data.borrowAmount;
      return hasMultiAsset || hasSingleAsset;
    },
    { message: 'Provide either collaterals/borrows arrays or single collateral/borrow fields' }
  );

async function buildOracleWarnings(providers: OracleProvider[]): Promise<OracleWarning[]> {
  const warnings: OracleWarning[] = [];
  const uniqueProviders = [...new Set(providers)];

  const reputationMap = new Map<
    OracleProvider,
    Awaited<ReturnType<typeof reputationService.getReputation>>
  >();
  await Promise.all(
    uniqueProviders.map(async (provider) => {
      try {
        const rep = await reputationService.getReputation(provider);
        if (rep) reputationMap.set(provider, rep);
      } catch {
        logger.warn(`Failed to fetch reputation for ${provider}`);
      }
    })
  );

  for (const provider of uniqueProviders) {
    const rep = reputationMap.get(provider);
    if (!rep) {
      warnings.push({
        provider,
        overallScore: 0,
        freshnessScore: 0,
        reliabilityScore: 0,
        avgDeviationPct: 0,
        level: 'critical',
        message: `No reliability data available for ${provider}. Oracle performance is unknown, which adds uncertainty to the liquidation risk calculation.`,
      });
      continue;
    }

    const level: OracleWarning['level'] =
      rep.overall_score >= 80
        ? 'healthy'
        : rep.overall_score >= 60
          ? 'fair'
          : rep.overall_score >= 40
            ? 'degraded'
            : 'critical';

    const messages: string[] = [];
    if (rep.freshness_score < 60) {
      messages.push(
        `Data freshness is low (${rep.freshness_score.toFixed(0)}/100), price updates may be delayed`
      );
    }
    if (rep.reliability_score < 60) {
      messages.push(
        `Reliability score is degraded (${rep.reliability_score.toFixed(0)}/100), price may deviate from market`
      );
    }
    if (rep.avg_deviation_pct > 0.5) {
      messages.push(
        `Average deviation from consensus is ${rep.avg_deviation_pct.toFixed(2)}%, which may affect liquidation accuracy`
      );
    }
    if (rep.uptime_percentage < 95) {
      messages.push(
        `Uptime is ${rep.uptime_percentage.toFixed(1)}%, oracle outages could delay liquidation protection`
      );
    }

    warnings.push({
      provider,
      overallScore: rep.overall_score,
      freshnessScore: rep.freshness_score,
      reliabilityScore: rep.reliability_score,
      avgDeviationPct: rep.avg_deviation_pct,
      level,
      message:
        messages.length > 0
          ? messages.join('. ') + '.'
          : `${provider} oracle is operating normally with a reliability score of ${rep.overall_score.toFixed(0)}/100.`,
    });
  }

  return warnings;
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

    const input: PositionInput = validation.data as PositionInput;

    try {
      // Collect oracle providers used by this protocol's assets
      const protocol = getProtocolById(input.protocolId);
      const oracleProviders: OracleProvider[] = [];
      if (protocol) {
        const allSymbols = new Set<string>();
        (input.collaterals || []).forEach((c) => allSymbols.add(c.symbol));
        (input.borrows || []).forEach((b) => allSymbols.add(b.symbol));
        // Fallback for single-asset mode
        if (input.collateralSymbol) allSymbols.add(input.collateralSymbol);
        if (input.borrowSymbol) allSymbols.add(input.borrowSymbol);

        for (const symbol of allSymbols) {
          const asset = protocol.assets.find((a) => a.symbol === symbol);
          if (asset && !oracleProviders.includes(asset.oracleProvider)) {
            oracleProviders.push(asset.oracleProvider);
          }
        }
      }

      // Build oracle warnings in parallel with calculation
      const [result, oracleWarnings] = await Promise.all([
        calculatePositionCriticalDeviation(input, fetchPricesForPosition),
        buildOracleWarnings(oracleProviders),
      ]);

      // Merge warnings into result
      const resultWithWarnings = { ...result, oracleWarnings };

      return NextResponse.json({
        success: true,
        data: resultWithWarnings,
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
