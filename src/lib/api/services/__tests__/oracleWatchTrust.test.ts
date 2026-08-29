import { describe, expect, it } from '@jest/globals';

import { computeOracleWatchTrust } from '../oracleWatchTrust';

const base = {
  agreement: 0.99,
  maxDeviationPct: 0.2,
  mlRiskScore: 0.1,
  outlierCount: 0,
  staleCount: 0,
  avgReputation: 90,
  minReputation: 85,
};

describe('computeOracleWatchTrust', () => {
  it('rewards deep quorum, tight agreement/deviation, low ML risk and reputation', () => {
    const t = computeOracleWatchTrust({ ...base, participantCount: 5 });

    expect(t.score).toBeGreaterThanOrEqual(75);
    expect(t.level).toBe('high');
  });

  it('drops to low when there is no cross-oracle coverage', () => {
    const t = computeOracleWatchTrust({
      ...base,
      participantCount: 0,
      agreement: 0,
      maxDeviationPct: null,
      mlRiskScore: null,
    });

    expect(t.level).toBe('low');
    expect(t.score).toBeLessThan(50);
    expect(t.components.quorum).toBe(0);
    expect(t.components.agreement).toBe(0);
    expect(t.components.deviation).toBe(0);
  });

  it('never rates a below-quorum signal above low, even when every other component is perfect', () => {
    // Two providers always "agree" with a median computed from themselves, so
    // perfect agreement/deviation/reputation must not outvote the coverage
    // shortfall — otherwise the score contradicts the danger/halt verdict
    // returned in the same response.
    for (const participantCount of [1, 2]) {
      const t = computeOracleWatchTrust({
        ...base,
        participantCount,
        agreement: 1,
        maxDeviationPct: 0.001,
        mlRiskScore: 0.05,
        avgReputation: 98,
        minReputation: 98,
      });

      expect(t.level).toBe('low');
      expect(t.score).toBeLessThan(50);
      expect(t.components.quorum).toBe(0);
    }
  });

  it('still rewards coverage once the quorum floor is met', () => {
    const atFloor = computeOracleWatchTrust({ ...base, participantCount: 3 });
    const belowFloor = computeOracleWatchTrust({ ...base, participantCount: 2 });

    expect(atFloor.score).toBeGreaterThan(belowFloor.score);
    expect(atFloor.components.quorum).toBeGreaterThan(0);
  });

  it('penalizes low quorum, high ML risk and dirty feeds', () => {
    const high = computeOracleWatchTrust({
      ...base,
      participantCount: 5,
      mlRiskScore: 0.9,
      outlierCount: 1,
      staleCount: 0,
      minReputation: 30,
    });
    const low = computeOracleWatchTrust({ ...base, participantCount: 5 });

    expect(high.score).toBeLessThan(low.score);
  });

  it('is neutral on ML and reputation when they are unknown', () => {
    const t = computeOracleWatchTrust({
      ...base,
      participantCount: 4,
      mlRiskScore: null,
      avgReputation: null,
      minReputation: null,
    });

    expect(t.components.ml).toBeCloseTo(0.5, 3);
    expect(t.components.reputation).toBeCloseTo(0.5, 3);
  });

  it('clamps score into 0-100', () => {
    const t = computeOracleWatchTrust({
      agreement: 0,
      maxDeviationPct: 10,
      mlRiskScore: 1,
      outlierCount: 5,
      staleCount: 5,
      avgReputation: 1,
      minReputation: 1,
      participantCount: 0,
    });
    expect(t.score).toBeGreaterThanOrEqual(0);
    expect(t.score).toBeLessThanOrEqual(100);
  });
});
