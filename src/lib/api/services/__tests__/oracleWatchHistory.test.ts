import { fetchHistoricalOracleState } from '../oracleWatchHistory';

const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockGte = jest.fn(() => ({ order: mockOrder }));
const mockEqSuccess = jest.fn(() => ({ gte: mockGte }));
const mockEqSymbol = jest.fn(() => ({ eq: mockEqSuccess }));
const mockSelect = jest.fn(() => ({ eq: mockEqSymbol }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => ({ from: mockFrom })),
}));

/** Hour keys must be >= 45 min old to count as completed hours. */
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

/**
 * Seed one row per (hour, deviation). Every hour gets the same provider set,
 * with `brokenDev` standing in for a feed that is simply wrong — e.g. a
 * cross-rate registered as a USD quote, parked at a fixed huge deviation.
 */
function seedHistory(hourDeviations: number[][], price = 100): void {
  const rows: Array<{ snapshot_hour: string; deviation_pct: number; price: number }> = [];
  hourDeviations.forEach((devs, i) => {
    for (const d of devs) {
      rows.push({
        snapshot_hour: hoursAgo(hourDeviations.length - i + 1),
        deviation_pct: d,
        price,
      });
    }
  });
  mockLimit.mockResolvedValue({ data: rows, error: null });
}

const live = { maxDeviationPct: 0.3, consensusPrice: 100, participantCount: 6 };

describe('fetchHistoricalOracleState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation(() => ({ select: mockSelect }));
    mockSelect.mockImplementation(() => ({ eq: mockEqSymbol }));
    mockEqSymbol.mockImplementation(() => ({ eq: mockEqSuccess }));
    mockEqSuccess.mockImplementation(() => ({ gte: mockGte }));
    mockGte.mockImplementation(() => ({ order: mockOrder }));
    mockOrder.mockImplementation(() => ({ limit: mockLimit }));
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
});
