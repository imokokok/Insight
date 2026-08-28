import modelJson from '@/../ml/models/oracle_risk_model.json';

import {
  featuresFromPreTrade,
  getModelStatus,
  scorePreTrade,
  scorePreTradeMultiHorizon,
  type PreTradeFeatures,
} from '@/lib/ml/inference';

/**
 * These tests double as the end-to-end contract between the Python trainer
 * (XGBoost) and the pure-TS scorer. They handle both the v2 dual-horizon model
 * (horizons: { "1h", "6h" }) and the legacy v1 single-model shape.
 */

// snake_case (trainer) -> camelCase (PreTradeFeatures) for sample round-tripping.
const FEATURE_KEY: Record<string, keyof PreTradeFeatures> = {
  max_deviation_pct: 'maxDeviationPct',
  cross_provider_spread_pct: 'spreadPct',
  participant_count: 'participantCount',
  stale: 'staleDataRisk', // int 0/1 -> boolean
  mean_deviation_pct: 'meanDeviationPct',
  stale_ratio: 'staleRatio',
  deviation_velocity_1h: 'deviationVelocity1h',
  rolling_volatility_6h: 'rollingVolatility6h',
  deviation_velocity_3h: 'deviationVelocity3h',
  participant_count_delta_1h: 'participantCountDelta1h',
  max_deviation_zscore_24h: 'maxDeviationZscore24h',
  // --- v3 governance features (optional in PreTradeFeatures; numeric) ---
  agreement: 'agreement',
  outlier_count: 'outlierCount',
  stale_count: 'staleCount',
  avg_reputation: 'avgReputation',
  min_reputation: 'minReputation',
};

const BASE_FEATURES: PreTradeFeatures = {
  maxDeviationPct: 0,
  spreadPct: 0,
  participantCount: 5,
  staleDataRisk: false,
  meanDeviationPct: 0,
  staleRatio: 0,
  deviationVelocity1h: 0,
  rollingVolatility6h: 0,
  deviationVelocity3h: 0,
  participantCountDelta1h: 0,
  maxDeviationZscore24h: 0,
};

function featuresFromSample(featureNames: string[], sample: number[]): PreTradeFeatures {
  const f: PreTradeFeatures = { ...BASE_FEATURES };
  featureNames.forEach((name, i) => {
    const key = FEATURE_KEY[name];
    if (!key) return;
    const v = sample[i];
    (f as Record<string, unknown>)[key] = name === 'stale' ? v === 1 : v;
  });
  return f;
}

// Normalize the committed model into a list of {name, horizon} for both shapes.
function getHorizons(): Array<{
  name: string;
  featureNames: string[];
  verificationSamples?: Array<[number[], number]>;
}> {
  const raw = modelJson as unknown as {
    version?: number;
    active: boolean;
    horizons?: Record<string, unknown>;
  };
  if (raw.version === 2 && raw.horizons) {
    return Object.entries(raw.horizons)
      .filter(
        ([, h]) =>
          h && (h as { trees?: unknown[] }).trees && (h as { trees: unknown[] }).trees.length > 0
      )
      .map(([name, h]) => {
        const hd = h as { featureNames: string[]; verificationSamples?: Array<[number[], number]> };
        return { name, featureNames: hd.featureNames, verificationSamples: hd.verificationSamples };
      });
  }
  // v1 legacy: single model at top level, treated as 6h.
  const v1 = modelJson as unknown as {
    active: boolean;
    featureNames: string[];
    verificationSamples?: Array<[number[], number]>;
    trees?: unknown[];
  };
  if (!v1.active || !v1.trees || v1.trees.length === 0) return [];
  return [
    { name: '6h', featureNames: v1.featureNames, verificationSamples: v1.verificationSamples },
  ];
}

const horizons = getHorizons();
const anyActive = horizons.length > 0;

