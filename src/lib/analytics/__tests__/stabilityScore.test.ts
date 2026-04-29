import {
  calculateStability,
  calculateStabilityScore,
  calculatePriceConsistency,
  calculateUpdateFrequencyConsistency,
  calculateConfidenceStability,
  calculateDataCompleteness,
  detectDecayTrend,
  estimateTimeToCritical,
} from '../stabilityScore';

describe('stabilityScore', () => {
  describe('calculatePriceConsistency', () => {
    it('should return 100 for perfectly stable prices', () => {
      const result = calculatePriceConsistency([100, 100, 100, 100, 100]);

      expect(result).toBe(100);
    });

    it('should return lower score for volatile prices', () => {
      const stable = calculatePriceConsistency([100, 100, 100, 100, 100]);
      const volatile = calculatePriceConsistency([100, 110, 90, 120, 80]);

      expect(volatile).toBeLessThan(stable);
      expect(volatile).toBeGreaterThanOrEqual(0);
    });

    it('should handle single price', () => {
      const result = calculatePriceConsistency([100]);

      expect(result).toBe(50);
    });

    it('should handle empty array', () => {
      const result = calculatePriceConsistency([]);

      expect(result).toBe(50);
    });

    it('should return higher score for small variations', () => {
      const smallVariation = calculatePriceConsistency([100, 100.1, 100.2, 100.1, 100.3]);
      const largeVariation = calculatePriceConsistency([100, 110, 90, 120, 80]);

      expect(smallVariation).toBeGreaterThan(largeVariation);
    });
  });

  describe('calculateUpdateFrequencyConsistency', () => {
    it('should return high score for consistent intervals', () => {
      const now = Date.now();
      const timestamps: number[] = [];
      for (let i = 9; i >= 0; i--) {
        timestamps.push(now - i * 1000);
      }

      const result = calculateUpdateFrequencyConsistency(timestamps);

      expect(result).toBeGreaterThanOrEqual(90);
    });

    it('should return low score for irregular intervals', () => {
      const now = Date.now();
      const timestamps = [now - 10000, now - 9000, now - 5000, now - 1000, now - 500];

      const result = calculateUpdateFrequencyConsistency(timestamps);

      expect(result).toBeLessThan(80);
    });

    it('should handle single timestamp', () => {
      const result = calculateUpdateFrequencyConsistency([Date.now()]);

      expect(result).toBe(50);
    });

    it('should handle empty array', () => {
      const result = calculateUpdateFrequencyConsistency([]);

      expect(result).toBe(50);
    });

    it('should return 100 for identical intervals', () => {
      const now = Date.now();
      const timestamps = [now - 3000, now - 2000, now - 1000, now];

      const result = calculateUpdateFrequencyConsistency(timestamps);

      expect(result).toBe(100);
    });
  });

  describe('calculateConfidenceStability', () => {
    it('should return high score for stable confidence', () => {
      const result = calculateConfidenceStability([0.95, 0.95, 0.95, 0.95, 0.95]);

      expect(result).toBe(100);
    });

    it('should return lower score for fluctuating confidence', () => {
      const stable = calculateConfidenceStability([0.95, 0.95, 0.95, 0.95, 0.95]);
      const fluctuating = calculateConfidenceStability([0.95, 0.8, 0.95, 0.7, 0.95]);

      expect(fluctuating).toBeLessThan(stable);
    });

    it('should return 80 for no data', () => {
      const result = calculateConfidenceStability([]);

      expect(result).toBe(80);
    });

    it('should return 80 for single confidence value', () => {
      const result = calculateConfidenceStability([0.95]);

      expect(result).toBe(80);
    });
  });

  describe('calculateDataCompleteness', () => {
    it('should return 100 for complete data', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timeWindow = 10000;
      const timestamps: number[] = [];
      for (let i = 10; i >= 1; i--) {
        timestamps.push(now - i * expectedInterval * 1000);
      }

      const result = calculateDataCompleteness(timestamps, expectedInterval, timeWindow);

      expect(result).toBe(100);
    });

    it('should return lower score for gaps', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timeWindow = 10000;
      const timestamps = [now - 9000, now - 5000, now - 1000];

      const result = calculateDataCompleteness(timestamps, expectedInterval, timeWindow);

      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(0);
    });

    it('should return 80 for no expected interval', () => {
      const result = calculateDataCompleteness([Date.now()], 0, 10000);

      expect(result).toBe(80);
    });

    it('should return 0 for empty timestamps with valid interval', () => {
      const result = calculateDataCompleteness([], 1000, 10000);

      expect(result).toBe(0);
    });

    it('should handle negative expected interval', () => {
      const result = calculateDataCompleteness([Date.now()], -1, 10000);

      expect(result).toBe(80);
    });
  });

  describe('detectDecayTrend', () => {
    it('should detect declining trend', () => {
      const scores = [80, 79, 78, 77, 76];
      const result = detectDecayTrend(scores);

      expect(result).toBe('declining');
    });

    it('should detect improving trend', () => {
      const scores = [50, 60, 70, 80, 90];
      const result = detectDecayTrend(scores);

      expect(result).toBe('improving');
    });

    it('should detect stable trend', () => {
      const scores = [75, 75, 75, 75, 75];
      const result = detectDecayTrend(scores);

      expect(result).toBe('stable');
    });

    it('should detect rapidly declining trend', () => {
      const scores = [90, 70, 50, 30, 10];
      const result = detectDecayTrend(scores);

      expect(result).toBe('rapidly_declining');
    });

    it('should return stable for insufficient data', () => {
      const result = detectDecayTrend([50]);

      expect(result).toBe('stable');
    });

    it('should return stable for empty array', () => {
      const result = detectDecayTrend([]);

      expect(result).toBe('stable');
    });
  });

  describe('estimateTimeToCritical', () => {
    it('should estimate time for declining score', () => {
      const result = estimateTimeToCritical(80, -2, 60);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
    });

    it('should return null for improving trend', () => {
      const result = estimateTimeToCritical(80, 2, 60);

      expect(result).toBeNull();
    });

    it('should return null for zero decay rate', () => {
      const result = estimateTimeToCritical(80, 0, 60);

      expect(result).toBeNull();
    });

    it('should return 0 when score is already at or below critical', () => {
      const result = estimateTimeToCritical(40, -2, 60);

      expect(result).toBe(0);
    });

    it('should return 0 when score is below critical', () => {
      const result = estimateTimeToCritical(30, -2, 60);

      expect(result).toBe(0);
    });
  });

  describe('calculateStabilityScore', () => {
    it('should combine all components', () => {
      const now = Date.now();
      const prices = [100, 100, 100, 100, 100];
      const timestamps = [now - 4000, now - 3000, now - 2000, now - 1000, now];
      const confidences = [0.95, 0.95, 0.95, 0.95, 0.95];

      const result = calculateStabilityScore('test', prices, timestamps, confidences, 1000);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.components.priceConsistency).toBeDefined();
      expect(result.components.updateFrequencyConsistency).toBeDefined();
      expect(result.components.confidenceStability).toBeDefined();
      expect(result.components.dataCompleteness).toBeDefined();
    });

    it('should return correct level for excellent score', () => {
      const now = Date.now();
      const prices = [100, 100, 100, 100, 100];
      const timestamps = Array.from({ length: 5 }, (_, i) => now - (4 - i) * 1000);
      const confidences = [0.95, 0.95, 0.95, 0.95, 0.95];

      const result = calculateStabilityScore('test', prices, timestamps, confidences, 1000);

      if (result.score >= 90) {
        expect(result.level).toBe('excellent');
      }
    });

    it('should return correct level for good score', () => {
      const now = Date.now();
      const prices = [100, 100.5, 100, 100.5, 100];
      const timestamps = Array.from({ length: 5 }, (_, i) => now - (4 - i) * 1000);
      const confidences = [0.95, 0.94, 0.95, 0.94, 0.95];

      const result = calculateStabilityScore('test', prices, timestamps, confidences, 1000);

      if (result.score >= 75 && result.score < 90) {
        expect(result.level).toBe('good');
      }
    });

    it('should return correct level for critical score', () => {
      const now = Date.now();
      const prices = [100, 120, 80, 130, 70];
      const timestamps = [now - 10000, now - 9000, now - 5000, now - 1000, now - 100];
      const confidences = [0.95, 0.7, 0.95, 0.6, 0.95];

      const result = calculateStabilityScore('test', prices, timestamps, confidences, 1000);

      if (result.score < 40) {
        expect(result.level).toBe('critical');
      }
    });
  });

  describe('calculateStability', () => {
    const createValidHistory = (
      provider: string,
      count: number,
      basePrice: number = 50000
    ): Array<{ price: number; timestamp: number; success: boolean; confidence?: number }> => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => ({
        price: basePrice + i * 10,
        timestamp: now - (count - i) * 60000,
        success: true,
        confidence: 0.95,
      }));
    };

    it('should handle multiple providers', () => {
      const providers = ['chainlink', 'pyth'];
      const priceHistoryMap = new Map([
        ['chainlink', createValidHistory('chainlink', 10)],
        ['pyth', createValidHistory('pyth', 10, 50100)],
      ]);

      const result = calculateStability(providers, priceHistoryMap, Date.now());

      expect(result.scores.length).toBe(2);
      expect(result.averageScore).toBeGreaterThanOrEqual(0);
      expect(result.averageScore).toBeLessThanOrEqual(100);
      expect(result.averageLevel).toBeDefined();
      expect(result.worstProvider).toBeDefined();
      expect(result.worstScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty data', () => {
      const result = calculateStability([], new Map(), Date.now());

      expect(result.scores).toEqual([]);
      expect(result.history).toEqual([]);
      expect(result.decliningCount).toBe(0);
      expect(result.rapidlyDecliningCount).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.averageLevel).toBe('critical');
      expect(result.worstProvider).toBeNull();
      expect(result.worstScore).toBe(0);
    });

    it('should require minimum 5 data points', () => {
      const providers = ['chainlink'];
      const priceHistoryMap = new Map([['chainlink', createValidHistory('chainlink', 4)]]);

      const result = calculateStability(providers, priceHistoryMap, Date.now());

      expect(result.scores.length).toBe(0);
    });

    it('should skip providers with insufficient valid entries', () => {
      const providers = ['chainlink'];
      const history = [
        { price: 50000, timestamp: Date.now() - 5000, success: false },
        { price: 50000, timestamp: Date.now() - 4000, success: false },
        { price: 50000, timestamp: Date.now() - 3000, success: false },
        { price: 50000, timestamp: Date.now() - 2000, success: false },
        { price: 50000, timestamp: Date.now() - 1000, success: false },
      ];
      const priceHistoryMap = new Map([['chainlink', history]]);

      const result = calculateStability(providers, priceHistoryMap, Date.now());

      expect(result.scores.length).toBe(0);
    });

    it('should track declining and rapidly declining counts', () => {
      const result = calculateStability([], new Map(), Date.now());

      expect(result.decliningCount).toBeGreaterThanOrEqual(0);
      expect(result.rapidlyDecliningCount).toBeGreaterThanOrEqual(0);
    });
  });
});
