import { reputationService } from '@/lib/oracles/services/reputationService';
import { type OracleProvider } from '@/types/oracle';

import { ProviderReputationInputSchema, ReputationRankingsInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getReputationRankingsTool: McpToolDefinition<typeof ReputationRankingsInputSchema> = {
  name: 'get_reputation_rankings',
  description: 'Get oracle provider reputation rankings with trend over a period (1-90 days).',
  parameters: ReputationRankingsInputSchema,
  handler: async (args) => {
    const currentReputations = await reputationService.getReputations();

    if (currentReputations.length === 0) {
      await reputationService.seedInitialReputations();
    }

    const currentRanking = currentReputations
      .sort((a, b) => b.overall_score - a.overall_score)
      .map((rep, index) => ({
        rank: index + 1,
        provider: rep.provider,
        overallScore: rep.overall_score,
        accuracyScore: rep.accuracy_score,
        uptimePercentage: rep.uptime_percentage,
        reliabilityScore: rep.reliability_score,
        freshnessScore: rep.freshness_score,
        avgLatencyMs: rep.avg_latency_ms,
        avgDeviationPct: rep.avg_deviation_pct,
      }));

    const rankChanges = await Promise.all(
      currentRanking.map(async (entry) => {
        let previousRank: number | null = null;
        let change: number | null = null;

        try {
          const trend = await reputationService.getReputationTrend(
            entry.provider as Parameters<typeof reputationService.getReputationTrend>[0],
            args.days
          );

          if (trend.length >= 2) {
            const allEarliestScores = await Promise.all(
              currentReputations.map(async (rep) => {
                const t = await reputationService.getReputationTrend(
                  rep.provider as Parameters<typeof reputationService.getReputationTrend>[0],
                  args.days
                );
                return {
                  provider: rep.provider,
                  score: t.length > 0 ? t[t.length - 1].success_rate * 100 : rep.overall_score,
                };
              })
            );

            allEarliestScores.sort((a, b) => b.score - a.score);
            previousRank = allEarliestScores.findIndex((e) => e.provider === entry.provider) + 1;

            if (previousRank > 0) {
              change = previousRank - entry.rank;
            }
          }
        } catch {
          // ignore
        }

        return {
          ...entry,
          previousRank,
          rankChange: change,
          trend:
            change !== null ? (change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged') : 'no_data',
        };
      })
    );

    const scores = currentRanking.map((r) => r.overallScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const lines = [
      `**Oracle provider reputation rankings (${args.days}d trend)**`,
      `- Total providers: ${currentRanking.length}`,
      `- Average score: ${avgScore.toFixed(1)}`,
      '',
      '**Rankings:**',
    ];

    for (const r of rankChanges) {
      const changeText =
        r.rankChange !== null
          ? ` (${r.rankChange > 0 ? '+' : ''}${r.rankChange} rank, ${r.trend})`
          : '';
      lines.push(
        `#${r.rank} ${r.provider.toUpperCase()}: score ${r.overallScore.toFixed(1)}${changeText}`
      );
    }

    return lines.join('\n');
  },
};

export const getProviderReputationTool: McpToolDefinition<typeof ProviderReputationInputSchema> = {
  name: 'get_provider_reputation',
  description:
    'Get detailed reputation metrics for a specific oracle provider, optionally with historical trend.',
  parameters: ProviderReputationInputSchema,
  handler: async (args) => {
    const reputation = await reputationService.getReputation(args.provider as OracleProvider);

    if (!reputation) {
      return `No reputation data available for ${args.provider.toUpperCase()}.`;
    }

    const lines = [
      `**Oracle reputation: ${reputation.provider.toUpperCase()}**`,
      `- Overall score: ${reputation.overall_score.toFixed(1)}/100`,
      `- Accuracy score: ${reputation.accuracy_score.toFixed(1)}`,
      `- Reliability score: ${reputation.reliability_score.toFixed(1)}`,
      `- Freshness score: ${reputation.freshness_score.toFixed(1)}`,
      `- Uptime: ${reputation.uptime_percentage.toFixed(2)}%`,
      `- Avg latency: ${reputation.avg_latency_ms.toFixed(0)}ms`,
      `- Avg deviation: ${reputation.avg_deviation_pct.toFixed(4)}%`,
      `- Total queries: ${reputation.total_queries}`,
      `- Failed queries: ${reputation.failed_queries}`,
      `- Supported symbols: ${reputation.supported_symbols_count}`,
      `- Supported chains: ${reputation.supported_chains_count}`,
      reputation.last_calculated_at ? `- Last calculated: ${reputation.last_calculated_at}` : '',
    ];

    if (args.trend) {
      const trend = await reputationService.getReputationTrend(
        args.provider as OracleProvider,
        args.days
      );
      lines.push('', `**${args.days}d trend (${trend.length} points):**`);
      for (const point of trend.slice(0, 10)) {
        lines.push(
          `- ${point.snapshot_time}: success rate ${(point.success_rate * 100).toFixed(1)}%, avg deviation ${point.avg_deviation_pct.toFixed(4)}%, avg latency ${point.avg_latency_ms.toFixed(0)}ms`
        );
      }
      if (trend.length > 10) {
        lines.push('', `... and ${trend.length - 10} more data points.`);
      }
    }

    return lines.filter(Boolean).join('\n');
  },
};
