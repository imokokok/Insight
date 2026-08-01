import modelJson from '@/../ml/models/oracle_risk_model.json';

import {
  featuresFromPreTrade,
  getModelStatus,
  scorePreTrade,
  type PreTradeFeatures,
} from '@/lib/ml/inference';

/**
 * These tests double as the end-to-end contract between the Python trainer
 * (XGBoost) and the pure-TS scorer. They only assert meaningful behavior when a
 * trained, active model is present; if the model is the inactive placeholder,
 * scorePreTrade must return null and the suite stays green.
 */
const model = modelJson as { active: boolean; verificationSamples?: Array<[number[], number]> };

describe('ml inference', () => {
  it('maps pre-trade metrics to the model feature vector in the correct order', () => {
    const f: PreTradeFeatures = {
      maxDeviationPct: 1.5,
      spreadPct: 2.0,
      participantCount: 8,
      staleDataRisk: true,
      meanDeviationPct: 0.5,
      staleRatio: 1.0,
      deviationVelocity1h: 0.3,
    };
    expect(featuresFromPreTrade(f)).toEqual([1.5, 2.0, 8, 1, 0.5, 1.0, 0.3]);
  });

  it('returns null when no active model is present (rules-only fallback)', () => {
    if (!model.active) {
      expect(
        scorePreTrade({
          maxDeviationPct: 1,
          spreadPct: 1,
          participantCount: 5,
          staleDataRisk: false,
          meanDeviationPct: 1,
          staleRatio: 0,
          deviationVelocity1h: 0,
        })
      ).toBeNull();
    }
  });

  it('activates and reproduces XGBoost probabilities on verification samples', () => {
    if (!model.active || !model.verificationSamples) return; // placeholder model

    // Self-verification must have passed for the model to be active.
    expect(getModelStatus().active).toBe(true);

    for (const [features, expected] of model.verificationSamples) {
      const input: PreTradeFeatures = {
        maxDeviationPct: features[0],
        spreadPct: features[1],
        participantCount: features[2],
        staleDataRisk: features[3] === 1,
        // features[4..6] only exist on the 7-feature model (absent on the legacy
        // 4-feature model); fall back to 0 so this stays green across models.
        meanDeviationPct: features[4] ?? 0,
        staleRatio: features[5] ?? 0,
        deviationVelocity1h: features[6] ?? 0,
      };
      const got = scorePreTrade(input);
      expect(got).not.toBeNull();
      // scorePreTrade rounds to 4 decimals; allow a small epsilon on top of the
      // model's own verification tolerance.
      expect(Math.abs((got as number) - expected)).toBeLessThan(0.015);
    }
  });

  it('scores a high-deviation state higher than a calm state', () => {
    if (!model.active) return;
    const calm = scorePreTrade({
      maxDeviationPct: 0.1,
      spreadPct: 0.1,
      participantCount: 10,
      staleDataRisk: false,
      meanDeviationPct: 0.1,
      staleRatio: 0,
      deviationVelocity1h: 0,
    });
    const risky = scorePreTrade({
      maxDeviationPct: 9,
      spreadPct: 6,
      participantCount: 3,
      staleDataRisk: true,
      meanDeviationPct: 8.5,
      staleRatio: 0.66,
      deviationVelocity1h: 4.0,
    });
    expect(risky).not.toBeNull();
    expect(calm).not.toBeNull();
    expect((risky as number) >= (calm as number)).toBe(true);
  });
});
