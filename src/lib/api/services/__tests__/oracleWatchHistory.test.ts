import { fetchHistoricalOracleState, clearOracleHistoryCache } from '../oracleWatchHistory';

const mockLimit = jest.fn();
const mockRpc = jest.fn(() => ({ abortSignal: mockLimit }));
const mockCreateServiceRoleClient = jest.fn(() => ({ rpc: mockRpc }));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: mockCreateServiceRoleClient,
}));

/** Produce the canonical UTC hour keys stored by hourly_price_snapshots. */
function hoursAgo(n: number): string {
  const currentHour = Math.floor(Date.now() / 3600_000) * 3600_000;
  return new Date(currentHour - n * 3600_000).toISOString();
}

/**
 * Seed one row per (hour, deviation). Every hour gets the same provider set,
 * with `brokenDev` standing in for a feed that is simply wrong — e.g. a
 * cross-rate registered as a USD quote, parked at a fixed huge deviation.
 */
function seedHistory(hourDeviations: number[][], price = 100): void {
  const rows = hourDeviations.map((devs, i) => ({
    hour: hoursAgo(hourDeviations.length - i),
    max_deviation_pct: Math.max(...devs.map(Math.abs)),
    consensus_price: price,
    participant_count: devs.length,
  }));
  mockLimit.mockResolvedValue({ data: rows, error: null });
}

const live = { maxDeviationPct: 0.3, consensusPrice: 100, participantCount: 6 };

describe('fetchHistoricalOracleState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearOracleHistoryCache();
    mockCreateServiceRoleClient.mockImplementation(() => ({ rpc: mockRpc }));
    mockRpc.mockImplementation(() => ({ abortSignal: mockLimit }));
  });

  it('computes a normal z-score without clamping it', async () => {
    // Stable ~0.2% baseline; live 0.3% sits about +2 sd above it.
    seedHistory([[0.2], [0.2], [0.2], [0.2], [0.15], [0.25]]);

    const state = await fetchHistoricalOracleState('ETH', live);

    expect(state.history.length).toBe(6);
    expect(state.maxDeviationZscore24h).toBeGreaterThan(0);
    expect(Math.abs(state.maxDeviationZscore24h)).toBeLessThanOrEqual(10);
  });

  it('bounds the z-score when the baseline is poisoned by a broken feed', async () => {
    // Mirrors LINK/chainlink@Avalanche: a LINK/AVAX cross-rate registered as a
    // USD quote, parked near -86% every hour. The live value (outlier-excluded)
    // is 0.3%, so the unbounded formula yields roughly -779.
    seedHistory([
      [86.35, 0.2],
      [86.32, 0.2],
      [86.4, 0.2],
      [86.29, 0.2],
    ]);

    const state = await fetchHistoricalOracleState('LINK', live);

    expect(state.maxDeviationZscore24h).toBeGreaterThanOrEqual(-10);
    expect(state.maxDeviationZscore24h).toBeLessThanOrEqual(10);
  });

  it('reports no temporal signal when there are too few completed hours', async () => {
    // Fewer points than training's rolling(24, min_periods=3): a "24h baseline"
    // built from two points is not a 24h baseline.
    seedHistory([
      [86.35, 0.2],
      [86.32, 0.2],
    ]);

    const state = await fetchHistoricalOracleState('LINK', live);

    expect(state.maxDeviationZscore24h).toBe(0);
  });

  it('does not treat a gapped observation as the 1h predecessor', async () => {
    mockLimit.mockResolvedValue({
      data: [
        { hour: hoursAgo(3), max_deviation_pct: 0.2, consensus_price: 99, participant_count: 1 },
        { hour: hoursAgo(2), max_deviation_pct: 0.4, consensus_price: 100, participant_count: 1 },
      ],
      error: null,
    });

    const state = await fetchHistoricalOracleState('ETH', live);

    expect(state.deviationVelocity1h).toBe(0);
    expect(state.participantCountDelta1h).toBe(0);
    expect(state.deviationVelocity3h).toBeCloseTo(0.1, 4);
  });

  it('degrades to an empty history when the table has no rows', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    const state = await fetchHistoricalOracleState('ETH', live);

    expect(state.history).toEqual([]);
    expect(state.maxDeviationZscore24h).toBe(0);
    expect(state.rollingVolatility6h).toBe(0);
  });

  it('degrades to an empty history when the query fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const state = await fetchHistoricalOracleState('ETH', live);

    expect(state.history).toEqual([]);
    expect(state.maxDeviationZscore24h).toBe(0);
  });
  it('shares parallel historical reads while computing fresh live features', async () => {
    seedHistory([[0.2], [0.3], [0.4]]);
    const states = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        fetchHistoricalOracleState('ETH', { ...live, maxDeviationPct: i + 1 })
      )
    );
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(states[0].deviationVelocity1h).not.toBe(states[1].deviationVelocity1h);
    states[0].history[0].consensusPrice = 999;
    expect((await fetchHistoricalOracleState('ETH', live)).history[0].consensusPrice).toBe(100);
  });

  it('retries a failed query without caching it', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'temporary' } });
    expect((await fetchHistoricalOracleState('ETH', live)).history).toEqual([]);
    seedHistory([[0.2]]);
    expect((await fetchHistoricalOracleState('ETH', live)).history).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it.each([0, -1, 1.5, NaN])('rejects invalid participant count %s', async (count) => {
    mockLimit.mockResolvedValue({
      data: [
        {
          hour: hoursAgo(1),
          max_deviation_pct: 0.2,
          consensus_price: 100,
          participant_count: count,
        },
      ],
      error: null,
    });
    expect((await fetchHistoricalOracleState('ETH', live)).history).toEqual([]);
  });

  it('does not reuse a baseline across an hour boundary', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-27T05:59:59Z'));
    try {
      seedHistory([[0.2], [0.3], [0.4]]);
      await fetchHistoricalOracleState('ETH', live);
      clock.mockReturnValue(Date.parse('2026-09-27T06:00:01Z'));
      seedHistory([[0.2], [0.3], [0.4]]);
      await fetchHistoricalOracleState('ETH', live);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
    }
  });
});
