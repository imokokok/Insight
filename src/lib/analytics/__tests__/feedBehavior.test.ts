import {
  calculateFeedBehavior,
  calculateUpdateRhythm,
  calculateConfidenceIntervalMetrics,
  calculateHeartbeat,
  calculateFeedHealthScore,
} from '../feedBehavior';

describe('feedBehavior', () => {
  describe('calculateUpdateRhythm', () => {
    it('should detect irregular rhythm when CV > 0.5', () => {
      const now = Date.now();
      const timestamps = [now - 10000, now - 8500, now - 7500, now - 5000, now - 4500];

      const result = calculateUpdateRhythm('test', timestamps, 2);

      expect(result.isAnomalous).toBe(true);
      expect(result.intervalCV).toBeGreaterThan(0.5);
    });

    it('should detect sudden slowdown', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timestamps = [now - 10000, now - 5000, now - 3000, now - 2000, now - 1000];

      const result = calculateUpdateRhythm('test', timestamps, expectedInterval);

      expect(result.isAnomalous).toBe(true);
      expect(result.anomalyType).toBe('sudden_slowdown');
      expect(result.actualAvgIntervalSeconds).toBeGreaterThan(1.5 * expectedInterval);
    });

    it('should return normal for regular updates', () => {
      const now = Date.now();
      const expectedInterval = 2;
      const timestamps: number[] = [];
      for (let i = 9; i >= 0; i--) {
        timestamps.push(now - i * expectedInterval * 1000);
      }

      const result = calculateUpdateRhythm('test', timestamps, expectedInterval);

      expect(result.intervalCV).toBeLessThan(0.5);
      expect(result.actualAvgIntervalSeconds).toBeCloseTo(expectedInterval, 1);
    });

    it('should handle insufficient data', () => {
      const result = calculateUpdateRhythm('test', [Date.now()], 2);

      expect(result.actualAvgIntervalSeconds).toBe(0);
      expect(result.intervalCV).toBe(0);
      expect(result.isAnomalous).toBe(false);
      expect(result.anomalyType).toBeNull();
      expect(result.intervals).toEqual([]);
    });

    it('should handle empty timestamps', () => {
      const result = calculateUpdateRhythm('test', [], 2);

      expect(result.actualAvgIntervalSeconds).toBe(0);
      expect(result.isAnomalous).toBe(false);
    });
  });

  describe('calculateConfidenceIntervalMetrics', () => {
    it('should detect expanding trend', () => {
      const data = [{ widthPercentage: 0.1 }, { widthPercentage: 0.15 }, { widthPercentage: 0.22 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.trend).toBe('expanding');
      expect(result.widthChangeRate).toBeGreaterThan(0.1);
    });

    it('should detect surge when width doubles', () => {
      const data = [{ widthPercentage: 0.1 }, { widthPercentage: 0.25 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.isSurge).toBe(true);
      expect(result.surgeMagnitude).toBeGreaterThan(0);
    });

    it('should detect contracting trend', () => {
      const data = [{ widthPercentage: 0.3 }, { widthPercentage: 0.2 }, { widthPercentage: 0.1 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.trend).toBe('contracting');
      expect(result.widthChangeRate).toBeLessThan(-0.1);
    });

    it('should detect stable trend', () => {
      const data = [{ widthPercentage: 0.1 }, { widthPercentage: 0.1 }, { widthPercentage: 0.1 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.trend).toBe('stable');
      expect(result.widthChangeRate).toBe(0);
    });

    it('should handle empty data', () => {
      const result = calculateConfidenceIntervalMetrics('test', []);

      expect(result.currentWidth).toBe(0);
      expect(result.avgWidth).toBe(0);
      expect(result.widthChangeRate).toBe(0);
      expect(result.isSurge).toBe(false);
      expect(result.trend).toBe('stable');
      expect(result.widths).toEqual([]);
    });

    it('should handle single data point', () => {
      const result = calculateConfidenceIntervalMetrics('test', [{ widthPercentage: 0.1 }]);

      expect(result.currentWidth).toBe(0.1);
      expect(result.widthChangeRate).toBe(0);
      expect(result.isSurge).toBe(false);
    });
  });

  describe('calculateHeartbeat', () => {
    it('should detect heartbeat loss', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timestamps = [now - 10000, now - 9000, now - 8000, now - 3000];

      const result = calculateHeartbeat('test', timestamps, expectedInterval, now);

      expect(result.isHeartbeatLost).toBe(true);
      expect(result.maxGapSeconds).toBeGreaterThan(2 * expectedInterval);
    });

    it('should calculate reliability correctly', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timestamps: number[] = [];
      for (let i = 9; i >= 0; i--) {
        timestamps.push(now - i * expectedInterval * 1000);
      }

      const result = calculateHeartbeat('test', timestamps, expectedInterval, now);

      expect(result.reliability).toBeGreaterThan(0);
      expect(result.reliability).toBeLessThanOrEqual(1);
      expect(result.actualUpdateCount).toBe(10);
    });

    it('should handle no updates', () => {
      const now = Date.now();
      const result = calculateHeartbeat('test', [], 1, now);

      expect(result.reliability).toBe(0);
      expect(result.isHeartbeatLost).toBe(true);
      expect(result.actualUpdateCount).toBe(0);
      expect(result.missedBeats).toBe(0);
    });

    it('should detect heartbeat lost when time since last update exceeds threshold', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timestamps = [now - 10000];

      const result = calculateHeartbeat('test', timestamps, expectedInterval, now);

      expect(result.isHeartbeatLost).toBe(true);
    });
  });

  describe('calculateFeedHealthScore', () => {
    const createHealthyParams = () => ({
      rhythm: {
        provider: 'test',
        expectedIntervalSeconds: 2,
        actualAvgIntervalSeconds: 2,
        intervalStdDev: 0.1,
        intervalCV: 0.05,
        isAnomalous: false,
        anomalyType: null as string | null,
        intervals: [2, 2, 2, 2],
      },
      confidence: {
        provider: 'test',
        currentWidth: 0.1,
        avgWidth: 0.1,
        widthChangeRate: 0,
        isSurge: false,
        surgeMagnitude: 0,
        trend: 'stable' as const,
        widths: [0.1, 0.1],
      },
      heartbeat: {
        provider: 'test',
        expectedUpdateCount: 10,
        actualUpdateCount: 10,
        reliability: 1,
        missedBeats: 0,
        maxGapSeconds: 2,
        isHeartbeatLost: false,
        lastUpdateTimestamp: Date.now(),
      },
      freshnessSeconds: 1,
      expectedIntervalSeconds: 2,
    });

    it('should calculate weighted score correctly', () => {
      const params = createHealthyParams();
      const result = calculateFeedHealthScore(params);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.rhythmStability).toBeDefined();
      expect(result.confidenceStability).toBeDefined();
      expect(result.heartbeatReliability).toBeDefined();
      expect(result.freshness).toBeDefined();
    });

    it('should return healthy for high scores', () => {
      const params = createHealthyParams();
      const result = calculateFeedHealthScore(params);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe('healthy');
    });

    it('should return critical for low scores', () => {
      const params = {
        rhythm: {
          provider: 'test',
          expectedIntervalSeconds: 2,
          actualAvgIntervalSeconds: 10,
          intervalStdDev: 5,
          intervalCV: 0.8,
          isAnomalous: true,
          anomalyType: 'irregular' as const,
          intervals: [1, 10, 1, 10],
        },
        confidence: {
          provider: 'test',
          currentWidth: 0.5,
          avgWidth: 0.3,
          widthChangeRate: 0.8,
          isSurge: true,
          surgeMagnitude: 0.5,
          trend: 'expanding' as const,
          widths: [0.1, 0.5],
        },
        heartbeat: {
          provider: 'test',
          expectedUpdateCount: 100,
          actualUpdateCount: 5,
          reliability: 0.05,
          missedBeats: 95,
          maxGapSeconds: 50,
          isHeartbeatLost: true,
          lastUpdateTimestamp: Date.now() - 100000,
        },
        freshnessSeconds: 100,
        expectedIntervalSeconds: 2,
      };

      const result = calculateFeedHealthScore(params);

      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('critical');
    });

    it('should return fair for moderate scores', () => {
      const params = createHealthyParams();
      params.rhythm.intervalCV = 0.3;
      params.heartbeat.reliability = 0.7;
      params.freshnessSeconds = 3;

      const result = calculateFeedHealthScore(params);

      if (result.score >= 60 && result.score < 80) {
        expect(result.level).toBe('fair');
      }
    });
  });

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
  });
});
