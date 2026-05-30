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
  providerB = 'pyth',
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
      const inputs = makeDualInputs(1.0001, 0.9999, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'USDC');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
      expect(result.excludedProviders).toEqual([]);
    });

    it('should keep both sources when deviation is within major crypto threshold', () => {
      const inputs = makeDualInputs(50000, 50500, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });

    it('should keep both sources when deviation is within alt threshold', () => {
      const inputs = makeDualInputs(100, 103, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'LINK');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });

    it('should keep both sources when deviation is within micro cap threshold', () => {
      const inputs = makeDualInputs(0.00001, 0.000012, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'SHIB');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });
  });

  describe('detectOutliers - two sources exceeding threshold', () => {
    it('should detect anomaly when stablecoin deviation exceeds 0.5%', () => {
      const inputs = makeDualInputs(1.0, 1.01, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'USDC');

      expect(result.excludedCount).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBe('low');
    });

    it('should detect anomaly when BTC deviation exceeds 5%', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidenceLevel).toBe('low');
    });

    it('should detect anomaly when alt deviation exceeds 15%', () => {
      const inputs = makeDualInputs(100, 120, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'LINK');

      expect(['low', 'very_low']).toContain(result.confidenceLevel);
    });
  });

  describe('confidence-based resolution for dual sources', () => {
    it('should exclude lower-confidence source when deviation exceeds threshold', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('pyth');
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
          provider: 'pyth',
          price: 55000,
          confidence: 0.5,
          confidenceInterval: { bid: 54000, ask: 56000, widthPercentage: 3.6 },
        }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('pyth');
    });

    it('should keep both when confidence scores are similar', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.9, 0.88);
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

      const inputs = makeDualInputs(50050, 60000, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('pyth');
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

      const inputs = makeDualInputs(55000, 45000, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(2);
    });

    it('should fall back to confidence when history is insufficient', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.excludedProviders).toContain('pyth');
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
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      if (result.excludedCount > 0) {
        expect(['low', 'very_low']).toContain(result.confidenceLevel);
        expect(result.confidence).toBeLessThanOrEqual(0.39);
      }
    });

    it('should cap confidence at medium when dual sources agree', () => {
      const inputs = makeDualInputs(50000, 50100, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidence).toBeLessThanOrEqual(0.59);
      expect(['low', 'medium']).toContain(result.confidenceLevel);
    });

    it('should not cap confidence for 3+ sources', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 50000, confidence: 0.95 }),
        makeInput({ provider: 'pyth', price: 50100, confidence: 0.95 }),
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
      const inputs = makeDualInputs(50000, 50100, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'BTC');

      expect(result.price).toBeCloseTo(50050, -1);
    });

    it('should prefer higher-confidence source when dual sources diverge', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.95, 0.3);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'BTC');

      expect(result.price).toBe(50000);
    });
  });

  describe('stablecoin-specific strict thresholds', () => {
    it('should flag 0.6% deviation for stablecoins', () => {
      const inputs = makeDualInputs(1.0, 1.006, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'USDT');

      expect(result.confidenceLevel).toBe('low');
    });

    it('should accept 0.3% deviation for stablecoins', () => {
      const inputs = makeDualInputs(1.0, 1.003, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'iqr_filtered', 'USDT');

      expect(result.participantCount).toBe(2);
      expect(result.excludedCount).toBe(0);
    });
  });

  describe('three or more sources still work correctly', () => {
    it('should use Z-score detection for 3+ sources', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: 50000, confidence: 0.95 }),
        makeInput({ provider: 'pyth', price: 50100, confidence: 0.95 }),
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
        makeInput({ provider: 'pyth', price: 50100, confidence: 0.95 }),
        makeInput({ provider: 'redstone', price: 49900, confidence: 0.95 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.confidence).toBeGreaterThan(0.59);
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
        makeInput({ provider: 'pyth', price: 50000 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(1);
    });

    it('should handle inputs with Infinity prices', () => {
      const inputs = [
        makeInput({ provider: 'chainlink', price: Infinity }),
        makeInput({ provider: 'pyth', price: 50000 }),
      ];
      const result = calculateConsensusPrice(inputs, 'median', 'BTC');

      expect(result.participantCount).toBe(1);
    });

    it('should work without symbol context', () => {
      const inputs = makeDualInputs(50000, 55000, 'chainlink', 'pyth', 0.9, 0.9);
      const result = calculateConsensusPrice(inputs, 'median');

      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });
  });
});
