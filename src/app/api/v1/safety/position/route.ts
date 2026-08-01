import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { fetchPricesForPosition } from '@/lib/api/services/priceQueries';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
  type OracleWarning,
} from '@/lib/protocols/protocolHealth';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';
import { type OracleProvider } from '@/types/oracle';

const AssetEntrySchema = z.object({
  symbol: z.string().min(1),
  amount: z.number().positive(),
});

const PositionSafetyRequestSchema = z
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
      const hasMultiAsset =
        data.collaterals && data.collaterals.length > 0 && data.borrows && data.borrows.length > 0;
      const hasSingleAsset =
        data.collateralSymbol && data.collateralAmount && data.borrowSymbol && data.borrowAmount;
      return hasMultiAsset || hasSingleAsset;
    },
    { message: 'Provide either collaterals/borrows arrays or single collateral/borrow fields' }
  );

interface ProviderSymbolMapping {
  provider: OracleProvider;
  symbols: string[];
}

function formatSymbolList(symbols: string[]): string {
  if (symbols.length === 0) return 'your assets';
  if (symbols.length === 1) return symbols[0];
  return `${symbols.slice(0, -1).join(', ')} and ${symbols[symbols.length - 1]}`;
}

function buildOracleImpact(
  provider: OracleProvider,
  issues: Array<{ type: 'freshness' | 'reliability' | 'deviation' | 'uptime'; value: number }>,
  symbols: string[]
): string {
  const symbolText = formatSymbolList(symbols);

  if (issues.length === 0) {
    return `${provider} is currently operating normally for ${symbolText}, so oracle risk should not materially affect your position.`;
  }

  const primary = issues[0];
  switch (primary.type) {
    case 'freshness':
      return `${provider} price updates for ${symbolText} are delayed (freshness ${primary.value.toFixed(0)}/100). If your position approaches liquidation, the liquidation price may not reflect the latest market movement.`;
    case 'reliability':
      return `${provider} has been unstable for ${symbolText} (reliability ${primary.value.toFixed(0)}/100). The oracle price used to value your position may drift from the true market price.`;
    case 'deviation':
      return `${provider} is currently ${primary.value.toFixed(2)}% away from the market consensus for ${symbolText}. This means your effective liquidation threshold could be higher or lower than calculated.`;
    case 'uptime':
      return `${provider} has had recent outages for ${symbolText} (uptime ${primary.value.toFixed(1)}%). If it fails when your position is near liquidation, the protocol may not be able to trigger protection in time.`;
    default:
      return `${provider} shows signs of degraded oracle health for ${symbolText}, which adds uncertainty to your liquidation risk.`;
  }
}

