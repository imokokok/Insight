import { getReputationRankings } from '../reputationRankings';
import { reputationService, type OracleReputation } from '../reputationService';

jest.mock('../reputationService', () => ({
  reputationService: {
    getReputations: jest.fn(),
    seedInitialReputations: jest.fn(),
    getReputationTrend: jest.fn(),
  },
}));

const getReputations = jest.mocked(reputationService.getReputations);
const seedInitialReputations = jest.mocked(reputationService.seedInitialReputations);
const getReputationTrend = jest.mocked(reputationService.getReputationTrend);

function reputation(
  provider: OracleReputation['provider'],
  overallScore: number
): OracleReputation {
  return {
    provider,
    overall_score: overallScore,
    accuracy_score: 80,
    uptime_percentage: 99,
    reliability_score: 78,
    freshness_score: 82,
    avg_latency_ms: 500,
    avg_deviation_pct: 0.5,
    total_queries: 100,
    failed_queries: 2,
    supported_symbols_count: 9,
    supported_chains_count: 1,
    last_calculated_at: null,
  };
}

function trend(successRate: number) {
  return [
    {
      snapshot_time: '2026-09-01',
      success_rate: 0.5,
      avg_deviation_pct: 0,
      avg_latency_ms: 0,
      query_count: 1,
    },
    {
      snapshot_time: '2026-09-02',
      success_rate: successRate,
      avg_deviation_pct: 0,
      avg_latency_ms: 0,
      query_count: 1,
    },
  ];
}

it('keeps ranking output while loading each provider history once', async () => {
  const rows = [reputation('chainlink', 90), reputation('pyth', 80), reputation('band', 70)];
  getReputations.mockResolvedValue(rows);
  getReputationTrend.mockImplementation(async (provider) => {
    if (provider === 'chainlink') return trend(0.6);
    if (provider === 'pyth') return trend(0.9);
    return trend(0.7);
  });

  const rankings = await getReputationRankings(7);

  expect(
    rankings.map(({ provider, rank, previousRank, rankChange, trend: direction }) => ({
      provider,
      rank,
      previousRank,
      rankChange,
      direction,
    }))
  ).toEqual([
    { provider: 'chainlink', rank: 1, previousRank: 3, rankChange: 2, direction: 'up' },
    { provider: 'pyth', rank: 2, previousRank: 1, rankChange: -1, direction: 'down' },
    { provider: 'band', rank: 3, previousRank: 2, rankChange: -1, direction: 'down' },
  ]);
  expect(getReputationTrend).toHaveBeenCalledTimes(rows.length);
  expect(getReputationTrend).toHaveBeenCalledWith('chainlink', 7);
  expect(seedInitialReputations).not.toHaveBeenCalled();
});

it('returns seeded providers on the first request', async () => {
  getReputations.mockResolvedValueOnce([]).mockResolvedValueOnce([reputation('chainlink', 75)]);
  seedInitialReputations.mockResolvedValue();
  getReputationTrend.mockResolvedValue([]);

  const rankings = await getReputationRankings(7);

  expect(seedInitialReputations).toHaveBeenCalledTimes(1);
  expect(getReputations).toHaveBeenCalledTimes(2);
  expect(rankings).toEqual([
    expect.objectContaining({
      provider: 'chainlink',
      rank: 1,
      previousRank: null,
      rankChange: null,
      trend: 'no_data',
    }),
  ]);
});

it('keeps a provider without usable history unranked when its trend lookup fails', async () => {
  getReputations.mockResolvedValue([reputation('chainlink', 90), reputation('pyth', 80)]);
  getReputationTrend.mockImplementation(async (provider) => {
    if (provider === 'pyth') throw new Error('history unavailable');
    return trend(0.7);
  });

  const rankings = await getReputationRankings(7);

  expect(rankings[1]).toEqual(
    expect.objectContaining({
      provider: 'pyth',
      previousRank: null,
      rankChange: null,
      trend: 'no_data',
    })
  );
  expect(getReputationTrend).toHaveBeenCalledTimes(2);
});
