import { fetchPricesForPosition } from '@/lib/api/services/priceQueries';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
  type OracleWarning,
} from '@/lib/protocols/protocolHealth';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';
import { type OracleProvider } from '@/types/oracle';

import { formatAsText, formatPercent } from './formatters';
import { PositionSafetyInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

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
    // non-blocking
  }

  return deviations;
}

async function buildOracleWarnings(
  protocolId: string,
  symbols: string[]
): Promise<OracleWarning[]> {
  const { reputationService } = await import('@/lib/oracles/services/reputationService');
  const protocol = await getProtocolByIdWithDynamicData(protocolId);
  if (!protocol) return [];

  const providerSymbols = new Map<OracleProvider, Set<string>>();
  for (const symbol of symbols) {
    const asset = protocol.assets.find((a) => a.symbol === symbol);
    if (!asset) continue;
    const existing = providerSymbols.get(asset.oracleProvider) ?? new Set<string>();
    existing.add(symbol);
    providerSymbols.set(asset.oracleProvider, existing);
  }

  const warnings: OracleWarning[] = [];
  for (const [provider, symbolsSet] of providerSymbols.entries()) {
    let rep: Awaited<ReturnType<typeof reputationService.getReputation>> = null;
    try {
      rep = await reputationService.getReputation(provider);
    } catch {
      // ignore
    }

    const affectedSymbols = Array.from(symbolsSet);
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

    const level: OracleWarning['level'] =
      rep.overall_score >= 80
        ? 'healthy'
        : rep.overall_score >= 60
          ? 'fair'
          : rep.overall_score >= 40
            ? 'degraded'
            : 'critical';

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

    const allSymbols = new Set<string>();
    (input.collaterals || []).forEach((c) => allSymbols.add(c.symbol));
    (input.borrows || []).forEach((b) => allSymbols.add(b.symbol));
    if (input.collateralSymbol) allSymbols.add(input.collateralSymbol);
    if (input.borrowSymbol) allSymbols.add(input.borrowSymbol);

    const [oracleWarnings, liveAssetDeviations] = await Promise.all([
      buildOracleWarnings(input.protocolId, Array.from(allSymbols)),
      fetchLiveAssetDeviations(Array.from(allSymbols)),
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
