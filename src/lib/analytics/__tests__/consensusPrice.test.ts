import {
  calculateConsensusPrice,
  recordConsensusHistory,
  resetConsensusHistory,
  type ConsensusPriceInput,
} from '../consensusPrice';

function makeInput(overrides: Partial<ConsensusPriceInput> = {}): ConsensusPriceInput {
  return {
    provider: 'test',
    price: 50000,
    timestamp: Date.now(),
    confidence: 0.9,
    ...overrides,
  };
}

function makeDualInputs(
  priceA: number,
  priceB: number,
  providerA = 'chainlink',
  providerB = 'redstone',
  confA = 0.9,
  confB = 0.9
): ConsensusPriceInput[] {
  return [
    makeInput({ provider: providerA, price: priceA, confidence: confA }),
    makeInput({ provider: providerB, price: priceB, confidence: confB }),
  ];
}

describe('consensusPrice - dual-source anomaly detection', () => {
  beforeEach(() => {
    resetConsensusHistory();
  });

  describe('detectOutliers - two sources within threshold', () => {
    it('should keep both sources when deviation is within stablecoin threshold', () => {
      const inputs = makeDualInputs(1.0001, 0.9999, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'USDC');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
      expect(result.excludedProviders).toEqual([]);
    });

    it('should keep both sources when deviation is within major crypto threshold', () => {
      const inputs = makeDualInputs(50000, 50500, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });

    it('should keep both sources when deviation is within alt threshold', () => {
      const inputs = makeDualInputs(100, 103, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'LINK');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });

    it('should keep both sources when deviation is within micro cap threshold', () => {
      const inputs = makeDualInputs(0.00001, 0.000012, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'SHIB');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });
  });

  describe('detectOutliers - two sources exceeding threshold', () => {
    it('should detect anomaly when stablecoin deviation exceeds 0.5%', () => {
      const inputs = makeDualInputs(1.0, 1.01, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'USDC');

      expect(result.excludedCount).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBe('low');
    });

    it('should detect anomaly when BTC deviation exceeds 5%', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidenceLevel).toBe('low');
    });

    it('should detect anomaly when alt deviation exceeds 15%', () => {
      const inputs = makeDualInputs(100, 120, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'LINK');

      expect(['low', 'very_low']).toContain(result.confidenceLevel);
    });
  });

  describe('confidence-based resolution for dual sources', () => {
    it('should exclude lower-confidence source when deviation exceeds threshold', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('redstone');
      expect(result.participantCount).toBe(1);
    });

    it('should exclude source with wider confidence interval', () => {
      const inputs: ConsensusPriceInput[] = [
        makeInput({
          provider: 'chainlink',
          price: 50000,
          confidence: 0.95,
          confidenceInterval: { bid: 49990, ask: 50010, widthPercentage: 0.04 },
        }),
        makeInput({
          provider: 'redstone',
          price: 55000,
          confidence: 0.5,
          confidenceInterval: { bid: 54000, ask: 56000, widthPercentage: 3.6 },
        }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('redstone');
    });

    it('should keep both when confidence scores are similar', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.9, 0.88);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });
  });

  describe('history-based resolution for dual sources', () => {
    it('should exclude source that deviates from historical consensus', () => {
      const historyKey = 'BTC';
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        recordConsensusHistory(historyKey, {
          price: 50000 + i * 10,
          confidence: 0.9,
          agreement: 0.95,
          method: 'median',
          participantCount: 5,
          timestamp: now - (10 - i) * 60000,
        });
      }

      const inputs = makeDualInputs(50050, 60000, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('redstone');
      expect(result.price).toBeCloseTo(50050, -1);
    });

    it('should keep both when both deviate equally from history', () => {
      const historyKey = 'BTC';
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        recordConsensusHistory(historyKey, {
          price: 50000,
          confidence: 0.9,
          agreement: 0.95,
          method: 'median',
          participantCount: 5,
          timestamp: now - (10 - i) * 60000,
        });
      }

      const inputs = makeDualInputs(55000, 45000, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(2);
    });

    it('should fall back to confidence when history is insufficient', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('redstone');
    });
  });

  describe('single source outlier detection', () => {
    it('should keep single source when no history exists', () => {
      const inputs = [makeInput({ provider: 'chainlink', price: 50000 })];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(1);
      expect(result.excludedCount).toBe(0);
    });

    it('should detect single source outlier against history', () => {
      const historyKey = 'BTC';
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        recordConsensusHistory(historyKey, {
          price: 50000,
          confidence: 0.9,
          agreement: 0.95,
          method: 'median',
          participantCount: 5,
          timestamp: now - (10 - i) * 60000,
        });
      }

      const inputs = [makeInput({ provider: 'chainlink', price: 80000 })];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(0);
      expect(result.excludedCount).toBe(1);
    });

    it('should keep single source within historical range', () => {
      const historyKey = 'BTC';
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        recordConsensusHistory(historyKey, {
          price: 50000,
          confidence: 0.9,
          agreement: 0.95,
          method: 'median',
          participantCount: 5,
          timestamp: now - (10 - i) * 60000,
        });
      }

      const inputs = [makeInput({ provider: 'chainlink', price: 50500 })];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(1);
    });
  });

  describe('confidence level downgrade for dual sources', () => {
    it('should cap confidence at low or very_low when dual sources have outliers excluded', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      if (result.excludedCount > 0) {
        expect(['low', 'very_low']).toContain(result.confidenceLevel);
        expect(result.confidence).toBeLessThanOrEqual(0.39);
      }
    });

    it('should cap confidence at medium when dual sources agree', () => {
      const inputs = makeDualInputs(50000, 50100, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidence).toBeLessThanOrEqual(0.59);
      expect(['low', 'medium']).toContain(result.confidenceLevel);
    });

    it('should not cap confidence for 3+ sources', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 50000, confidence: 0.95 }),
        makeInput({ provider: 'switchboard', price: 50100, confidence: 0.95 }),
        makeInput({ provider: 'redstone', price: 49900, confidence: 0.95 }),
        makeInput({ provider: 'api3', price: 50050, confidence: 0.95 }),
        makeInput({ provider: 'dia', price: 50020, confidence: 0.95 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidence).toBeGreaterThan(0.59);
    });
  });

  describe('iqrFilteredMethod with dual sources', () => {
    it('should return average when dual sources agree within threshold', () => {
      const inputs = makeDualInputs(50000, 50100, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'BTC');

      expect(result.price).toBeCloseTo(50050, -1);
    });

    it('should prefer higher-confidence source when dual sources diverge', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'BTC');

      expect(result.price).toBe(50000);
    });
  });

  describe('stablecoin-specific strict thresholds', () => {
    it('should flag 0.6% deviation for stablecoins', () => {
      const inputs = makeDualInputs(1.0, 1.006, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'USDT');

      expect(result.confidenceLevel).toBe('low');
    });

    it('should accept 0.3% deviation for stablecoins', () => {
      const inputs = makeDualInputs(1.0, 1.003, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'USDT');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });
  });

  describe('three or more sources still work correctly', () => {
    it('should use Z-score detection for 3+ sources', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 50000, confidence: 0.95 }),
        makeInput({ provider: 'switchboard', price: 50100, confidence: 0.95 }),
        makeInput({ provider: 'redstone', price: 49900, confidence: 0.95 }),
        makeInput({ provider: 'api3', price: 50050, confidence: 0.95 }),
        makeInput({ provider: 'dia', price: 50020, confidence: 0.95 }),
        makeInput({ provider: 'supra', price: 49980, confidence: 0.95 }),
        makeInput({ provider: 'twap', price: 50030, confidence: 0.95 }),
        makeInput({ provider: 'reflector', price: 50010, confidence: 0.95 }),
        makeInput({ provider: 'flare', price: 49950, confidence: 0.95 }),
        makeInput({ provider: 'bad_oracle', price: 200000, confidence: 0.5 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('bad_oracle');
      expect(result.participantCount).toBe(9);
    });

    it('should not cap confidence for 3+ sources', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 50000, confidence: 0.95 }),
        makeInput({ provider: 'switchboard', price: 50100, confidence: 0.95 }),
        makeInput({ provider: 'redstone', price: 49900, confidence: 0.95 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidence).toBeGreaterThan(0.59);
    });
  });

  describe('robust outlier gate (median + MAD)', () => {
    it('detects a grossly contaminated provider at n=6, where the old z-score cap made it impossible', () => {
      // Mirrors the live BNB incident: TWAP returned 6.14e20 (an un-normalised
      // wei value) while five providers clustered around 689. At n=6 the old
      // gate's ceiling was (n-1)/√n = 2.041, below its 2.5 threshold, so the
      // contaminant always survived and inflated maxDeviationPct to 8.9e19.
      const inputs = [
        makeInput({ provider: 'chainlink', price: 688.95 }),
        makeInput({ provider: 'redstone', price: 688.55 }),
        makeInput({ provider: 'dia', price: 688.82 }),
        makeInput({ provider: 'supra', price: 690.3 }),
        makeInput({ provider: 'winklink', price: 686.0 }),
        makeInput({ provider: 'twap', price: 6.14e20 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BNB');

      expect(result.excludedProviders).toContain('twap');
      expect(result.participantCount).toBe(5);
      // Median of the five healthy providers.
      expect(result.price).toBeCloseTo(688.82, 1);
    });

    it('does not flag healthy providers when the cluster is extremely tight', () => {
      // Mirrors live USDT: chainlink sat 0.017% off a very tight cluster. Pure
      // MAD produces a huge modified z-score there (MAD approaches zero) and
      // would drop a perfectly good provider, so the material-deviation floor
      // has to hold it in.
      const inputs = [
        makeInput({ provider: 'chainlink', price: 1.00017 }),
        makeInput({ provider: 'redstone', price: 1.0 }),
        makeInput({ provider: 'dia', price: 1.0 }),
        makeInput({ provider: 'api3', price: 1.00001 }),
        makeInput({ provider: 'twap', price: 1.0 }),
        makeInput({ provider: 'reflector', price: 1.00002 }),
        makeInput({ provider: 'flare', price: 1.00014 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'USDT');

      expect(result.excludedProviders).not.toContain('chainlink');
      expect(result.excludedProviders).not.toContain('flare');
      expect(result.participantCount).toBe(7);
    });

    it('caps exclusions at a third of participants so a majority can never be dropped', () => {
      // Collusion guard. Nine providers, four badly corrupted. Without a cap
      // all four would be removed; the cap keeps participantCount from
      // collapsing toward the coverage floor on the strength of the gate alone.
      const inputs = [
        makeInput({ provider: 'p1', price: 50000 }),
        makeInput({ provider: 'p2', price: 50010 }),
        makeInput({ provider: 'p3', price: 49990 }),
        makeInput({ provider: 'p4', price: 50020 }),
        makeInput({ provider: 'p5', price: 49980 }),
        makeInput({ provider: 'bad1', price: 80000 }),
        makeInput({ provider: 'bad2', price: 81000 }),
        makeInput({ provider: 'bad3', price: 79000 }),
        makeInput({ provider: 'bad4', price: 80500 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedCount).toBe(3);
      expect(result.participantCount).toBe(6);
      // One corrupted source survives the cap, but the median resists it:
      // median(49980, 49990, 50000, 50010, 50020, 79000) = 50005.
      expect(result.price).toBeCloseTo(50005, 0);
    });
  });

  describe('freshness guard (consensus-aware stale exclusion)', () => {
    it('excludes a stale, price-divergent participant and drops it from coverage', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 62000, dataAgeSeconds: 7200, confidence: 0.95 }),
        makeInput({ provider: 'redstone', price: 64500, dataAgeSeconds: 10, confidence: 0.95 }),
        makeInput({ provider: 'dia', price: 64600, dataAgeSeconds: 30, confidence: 0.95 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('chainlink');
      // 62000 sits 3.88% off the 64500/64600 cluster — both materially AND
      // statistically significant, so the robust price gate removes it before
      // the freshness guard ever runs, and its coverage goes with it.
      //
      // The previous z-score gate could not fire here at all: at n=3 its cap
      // is (n-1)/√n = 1.155, far below the 2.5 threshold. The stale source
      // therefore used to survive detection AND count toward coverage.
      expect(result.participantCount).toBe(2);
      // Price uses the surviving subset (redstone/dia), not the stale 62000.
      expect(result.price).toBeCloseTo(64550, -2);
    });

    it('keeps a participant with an old timestamp but a consensus price (API3-like timestamp anomaly)', () => {
      const inputs = [
        makeInput({ provider: 'api3', price: 64500, dataAgeSeconds: 10_000_000, confidence: 0.95 }),
        makeInput({ provider: 'redstone', price: 64500, dataAgeSeconds: 10, confidence: 0.95 }),
        makeInput({ provider: 'dia', price: 64600, dataAgeSeconds: 30, confidence: 0.95 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      // Timestamp anomaly: old `updatedAt` but price in consensus -> NOT excluded.
      expect(result.excludedProviders).not.toContain('api3');
      expect(result.participantCount).toBe(3);
      // API3's fresh price IS included in the aggregate; median of [64500,64500,64600] = 64500.
      expect(result.price).toBeCloseTo(64500, -2);
    });

    it('does not exclude anyone when all participants are old and divergent (fallback to valid)', () => {
      const inputs = [
        makeInput({ provider: 'a', price: 60000, dataAgeSeconds: 7200, confidence: 0.9 }),
        makeInput({ provider: 'b', price: 69000, dataAgeSeconds: 7200, confidence: 0.9 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      // Fresh subset would be empty (<2) -> fall back to valid, no exclusion.
      expect(result.excludedProviders).not.toContain('a');
      expect(result.excludedProviders).not.toContain('b');
      expect(result.participantCount).toBe(2);
    });

    it('ignores freshness when no dataAgeSeconds is supplied, but the price gate still applies', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 62000 }),
        makeInput({ provider: 'redstone', price: 64500 }),
        makeInput({ provider: 'dia', price: 64600 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      // No age info -> the freshness guard cannot fire. The robust price gate
      // is age-independent, so a materially divergent source is still dropped.
      // Under the old z-score gate this case was indistinguishable from
      // "no exclusion" because n=3 capped the score at 1.155.
      expect(result.excludedProviders).toContain('chainlink');
      expect(result.participantCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty inputs', () => {
      const result = calculateConsensusPrice([], 'median', 'BTC');

      expect(result.price).toBe(0);
      expect(result.confidenceLevel).toBe('very_low');
    });

    it('should handle inputs with zero prices', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 0 }),
        makeInput({ provider: 'redstone', price: 50000 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(1);
    });

    it('should handle inputs with Infinity prices', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: Infinity }),
        makeInput({ provider: 'redstone', price: 50000 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(1);
    });

    it('should work without symbol context', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'redstone', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median');

      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });
  });
});
