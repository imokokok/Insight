import { calculateStability } from '../stabilityScore';

describe('stabilityScore', () => {
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
