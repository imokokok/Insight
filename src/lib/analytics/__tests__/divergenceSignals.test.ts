import { calculateDivergenceSignals } from '../divergenceSignals';

const mockPriceData = [
  { provider: 'chainlink', price: 50000, timestamp: Date.now() - 1000, confidence: 0.95 },
  { provider: 'switchboard', price: 50100, timestamp: Date.now() - 500, confidence: 0.98 },
  { provider: 'redstone', price: 49900, timestamp: Date.now() - 800, confidence: 0.92 },
];

const mockPriceHistoryMap = new Map([
  [
    'chainlink',
    [
      { price: 49800, timestamp: Date.now() - 5000, success: true },
      { price: 49900, timestamp: Date.now() - 3000, success: true },
      { price: 50000, timestamp: Date.now() - 1000, success: true },
    ],
  ],
  [
    'switchboard',
    [
      { price: 50000, timestamp: Date.now() - 4000, success: true },
      { price: 50050, timestamp: Date.now() - 2000, success: true },
      { price: 50100, timestamp: Date.now() - 500, success: true },
    ],
  ],
]);

describe('divergenceSignals', () => {
  describe('calculateDivergenceSignals', () => {
    it('should combine all calculations', () => {
      const result = calculateDivergenceSignals(mockPriceData, mockPriceHistoryMap);

      expect(result.timeSeries).toBeDefined();
      expect(result.leadership).toBeDefined();
      expect(result.divergenceMatrix).toBeDefined();
      expect(result.acceleratingCount).toBeGreaterThanOrEqual(0);
      expect(result.directionalBiasCount).toBeGreaterThanOrEqual(0);
      expect(result.maxAcceleration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty priceData', () => {
      const result = calculateDivergenceSignals([], mockPriceHistoryMap);

      expect(result.timeSeries).toEqual([]);
      expect(result.leadership).toEqual([]);
      expect(result.divergenceMatrix).toEqual([]);
      expect(result.acceleratingCount).toBe(0);
      expect(result.directionalBiasCount).toBe(0);
      expect(result.leadingOracle).toBeNull();
      expect(result.maxAcceleration).toBe(0);
    });
  });
});
