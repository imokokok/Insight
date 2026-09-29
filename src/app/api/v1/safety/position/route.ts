import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import {
  PositionSafetyRequestSchema,
  classifyOracleIssues,
  classifyOracleReputation,
  fetchLiveAssetDeviations,
  fetchOracleReputations,
  getPositionSymbols,
  mapPositionProviders,
  type OracleIssue,
  type ProviderSymbolMapping,
} from '@/lib/api/services/positionSafetyShared';
import { fetchPricesForPosition } from '@/lib/api/services/priceQueries';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
  type OracleWarning,
} from '@/lib/protocols/protocolHealth';
import { type OracleProvider } from '@/types/oracle';

function formatSymbolList(symbols: string[]): string {
  if (symbols.length === 0) return 'your assets';
  if (symbols.length === 1) return symbols[0];
  return `${symbols.slice(0, -1).join(', ')} and ${symbols[symbols.length - 1]}`;
}

function buildOracleImpact(
  provider: OracleProvider,
  issues: OracleIssue[],
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
  const reputationMap = await fetchOracleReputations(providerMappings);

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

    const level = classifyOracleReputation(rep.overall_score);

    const { messages, issues } = classifyOracleIssues(rep);

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
      const allSymbols = getPositionSymbols(input);

      // Collect oracle providers used by this protocol's assets
      const protocol = await getProtocolByIdWithDynamicData(input.protocolId);
      const providerMappings = mapPositionProviders(allSymbols, protocol?.assets ?? []);

      const oracleWarnings = await buildOracleWarnings(providerMappings);
      const liveAssetDeviations = await fetchLiveAssetDeviations(allSymbols);

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