describe('ml inference', () => {
  it('maps pre-trade metrics to a feature map keyed by the trainer feature names', () => {
    const f: PreTradeFeatures = {
      ...BASE_FEATURES,
      maxDeviationPct: 1.5,
      spreadPct: 2.0,
      participantCount: 8,
      staleDataRisk: true,
      meanDeviationPct: 0.5,
      staleRatio: 1.0,
      deviationVelocity1h: 0.3,
      rollingVolatility6h: 0.9,
      deviationVelocity3h: 0.6,
      participantCountDelta1h: -1,
      maxDeviationZscore24h: 2.1,
    };
    const map = featuresFromPreTrade(f);
    expect(map.max_deviation_pct).toBe(1.5);
    expect(map.cross_provider_spread_pct).toBe(2.0);
    expect(map.participant_count).toBe(8);
    expect(map.stale).toBe(1);
    expect(map.mean_deviation_pct).toBe(0.5);
    expect(map.stale_ratio).toBe(1.0);
    expect(map.deviation_velocity_1h).toBe(0.3);
    expect(map.rolling_volatility_6h).toBe(0.9);
    expect(map.deviation_velocity_3h).toBe(0.6);
    expect(map.participant_count_delta_1h).toBe(-1);
    expect(map.max_deviation_zscore_24h).toBe(2.1);
  });

  it('applies neutral defaults for the optional 30-min governance features when absent', () => {
    // A pre-trade caller passes only the 11 core features — the richer 30-min
    // governance features must degrade to their documented neutral prior so a
    // retrained model (16 features) scores pre-trade consistently with training.
    const map = featuresFromPreTrade(BASE_FEATURES);
    expect(map.agreement).toBe(1); // perfect agreement ⇒ no 30-min signal
    expect(map.outlier_count).toBe(0);
    expect(map.stale_count).toBe(0);
    expect(map.avg_reputation).toBe(0.5); // unknown reputation
    expect(map.min_reputation).toBe(0.5);
  });

  it('honors explicitly supplied 30-min governance features', () => {
    const map = featuresFromPreTrade({
      ...BASE_FEATURES,
      agreement: 0.4,
      outlierCount: 2,
      staleCount: 1,
      avgReputation: 0.6,
      minReputation: 0.2,
    });
    expect(map.agreement).toBe(0.4);
    expect(map.outlier_count).toBe(2);
    expect(map.stale_count).toBe(1);
    expect(map.avg_reputation).toBe(0.6);
    expect(map.min_reputation).toBe(0.2);
  });

  it('returns null when no active model is present (rules-only fallback)', () => {
    if (anyActive) return;
    expect(scorePreTrade(BASE_FEATURES)).toBeNull();
  });

  it("activates and reproduces XGBoost probabilities on every horizon's verification samples", () => {
    if (!anyActive) return; // placeholder/null model

    // Self-verification must have passed for the model to be active at all.
    expect(getModelStatus().active).toBe(true);

    for (const h of horizons) {
      if (!h.verificationSamples || h.verificationSamples.length === 0) continue;
      for (const [sample, expected] of h.verificationSamples) {
        const input = featuresFromSample(h.featureNames, sample);
        const result = scorePreTradeMultiHorizon(input);
        expect(result).not.toBeNull();
        const got = h.name === '1h' ? result!.score1h : result!.score6h;
        expect(got).not.toBeNull();
        // scorePreTrade rounds to 4 decimals; allow a small epsilon on top of
        // the model's own verification tolerance.
        expect(Math.abs((got as number) - expected)).toBeLessThan(0.015);
      }
    }
  });

  it('scores a high-deviation state at least as high as a calm state (combined)', () => {
    if (!anyActive) return;
    const calm = scorePreTrade({
      ...BASE_FEATURES,
      maxDeviationPct: 0.1,
      spreadPct: 0.1,
      participantCount: 10,
    });
    const risky = scorePreTrade({
      ...BASE_FEATURES,
      maxDeviationPct: 9,
      spreadPct: 6,
      participantCount: 3,
      staleDataRisk: true,
      meanDeviationPct: 8.5,
      staleRatio: 0.66,
      deviationVelocity1h: 4.0,
      maxDeviationZscore24h: 3.0,
    });
    expect(risky).not.toBeNull();
    expect(calm).not.toBeNull();
    expect((risky as number) >= (calm as number)).toBe(true);
  });

  it('exposes the active horizons in model status', () => {
    if (!anyActive) return;
    const status = getModelStatus();
    expect(status.active).toBe(true);
    expect(status.horizons.length).toBeGreaterThan(0);
    // The strategic 6h horizon must always be present when the model is active.
    expect(status.horizons).toContain('6h');
  });
});
