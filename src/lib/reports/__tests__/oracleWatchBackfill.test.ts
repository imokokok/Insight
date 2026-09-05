import {
  buildBackfillRowForHour,
  buildBackfillRows,
  type BackfillSourceRow,
} from '@/lib/reports/oracleWatchBackfill';

const HOUR = '2026-08-28T10:00:00.000Z';

const src = (symbol: string, price: number, dev: number, age = 0): BackfillSourceRow => ({
  symbol,
  snapshot_hour: HOUR,
  price,
  deviation_pct: dev,
  data_age_seconds: age,
  is_success: true,
});

describe('buildBackfillRowForHour', () => {
  it('computes max deviation, median consensus, agreement, and a normal verdict', () => {
    const row = buildBackfillRowForHour('ETH', HOUR, [
      src('ETH', 3000, 0.1),
      src('ETH', 3002, -0.05),
      src('ETH', 3001, 0.0),
    ]);
    expect(row.symbol).toBe('ETH');
    expect(row.chain).toBeNull();
    expect(row.verdict).toBe('normal');
    expect(row.recommendation).toBe('proceed');
    expect(row.max_deviation_pct).toBeCloseTo(0.1, 4);
    expect(row.consensus_price).toBe(3001);
    expect(row.participant_count).toBe(3);
    expect(row.outlier_count).toBe(0);
    expect(row.stale_count).toBe(0);
    expect(row.ml_risk_score).toBeNull();
    expect(row.min_reputation).toBeNull();
  });

  it('flags danger when max deviation breaches the danger threshold', () => {
    const row = buildBackfillRowForHour('BTC', HOUR, [
      src('BTC', 60000, 0.2),
      src('BTC', 57500, 3.5),
      src('BTC', 60100, 0.05),
    ]);
    expect(row.verdict).toBe('danger');
    expect(row.recommendation).toBe('halt');
    expect(row.max_deviation_pct).toBeCloseTo(3.5, 4);
  });

  it('flags caution when agreement drops below the caution threshold', () => {
    // Moderate price gap (~1.7% CV → agreement ~0.91, below 0.95 but above 0.85).
    const row = buildBackfillRowForHour('SOL', HOUR, [src('SOL', 171, 0.9), src('SOL', 174, 0.9)]);
    expect(row.agreement).toBeGreaterThanOrEqual(0.85);
    expect(row.agreement).toBeLessThan(0.95);
    expect(row.verdict).toBe('caution');
    expect(row.recommendation).toBe('proceed_with_caution');
  });

  it('counts stale providers using the 60s threshold', () => {
    const row = buildBackfillRowForHour('AVAX', HOUR, [
      src('AVAX', 30, 0.1, 59),
      src('AVAX', 30.01, 0.1, 120),
      src('AVAX', 29.99, 0.1, 5),
    ]);
    expect(row.stale_count).toBe(1);
  });

  it('detects a price outlier via per-hour z-score when participants >= 3', () => {
    // Many tight prices + one far price → the far price's z-score exceeds 2.5.
    const tight = Array.from({ length: 10 }, (_, i) => src('ARB', 1.0 + i * 0.001, 0.1));
    const row = buildBackfillRowForHour('ARB', HOUR, [...tight, src('ARB', 2.0, 3.5)]);
    expect(row.outlier_count).toBeGreaterThanOrEqual(1);
  });

  it('does not attempt outlier detection when fewer than 3 providers', () => {
    const row = buildBackfillRowForHour('LINK', HOUR, [src('LINK', 20, 0.1), src('LINK', 21, 4)]);
    expect(row.outlier_count).toBe(0);
    expect(row.verdict).toBe('danger');
  });
});

describe('buildBackfillRows', () => {
  it('groups multiple providers into one row per (symbol, hour)', () => {
    const rows: BackfillSourceRow[] = [
      src('BTC', 60000, 0.1, 1),
      src('BTC', 60010, 0.0, 1),
      src('ETH', 3000, 0.2, 1),
      src('ETH', 3001, 0.0, 1),
    ];
    const result = buildBackfillRows(rows);
    expect(result).toHaveLength(2);
    const btc = result.find((r) => r.symbol === 'BTC')!;
    const eth = result.find((r) => r.symbol === 'ETH')!;
    expect(btc.participant_count).toBe(2);
    expect(eth.participant_count).toBe(2);
  });
});
