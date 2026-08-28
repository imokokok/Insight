import {
  aggregateOracleWatchSeries,
  type OracleWatchHistoryPoint,
} from '@/lib/api/services/oracleWatchTrendService';

const point = (
  evaluatedAt: string,
  verdict: string,
  agreement: number,
  maxDeviationPct: number | null = null,
  participantCount = 5,
  mlRiskScore: number | null = null,
  mlRiskLevel: string | null = null
): OracleWatchHistoryPoint => ({
  evaluatedAt,
  verdict,
  recommendation: verdict === 'normal' ? 'proceed' : 'halt',
  maxDeviationPct,
  agreement,
  participantCount,
  mlRiskScore,
  mlRiskLevel: mlRiskLevel as never,
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
});