async function buildOracleWarnings(
  providerMappings: ProviderSymbolMapping[]
): Promise<OracleWarning[]> {
  const warnings: OracleWarning[] = [];
  const uniqueProviders = [...new Set(providerMappings.map((m) => m.provider))];

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
        // Silently skip providers with unavailable reputation data
      }
    })
  );

  for (const mapping of providerMappings) {
    const { provider, symbols } = mapping;
    const rep = reputationMap.get(provider);
    if (!rep) {
      warnings.push({
        provider,
        overallScore: 0,
        freshnessScore: 0,
        reliabilityScore: 0,
        avgDeviationPct: 0,
        level: 'critical',
        message: `No reliability data available for ${provider}. Oracle performance is unknown.`,
        impact: `We cannot verify ${provider}'s current health for ${formatSymbolList(symbols)}. Consider this an additional uncertainty when judging your safety buffer.`,
        affectedSymbols: symbols,
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
    const issues: Array<{
      type: 'freshness' | 'reliability' | 'deviation' | 'uptime';
      value: number;
    }> = [];

    if (rep.freshness_score < 60) {
      messages.push(
        `Data freshness is low (${rep.freshness_score.toFixed(0)}/100), price updates may be delayed`
      );
      issues.push({ type: 'freshness', value: rep.freshness_score });
    }
    if (rep.reliability_score < 60) {
      messages.push(
        `Reliability score is degraded (${rep.reliability_score.toFixed(0)}/100), price may deviate from market`
      );
      issues.push({ type: 'reliability', value: rep.reliability_score });
    }
    if (rep.avg_deviation_pct > 0.5) {
      messages.push(
        `Average deviation from consensus is ${rep.avg_deviation_pct.toFixed(2)}%, which may affect liquidation accuracy`
      );
      issues.push({ type: 'deviation', value: rep.avg_deviation_pct });
    }
    if (rep.uptime_percentage < 95) {
      messages.push(
        `Uptime is ${rep.uptime_percentage.toFixed(1)}%, oracle outages could delay liquidation protection`
      );
      issues.push({ type: 'uptime', value: rep.uptime_percentage });
    }

    const message =
      messages.length > 0
        ? messages.join('. ') + '.'
        : `${provider} oracle is operating normally with a reliability score of ${rep.overall_score.toFixed(0)}/100.`;

    warnings.push({
      provider,
      overallScore: rep.overall_score,
      freshnessScore: rep.freshness_score,
      reliabilityScore: rep.reliability_score,
      avgDeviationPct: rep.avg_deviation_pct,
      level,
      message,
      impact: buildOracleImpact(provider, issues, symbols),
      affectedSymbols: symbols,
    });
  }

  return warnings;
}

async function fetchLiveAssetDeviations(symbols: string[]): Promise<Record<string, number>> {
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
  } catch {
    // Non-blocking: errors don't fail the calculation
  }

  return deviations;
}

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON in request body', {
          requestId: context.requestId,
        }),
        { status: 400 }
      );
    }

    const validation = PositionSafetyRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Validation failed', {
          requestId: context.requestId,
          details: { errors },
        }),
        { status: 400 }
      );
    }

    const input: PositionInput = validation.data as PositionInput;

    try {
      // Collect all symbols in the position
      const allSymbols = new Set<string>();
      (input.collaterals || []).forEach((c) => allSymbols.add(c.symbol));
      (input.borrows || []).forEach((b) => allSymbols.add(b.symbol));
      if (input.collateralSymbol) allSymbols.add(input.collateralSymbol);
      if (input.borrowSymbol) allSymbols.add(input.borrowSymbol);

      // Collect oracle providers used by this protocol's assets
      const protocol = await getProtocolByIdWithDynamicData(input.protocolId);
      const providerSymbolMap = new Map<OracleProvider, Set<string>>();
      if (protocol) {
        for (const symbol of allSymbols) {
          const asset = protocol.assets.find(
            (a: { symbol: string; oracleProvider: OracleProvider }) => a.symbol === symbol
          );
          if (asset) {
            const existing = providerSymbolMap.get(asset.oracleProvider) ?? new Set<string>();
            existing.add(symbol);
            providerSymbolMap.set(asset.oracleProvider, existing);
          }
        }
      }

      const providerMappings: ProviderSymbolMapping[] = Array.from(providerSymbolMap.entries()).map(
        ([provider, symbols]) => ({ provider, symbols: Array.from(symbols) })
      );

      const oracleWarnings = await buildOracleWarnings(providerMappings);
      const liveAssetDeviations = await fetchLiveAssetDeviations(
        allSymbols.size > 0 ? Array.from(allSymbols) : []
      );

      const result = await calculatePositionCriticalDeviation(
        input,
        fetchPricesForPosition,
        oracleWarnings,
        liveAssetDeviations
      );

      const response = NextResponse.json(
        ApiResponseBuilder.success({ ...result, oracleWarnings }, { requestId: context.requestId })
      );

      response.headers.set('Cache-Control', CACHE_PRESETS.noStore);

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        ApiResponseBuilder.error('CALCULATION_ERROR', message, {
          requestId: context.requestId,
        }),
        { status: 500 }
      );
    }
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
  }
);
