import {
  calculateDivergenceSignals,
  calculateDivergenceTimeSeries,
  calculateOracleLeadership,
  calculateDivergenceMatrix,
  getConsensusPrice,
  calculateAcceleration,
  detectDirectionalBias,
} from '../divergenceSignals';

const mockPriceData = [
  { provider: 'chainlink', price: 50000, timestamp: Date.now() - 1000, confidence: 0.95 },
  { provider: 'pyth', price: 50100, timestamp: Date.now() - 500, confidence: 0.98 },
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
    'pyth',
    [
      { price: 50000, timestamp: Date.now() - 4000, success: true },
      { price: 50050, timestamp: Date.now() - 2000, success: true },
      { price: 50100, timestamp: Date.now() - 500, success: true },
    ],
  ],
]);

describe('divergenceSignals', () => {
  describe('getConsensusPrice', () => {
    it('should return median of prices', () => {
      const result = getConsensusPrice([50000, 50100, 49900]);

      expect(result).toBe(50000);
    });

    it('should return median for even number of prices', () => {
      const result = getConsensusPrice([50000, 50200]);

      expect(result).toBe(50100);
    });

    it('should handle empty array', () => {
      const result = getConsensusPrice([]);

      expect(result).toBe(0);
    });

    it('should handle single price', () => {
      const result = getConsensusPrice([50000]);

      expect(result).toBe(50000);
    });
  });

  describe('calculateAcceleration', () => {
    it('should return accelerating when deviations are increasing', () => {
      const deviations = [0.1, 0.3, 0.6, 1.0];
      const result = calculateAcceleration(deviations);

      expect(result.status).toBe('accelerating');
      expect(result.value).toBeGreaterThan(0);
    });

    it('should return stable when deviations are slowly decreasing', () => {
      const deviations = [1.0, 0.9, 0.8, 0.7];
      const result = calculateAcceleration(deviations);

      expect(result.status).toBe('stable');
    });

    it('should return stable when deviations are constant', () => {
      const deviations = [0.5, 0.5, 0.5, 0.5];
      const result = calculateAcceleration(deviations);

      expect(result.status).toBe('stable');
      expect(result.value).toBe(0);
    });

    it('should return stable for insufficient data', () => {
      const result = calculateAcceleration([0.1, 0.2]);

      expect(result.status).toBe('stable');
      expect(result.value).toBe(0);
    });

    it('should handle empty array', () => {
      const result = calculateAcceleration([]);

      expect(result.status).toBe('stable');
      expect(result.value).toBe(0);
    });
  });

  describe('detectDirectionalBias', () => {
    it('should detect directional bias with consecutive same-direction deviations', () => {
      const directions: Array<'positive' | 'negative' | 'neutral'> = [
        'positive',
        'positive',
        'positive',
        'negative',
      ];
      const result = detectDirectionalBias(directions);

      expect(result.isBias).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(3);
    });

    it('should return no bias with alternating directions', () => {
      const directions: Array<'positive' | 'negative' | 'neutral'> = [
        'positive',
        'negative',
        'positive',
        'negative',
      ];
      const result = detectDirectionalBias(directions);

      expect(result.isBias).toBe(false);
    });

    it('should handle all neutral directions', () => {
      const directions: Array<'positive' | 'negative' | 'neutral'> = [
        'neutral',
        'neutral',
        'neutral',
      ];
      const result = detectDirectionalBias(directions);

      expect(result.isBias).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should handle empty array', () => {
      const result = detectDirectionalBias([]);

      expect(result.isBias).toBe(false);
      expect(result.count).toBe(0);
    });
  });

  describe('calculateDivergenceTimeSeries', () => {
    it('should calculate deviation time series for multiple providers', () => {
      const result = calculateDivergenceTimeSeries(mockPriceHistoryMap, mockPriceData);

      expect(result.length).toBeGreaterThan(0);
      for (const ts of result) {
        expect(ts.provider).toBeDefined();
        expect(ts.points.length).toBeGreaterThan(0);
        expect(ts.currentDeviation).toBeDefined();
        expect(ts.currentDirection).toBeDefined();
        expect(ts.acceleration).toBeDefined();
        expect(ts.maxDeviation).toBeGreaterThanOrEqual(0);
        expect(ts.avgDeviation).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle empty data', () => {
      const result = calculateDivergenceTimeSeries(new Map(), []);

      expect(result).toEqual([]);
    });

    it('should handle empty history map', () => {
      const emptyMap = new Map<
        string,
        Array<{ price: number; timestamp: number; success: boolean }>
      >();
      const result = calculateDivergenceTimeSeries(emptyMap, mockPriceData);

      expect(result).toEqual([]);
    });
  });

  describe('calculateOracleLeadership', () => {
    it('should identify leading oracle', () => {
      const result = calculateOracleLeadership(mockPriceHistoryMap);

      expect(result.length).toBe(2);
      for (const leader of result) {
        expect(leader.provider).toBeDefined();
        expect(['leading', 'synchronized', 'lagging']).toContain(leader.status);
        expect(leader.avgLagSeconds).toBeGreaterThanOrEqual(0);
        expect(leader.firstResponseCount).toBeGreaterThanOrEqual(0);
        expect(leader.totalUpdates).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle single provider', () => {
      const singleMap = new Map([
        [
          'chainlink',
          [
            { price: 50000, timestamp: Date.now() - 3000, success: true },
            { price: 50100, timestamp: Date.now() - 1000, success: true },
          ],
        ],
      ]);
      const result = calculateOracleLeadership(singleMap);

      expect(result.length).toBe(1);
      expect(result[0].provider).toBe('chainlink');
    });

    it('should handle empty map', () => {
      const result = calculateOracleLeadership(new Map());

      expect(result).toEqual([]);
    });
  });

  describe('calculateDivergenceMatrix', () => {
    it('should create pairwise deviation matrix', () => {
      const result = calculateDivergenceMatrix(mockPriceData);

      expect(result.length).toBe(3);
      for (const row of result) {
        expect(row.length).toBe(3);
      }

      expect(result[0][0].deviationPercent).toBe(0);
      expect(result[0][0].providerA).toBe('chainlink');
      expect(result[0][0].providerB).toBe('chainlink');

      expect(result[0][1].deviationPercent).not.toBe(0);
      expect(result[0][1].providerA).toBe('chainlink');
      expect(result[0][1].providerB).toBe('pyth');
    });

    it('should have symmetric deviations with opposite signs', () => {
      const result = calculateDivergenceMatrix(mockPriceData);

      expect(result[0][1].deviationPercent).toBeCloseTo(-result[1][0].deviationPercent, 4);
    });

    it('should handle empty data', () => {
      const result = calculateDivergenceMatrix([]);

      expect(result).toEqual([]);
    });

    it('should handle single provider', () => {
      const singleData = [mockPriceData[0]];
      const result = calculateDivergenceMatrix(singleData);

      expect(result.length).toBe(1);
      expect(result[0][0].deviationPercent).toBe(0);
    });
  });

  describe('calculateDivergenceSignals', () => {
    it('should combine all calculations', () => {
      const result = calculateDivergenceSignals(mockPriceData, mockPriceHistoryMap);

      expect(result.timeSeries).toBeDefined();
      expect(result.leadership).toBeDefined();
      expect(result.divergenceMatrix).toBeDefined();
      expect(result.alertCount).toBeGreaterThanOrEqual(0);
      expect(result.acceleratingCount).toBeGreaterThanOrEqual(0);
      expect(result.directionalBiasCount).toBeGreaterThanOrEqual(0);
      expect(result.maxAcceleration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty priceData', () => {
      const result = calculateDivergenceSignals([], mockPriceHistoryMap);

      expect(result.timeSeries).toEqual([]);
      expect(result.leadership).toEqual([]);
      expect(result.divergenceMatrix).toEqual([]);
      expect(result.alertCount).toBe(0);
      expect(result.acceleratingCount).toBe(0);
      expect(result.directionalBiasCount).toBe(0);
      expect(result.leadingOracle).toBeNull();
      expect(result.maxAcceleration).toBe(0);
    });
  });
});
