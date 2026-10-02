import {
  classifyOracleReputation,
  fetchLiveAssetDeviations,
  getPositionSymbols,
  mapPositionProviders,
} from '@/lib/api/services/positionSafetyShared';
import { fetchPricesForPosition } from '@/lib/api/services/priceQueries';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
  type OracleWarning,
} from '@/lib/protocols/protocolHealth';

import { formatAsText, formatPercent } from './formatters';
import { PositionSafetyInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

async function buildOracleWarnings(
  protocolId: string,
  symbols: string[]
): Promise<OracleWarning[]> {
  const { reputationService } = await import('@/lib/oracles/services/reputationService');
  const protocol = await getProtocolByIdWithDynamicData(protocolId);
  if (!protocol) return [];

  const providerMappings = mapPositionProviders(symbols, protocol.assets);

  const warnings: OracleWarning[] = [];
  for (const { provider, symbols: affectedSymbols } of providerMappings) {
    let rep: Awaited<ReturnType<typeof reputationService.getReputation>> = null;
    try {
      rep = await reputationService.getReputation(provider);
    } catch {
      // ignore
    }

    if (!rep) {
      warnings.push({
        provider,
        overallScore: 0,
        freshnessScore: 0,
        reliabilityScore: 0,
        avgDeviationPct: 0,
        level: 'critical',
        message: `No reliability data available for ${provider}.`,
        impact: `Oracle performance for ${affectedSymbols.join(', ')} is unknown.`,
        affectedSymbols,
      });
      continue;
    }

    const level = classifyOracleReputation(rep.overall_score);

    const issues: string[] = [];
    if (rep.freshness_score < 60) issues.push('freshness low');
    if (rep.reliability_score < 60) issues.push('reliability degraded');
    if (rep.avg_deviation_pct > 0.5)
      issues.push(`avg deviation ${rep.avg_deviation_pct.toFixed(2)}%`);
    if (rep.uptime_percentage < 95) issues.push(`uptime ${rep.uptime_percentage.toFixed(1)}%`);

    warnings.push({
      provider,
      overallScore: rep.overall_score,
      freshnessScore: rep.freshness_score,
      reliabilityScore: rep.reliability_score,
      avgDeviationPct: rep.avg_deviation_pct,
      level,
      message:
        issues.length > 0
          ? `${provider}: ${issues.join(', ')}`
          : `${provider} is operating normally.`,
      impact: `${provider} reliability score ${rep.overall_score.toFixed(0)}/100 for ${affectedSymbols.join(', ')}.`,
      affectedSymbols,
    });
  }

  return warnings;
}

export const checkPositionSafetyTool: McpToolDefinition<typeof PositionSafetyInputSchema> = {
  name: 'check_position_safety',
  description:
    'Check the safety of a DeFi lending position against oracle deviation stress tests. Supports multi-asset or single-asset positions.',
  parameters: PositionSafetyInputSchema,
  handler: async (args) => {
    const input: PositionInput = args as PositionInput;

    const allSymbols = getPositionSymbols(input);

    const [oracleWarnings, liveAssetDeviations] = await Promise.all([
      buildOracleWarnings(input.protocolId, allSymbols),
      fetchLiveAssetDeviations(allSymbols),
    ]);

    const result = await calculatePositionCriticalDeviation(
      input,
      fetchPricesForPosition,
      oracleWarnings,
      liveAssetDeviations
    );

    const lines = [
      `**Position safety check: ${result.protocolName ?? input.protocolId}**`,
      `- Current health factor: ${result.currentHealthFactor?.toFixed(4) ?? 'N/A'}`,
      `- Oracle-adjusted buffer: ${formatPercent(result.safetyBuffer?.bufferPercent ?? 0)}`,
      `- Critical deviation: ${formatPercent(result.worstDeviation?.criticalDeviationPercent ?? 0)}`,
      `- Liquidation threshold: ${formatPercent((result.liquidationThreshold ?? 0) * 100)}`,
      `- Collateral value USD: $${result.totalCollateralValue?.toLocaleString() ?? 'N/A'}`,
      `- Borrow value USD: $${result.totalBorrowValue?.toLocaleString() ?? 'N/A'}`,
      '',
      '**Oracle warnings:**',
    ];

    if (oracleWarnings.length === 0) {
      lines.push('No oracle warnings for the requested assets.');
    } else {
      for (const w of oracleWarnings) {
        lines.push(
          `- ${w.provider.toUpperCase()}: ${w.level.toUpperCase()} (${w.overallScore.toFixed(0)}/100) — ${w.message}`
        );
      }
    }

    if (result.deviationScenarios && result.deviationScenarios.length > 0) {
      lines.push('', '**Stress-test scenarios:**');
      for (const scenario of result.deviationScenarios.slice(0, 5)) {
        lines.push(formatAsText(scenario));
      }
    }

    return lines.filter(Boolean).join('\n');
  },
};
