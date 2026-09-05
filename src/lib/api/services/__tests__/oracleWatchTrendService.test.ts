import {
  aggregateOracleWatchSeries,
  resolveOracleWatchHistoryInterval,
  summarizeOracleWatchSeries,
  type OracleWatchHistoryPoint,
  type OracleWatchTrustLevel,
} from '@/lib/api/services/oracleWatchTrendService';

const point = (
  evaluatedAt: string,
  verdict: string,
  agreement: number,
  maxDeviationPct: number | null = null,
  participantCount = 5,
  mlRiskScore: number | null = null,
  mlRiskLevel: string | null = null,
  trustScore: number | null = null,
  trustLevel: OracleWatchTrustLevel | null = null
): OracleWatchHistoryPoint => ({
  evaluatedAt,
  verdict,
  recommendation: verdict === 'normal' ? 'proceed' : 'halt',
  maxDeviationPct,
  agreement,
  participantCount,
  mlRiskScore,
  mlRiskLevel: mlRiskLevel as never,
  trustScore,
  trustLevel,
});

describe('aggregateOracleWatchSeries', () => {
  it('returns the raw series unchanged for the default 30min grain', () => {
    const series = [
      point('2026-08-28T00:00:00.000Z', 'normal', 0.99),
      point('2026-08-28T00:30:00.000Z', 'caution', 0.9),
    ];
    expect(aggregateOracleWatchSeries(series, '30min')).toHaveLength(2);
  });

  it('collapses multiple 30-min points into one row per hour, keeping the worst verdict and max deviation', () => {
    const series = [
      point('2026-08-28T00:00:00.000Z', 'normal', 0.99, 0.2, 5),
      point('2026-08-28T00:30:00.000Z', 'danger', 0.7, 4.2, 6),
      point('2026-08-28T01:00:00.000Z', 'caution', 0.93, 1.2, 5),
    ];
    const hourly = aggregateOracleWatchSeries(series, 'hourly');
    expect(hourly).toHaveLength(2);
    expect(hourly[0].evaluatedAt).toBe('2026-08-28T00:00:00.000Z');
    expect(hourly[0].verdict).toBe('danger');
    expect(hourly[0].maxDeviationPct).toBe(4.2);
    expect(hourly[0].participantCount).toBe(6);
    expect(hourly[1].evaluatedAt).toBe('2026-08-28T01:00:00.000Z');
    expect(hourly[1].verdict).toBe('caution');
  });

  it('averages agreement within a bucket', () => {
    const series = [
      point('2026-08-28T00:00:00.000Z', 'normal', 1.0),
      point('2026-08-28T00:30:00.000Z', 'normal', 0.8),
    ];
    const hourly = aggregateOracleWatchSeries(series, 'hourly');
    expect(hourly[0].agreement).toBeCloseTo(0.9, 4);
  });

  it('buckets by day for the daily grain with truncation to UTC day', () => {
    const series = [
      point('2026-08-27T23:59:00.000Z', 'normal', 0.99),
      point('2026-08-28T00:00:00.000Z', 'danger', 0.7),
      point('2026-08-28T12:00:00.000Z', 'caution', 0.9),
    ];
    const daily = aggregateOracleWatchSeries(series, 'daily');
    expect(daily).toHaveLength(2);
    expect(daily[0].evaluatedAt).toBe('2026-08-27T00:00:00.000Z');
    expect(daily[0].verdict).toBe('normal');
    expect(daily[1].evaluatedAt).toBe('2026-08-28T00:00:00.000Z');
    expect(daily[1].verdict).toBe('danger');
  });

  it('keeps the worst (lowest) trust score within an hourly bucket', () => {
    const series = [
      point('2026-08-28T00:00:00.000Z', 'normal', 0.99, 0.2, 5, null, null, 88, 'high'),
      point('2026-08-28T00:30:00.000Z', 'caution', 0.9, 1.6, 5, null, null, 44, 'low'),
    ];
    const hourly = aggregateOracleWatchSeries(series, 'hourly');
    expect(hourly[0].trustScore).toBe(44);
    expect(hourly[0].trustLevel).toBe('low');
  });
});

describe('resolveOracleWatchHistoryInterval', () => {
  it('keeps raw 30-minute points only for windows up to 7 days', () => {
    expect(resolveOracleWatchHistoryInterval(7, '30min')).toBe('30min');
    expect(resolveOracleWatchHistoryInterval(8, '30min')).toBe('hourly');
  });

  it('rolls windows over 30 days up to daily points', () => {
    expect(resolveOracleWatchHistoryInterval(30, 'hourly')).toBe('hourly');
    expect(resolveOracleWatchHistoryInterval(31, 'hourly')).toBe('daily');
    expect(resolveOracleWatchHistoryInterval(90, '30min')).toBe('daily');
  });

  it('respects an explicitly coarser grain', () => {
    expect(resolveOracleWatchHistoryInterval(7, 'daily')).toBe('daily');
    expect(resolveOracleWatchHistoryInterval(30, 'daily')).toBe('daily');
  });
});

describe('summarizeOracleWatchSeries', () => {
  it('returns the empty default when there are no points', () => {
    const summary = summarizeOracleWatchSeries([]);
    expect(summary.pointCount).toBe(0);
    expect(summary.currentVerdict).toBeNull();
    expect(summary.stabilityScore).toBe(0);
    expect(summary.trustScore).toBeNull();
    expect(summary.trustLevel).toBeNull();
    expect(summary.lastCollectedAt).toBeNull();
  });

  it('computes stability, degraded ratio and mean trust from the series', () => {
    const summary = summarizeOracleWatchSeries([
      point('2026-08-28T00:00:00.000Z', 'normal', 0.99, 0.2, 5, null, null, 90, 'high'),
      point('2026-08-28T00:30:00.000Z', 'normal', 0.98, 0.3, 5, null, null, 82, 'high'),
      point('2026-08-28T01:00:00.000Z', 'danger', 0.7, 4.2, 3, null, null, 30, 'low'),
    ]);

    expect(summary.pointCount).toBe(3);
    expect(summary.normal).toBe(2);
    expect(summary.danger).toBe(1);
    expect(summary.degradedRatio).toBeCloseTo(1 / 3, 4);
    expect(summary.stabilityScore).toBeCloseTo(66.67, 2);
    expect(summary.trustScore).toBe(67); // Math.round((90+82+30)/3)
    expect(summary.trustLevel).toBe('medium');
    expect(summary.currentVerdict).toBe('danger');
    expect(summary.maxDeviationPct).toBe(4.2);
  });
});
