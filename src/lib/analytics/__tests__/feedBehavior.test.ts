import { calculateFeedBehavior } from '../feedBehavior';

describe('feedBehavior', () => {
  describe('calculateFeedBehavior', () => {
    it('should combine all metrics', () => {
      const now = Date.now();
      const priceData = [
        {
          provider: 'chainlink',
          price: 50000,
          timestamp: now - 1000,
          success: true,
          confidence: 0.95,
          confidenceInterval: { bid: 49900, ask: 50100, widthPercentage: 0.4 },
        },
        {
          provider: 'pyth',
          price: 50100,
          timestamp: now - 500,
          success: true,
          confidence: 0.98,
          confidenceInterval: { bid: 50000, ask: 50200, widthPercentage: 0.4 },
        },
      ];

      const priceHistoryMap = new Map([
        [
          'chainlink',
          Array.from({ length: 10 }, (_, i) => ({
            price: 50000 + i * 10,
            timestamp: now - (10 - i) * 3600 * 1000,
            success: true,
            confidence: 0.95,
            confidenceInterval: { bid: 49900, ask: 50100, widthPercentage: 0.4 },
          })),
        ],
        [
          'pyth',
          Array.from({ length: 10 }, (_, i) => ({
            price: 50100 + i * 10,
            timestamp: now - (10 - i) * 1000,
            success: true,
            confidence: 0.98,
            confidenceInterval: { bid: 50000, ask: 50200, widthPercentage: 0.4 },
          })),
        ],
      ]);

      const result = calculateFeedBehavior(priceData, priceHistoryMap, now);

      expect(result.rhythmMetrics.length).toBe(2);
      expect(result.confidenceMetrics.length).toBe(2);
      expect(result.heartbeatMetrics.length).toBe(2);
      expect(result.healthScores.length).toBe(2);
      expect(result.overallHealthAvg).toBeGreaterThanOrEqual(0);
      expect(result.overallHealthAvg).toBeLessThanOrEqual(100);
      expect(result.anomalyCount).toBeGreaterThanOrEqual(0);
      expect(result.heartbeatLostCount).toBeGreaterThanOrEqual(0);
      expect(result.confidenceSurgeCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty data', () => {
      const result = calculateFeedBehavior([], new Map(), Date.now());

      expect(result.rhythmMetrics).toEqual([]);
      expect(result.confidenceMetrics).toEqual([]);
      expect(result.heartbeatMetrics).toEqual([]);
      expect(result.healthScores).toEqual([]);
      expect(result.overallHealthAvg).toBe(0);
      expect(result.overallHealthLevel).toBe('critical');
      expect(result.anomalyCount).toBe(0);
      expect(result.heartbeatLostCount).toBe(0);
      expect(result.confidenceSurgeCount).toBe(0);
    });

    it('should apply weakest-link penalty to overall health', () => {
      const now = Date.now();
      const priceData = [
        { provider: 'pyth', price: 50000, timestamp: now - 500, success: true },
        { provider: 'chainlink', price: 50100, timestamp: now - 50000, success: true },
      ];

      const priceHistoryMap = new Map([
        [
          'pyth',
          Array.from({ length: 10 }, (_, i) => ({
            price: 50000 + i * 10,
            timestamp: now - (10 - i) * 1000,
            success: true,
            confidence: 0.98,
            confidenceInterval: { bid: 50000, ask: 50200, widthPercentage: 0.2 },
          })),
        ],
        [
          'chainlink',
          Array.from({ length: 2 }, (_, i) => ({
            price: 50100 + i * 10,
            timestamp: now - (2 - i) * 3600 * 1000,
            success: true,
            confidence: 0.9,
            confidenceInterval: { bid: 49900, ask: 50300, widthPercentage: 0.8 },
          })),
        ],
      ]);

      const result = calculateFeedBehavior(priceData, priceHistoryMap, now);

      const avgScore =
        result.healthScores.reduce((sum, h) => sum + h.score, 0) / result.healthScores.length;
      const minScore = Math.min(...result.healthScores.map((h) => h.score));
      const expectedOverall = Math.round(avgScore * 0.7 + minScore * 0.3);

      expect(result.overallHealthAvg).toBe(expectedOverall);
    });
  });
});
