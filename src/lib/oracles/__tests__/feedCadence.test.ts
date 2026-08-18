import {
  percentile,
  isCadenceStale,
  CAUTION_STALE_MULTIPLIER,
  STALE_FLOOR_SECONDS,
  HARD_STALE_BLOCK_SECONDS,
} from '@/lib/oracles/feedCadence';

describe('percentile', () => {
  it('returns 0 for empty input', () => {
    expect(percentile([], 0.9)).toBe(0);
  });

  it('returns the only element for a single value', () => {
    expect(percentile([42], 0.9)).toBe(42);
  });

  it('computes p90 on sorted ranks (no interpolation)', () => {
    // 11 elements -> rank 9 (0-indexed) = the 10th element
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    expect(percentile(vals, 0.9)).toBe(10);
  });

  it('linearly interpolates between ranks', () => {
    // 10 elements -> rank 8.1 -> between sorted[8]=9 and sorted[9]=10 => 9.1
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(vals, 0.9)).toBeCloseTo(9.1, 5);
  });

  it('does not mutate the input array', () => {
    const vals = [3, 1, 2];
    percentile(vals, 0.5);
    expect(vals).toEqual([3, 1, 2]);
  });
});

describe('isCadenceStale', () => {
  it('never flags when no baseline is known (absence of evidence is not staleness)', () => {
    expect(isCadenceStale(1_000_000, null)).toBe(false);
    expect(isCadenceStale(1_000_000, 0)).toBe(false);
  });

  it('never flags below the absolute floor, even if far behind cadence', () => {
    const baseline = 900; // 15min
    // 1h (3600s) is > K*baseline but <= floor -> not stale
    expect(isCadenceStale(STALE_FLOOR_SECONDS, baseline)).toBe(false);
    expect(isCadenceStale(STALE_FLOOR_SECONDS - 1, baseline)).toBe(false);
  });

  it('flags a fast feed that falls ~8x behind its own rhythm', () => {
    const baseline = 900; // Chainlink ~15min p90
    const threshold = CAUTION_STALE_MULTIPLIER * baseline; // 7200s
    expect(isCadenceStale(threshold + 1, baseline)).toBe(true);
    expect(isCadenceStale(threshold, baseline)).toBe(false);
    expect(isCadenceStale(baseline, baseline)).toBe(false); // normal cadence
  });

  it('never falsely blocks a slow-but-healthy source (API3 ~24h cadence)', () => {
    const baseline = 86_400; // 24h p90
    // Normal 24h update is well within rhythm -> not stale.
    expect(isCadenceStale(86_400, baseline)).toBe(false);
    // Even 5 days old is still < 8x threshold -> not stale.
    expect(isCadenceStale(5 * 86_400, baseline)).toBe(false);
    // 10 days old -> genuinely stuck -> stale.
    expect(isCadenceStale(10 * 86_400, baseline)).toBe(true);
  });

  it('respects custom multiplier and floor', () => {
    // baseline=100, K=5 -> threshold 500, floor=500
    expect(isCadenceStale(400, 100, 5, 500)).toBe(false); // below floor
    expect(isCadenceStale(1000, 100, 5, 500)).toBe(true); // above both
  });
});

describe('HARD_STALE_BLOCK_SECONDS', () => {
  it('is 7 days', () => {
    expect(HARD_STALE_BLOCK_SECONDS).toBe(604800);
  });
});
