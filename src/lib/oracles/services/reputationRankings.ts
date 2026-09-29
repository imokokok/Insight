import { reputationService, type OracleReputation } from './reputationService';

export interface ReputationRanking {
  rank: number;
  provider: OracleReputation['provider'];
  overallScore: number;
  accuracyScore: number;
  uptimePercentage: number;
  reliabilityScore: number;
  freshnessScore: number;
  avgLatencyMs: number;
  avgDeviationPct: number;
  previousRank: number | null;
  rankChange: number | null;
  trend: 'up' | 'down' | 'unchanged' | 'no_data';
}

export async function getReputationRankings(days: number): Promise<ReputationRanking[]> {
  let reputations = await reputationService.getReputations();
  if (reputations.length === 0) {
    await reputationService.seedInitialReputations();
    reputations = await reputationService.getReputations();
  }

  const currentRanking = [...reputations]
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

  // Each provider's history is needed both for its eligibility and for the
  // comparison ranking. Fetch it once and reuse the same snapshot throughout.
  const histories = await Promise.all(
    currentRanking.map(async (entry) => {
      try {
        return await reputationService.getReputationTrend(entry.provider, days);
      } catch {
        return [];
      }
    })
  );

  const previousRanks = new Map(
    currentRanking
      .map((entry, index) => ({
        provider: entry.provider,
        score:
          histories[index].length > 0
            ? histories[index][histories[index].length - 1].success_rate * 100
            : entry.overallScore,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => [entry.provider, index + 1] as const)
  );

  return currentRanking.map((entry, index) => {
    const previousRank =
      histories[index].length >= 2 ? (previousRanks.get(entry.provider) ?? null) : null;
    const rankChange = previousRank === null ? null : previousRank - entry.rank;

    return {
      ...entry,
      previousRank,
      rankChange,
      trend:
        rankChange === null
          ? 'no_data'
          : rankChange > 0
            ? 'up'
            : rankChange < 0
              ? 'down'
              : 'unchanged',
    };
  });
}
