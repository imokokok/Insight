import { HARD_STALE_BLOCK_SECONDS } from '@/lib/oracles/feedCadence';

import { evaluateStalenessRules } from '../stalenessPolicy';

const detail = (price: number, age: number) => ({
  price,
  deviationPct: 0,
  isOutlier: false,
  dataAgeSeconds: age,
  isStale: false,
  confidence: null,
  reputationScore: null,
  status: 'success' as const,
  countsTowardOracleQuorum: true,
});

describe('staleness policy', () => {
  it('treats an old timestamp aligned with fresh consensus as caution, not block', () => {
    const providerPrices = { fresh: detail(100, 60), stale: detail(101, HARD_STALE_BLOCK_SECONDS) };
    const result = evaluateStalenessRules({
      providerPrices,
      stalenessBaselines: new Map(),
      maxAge: HARD_STALE_BLOCK_SECONDS,
      staleProviders: [],
      staleRisk: false,
    });
    expect(result.verdict).toBe('CAUTION');
    expect(providerPrices.stale.timestampAnomaly).toBe(true);
  });
  it('blocks an old feed that diverges from fresh consensus', () => {
    const result = evaluateStalenessRules({
      providerPrices: { fresh: detail(100, 60), stale: detail(105, HARD_STALE_BLOCK_SECONDS) },
      stalenessBaselines: new Map(),
      maxAge: HARD_STALE_BLOCK_SECONDS,
      staleProviders: [],
      staleRisk: false,
    });
    expect(result.verdict).toBe('BLOCK');
  });
});
