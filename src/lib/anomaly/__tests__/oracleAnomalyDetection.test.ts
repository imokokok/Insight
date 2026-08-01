import { computeAnomalyScore } from '@/lib/anomaly/oracleAnomalyDetection';
import type { HourlyDeviationPoint } from '@/lib/anomaly/oracleAnomalyDetection';

/** Build N hourly points with a constant deviation (flat baseline). */
function flat(n: number, dev: number): HourlyDeviationPoint[] {
  return Array.from({ length: n }, () => ({
    maxDeviationPct: dev,
    consensusPrice: 100,
    participantCount: 5,
  }));
}

/** Build N hourly points with a small jittered baseline around `base`. */
function jittered(n: number, base: number, amp: number): HourlyDeviationPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    maxDeviationPct: base + Math.sin(i) * amp,
    consensusPrice: 100,
    participantCount: 5,
  }));
}

describe('computeAnomalyScore', () => {
  it('returns a near-zero score on cold start (< 3 history points)', () => {
    const r = computeAnomalyScore(flat(2, 0.1), 5.0);
    expect(r.anomalyScore).toBe(0);
    expect(r.driver).toBe('insufficient-data');
    expect(r.elevated).toBe(false);
  });

  it('does not false-alarm when the live value sits within the baseline range', () => {
    // Baseline ~0.5% with realistic ±0.3 spread; live value at the mean.
    const r = computeAnomalyScore(jittered(24, 0.5, 0.3), 0.5);
    expect(r.anomalyScore).toBeLessThan(0.5);
    expect(r.elevated).toBe(false);
  });

  it('flags a sudden spike well above the 24h baseline', () => {
    // Calm 24h baseline near 0.2%, then a 9% live deviation -> strong outlier.
    const r = computeAnomalyScore(jittered(24, 0.2, 0.05), 9.0);
    expect(r.anomalyScore).toBeGreaterThan(0.5);
    expect(r.elevated).toBe(true);
    // z-score should be large and positive.
    expect(r.zScore).toBeGreaterThan(2);
  });

  it('detects a spike over a flat (zero-variance) baseline via the gap ratio', () => {
    // Flat 0.5% baseline, live jumps to 3% (6x) -> flat driver, elevated.
    const r = computeAnomalyScore(flat(24, 0.5), 3.0);
    expect(r.driver).toBe('flat');
    expect(r.anomalyScore).toBeGreaterThan(0.5);
    expect(r.elevated).toBe(true);
  });

  it('stays calm when the live value matches the flat baseline', () => {
    const r = computeAnomalyScore(flat(24, 0.5), 0.5);
    expect(r.anomalyScore).toBeLessThan(0.5);
    expect(r.elevated).toBe(false);
  });

  it('produces a bounded score in [0, 1] and deterministic z-score', () => {
    const r = computeAnomalyScore(jittered(24, 1.0, 0.3), 4.0);
    expect(r.anomalyScore).toBeGreaterThanOrEqual(0);
    expect(r.anomalyScore).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.zScore)).toBe(true);
  });

  it('uses only the last 24 history points (older data is ignored)', () => {
    // 48 points: first 24 are wild, last 24 are calm. Only the calm window
    // should drive the baseline. Assert by direct comparison: scoring the
    // full series must equal scoring just the calm tail — proving the older
    // wild window never enters the baseline, regardless of score magnitude.
    const wild: HourlyDeviationPoint[] = Array.from({ length: 24 }, () => ({
      maxDeviationPct: 8,
      consensusPrice: 100,
      participantCount: 5,
    }));
    const calm = jittered(24, 0.2, 0.05);
    const full = computeAnomalyScore([...wild, ...calm], 9.0);
    const onlyCalm = computeAnomalyScore(calm, 9.0);
    expect(full.anomalyScore).toBe(onlyCalm.anomalyScore);
    expect(full.zScore).toBe(onlyCalm.zScore);
  });
});
