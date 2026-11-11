import { computeMaxDeviation, computeSpread, computeStaleRisk } from '../marketMetricsPolicy';

const detail = (
  overrides: Partial<{
    price: number;
    deviationPct: number | null;
    isOutlier: boolean;
    dataAgeSeconds: number | null;
  }> = {}
) => ({
  price: 100,
  deviationPct: 0,
  isOutlier: false,
  dataAgeSeconds: 10,
  mlIsStale: false,
  isStale: false,
  confidence: null,
  reputationScore: null,
  status: 'success' as const,
  countsTowardOracleQuorum: true,
  ...overrides,
});

describe('market metrics policy', () => {
  it('excludes an outlier unless every provider is an outlier', () => {
    const prices = {
      a: detail({ deviationPct: 1 }),
      b: detail({ deviationPct: 9, isOutlier: true }),
    };
    expect(computeMaxDeviation(prices)).toBe(1);
    expect(
      computeSpread({
        a: detail({ price: 100, isOutlier: true }),
        b: detail({ price: 110, isOutlier: true }),
      })
    ).toBeCloseTo(9.5238);
  });

  it('only marks known-cadence quorum providers as stale', () => {
    const original = process.env.ENABLE_CADENCE_CAUTION;
    process.env.ENABLE_CADENCE_CAUTION = 'true';
    const prices = {
      fast: detail({ dataAgeSeconds: 5000 }),
      unknown: detail({ dataAgeSeconds: 9999 }),
    };
    const result = computeStaleRisk(
      prices,
      new Map([
        ['fast', 60],
        ['unknown', null],
      ])
    );
    expect(result).toMatchObject({ staleRisk: true, staleProviders: ['fast'], maxAge: 9999 });
    process.env.ENABLE_CADENCE_CAUTION = original;
  });
});
