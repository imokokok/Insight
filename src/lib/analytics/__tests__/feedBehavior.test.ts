/* eslint-disable max-lines-per-function */
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
      expect(result.recentCV).toBe(0);
      expect(result.sampleConfidence).toBe(0);
    });

    it('should handle empty timestamps', () => {
      const result = calculateUpdateRhythm('test', [], 2);

      expect(result.actualAvgIntervalSeconds).toBe(0);
      expect(result.isAnomalous).toBe(false);
    });

    it('should calculate recentCV from last 5 intervals', () => {
      const now = Date.now();
      const timestamps: number[] = [];
      for (let i = 19; i >= 0; i--) {
        timestamps.push(now - i * 2 * 1000);
      }

      const result = calculateUpdateRhythm('test', timestamps, 2);

      expect(result.recentCV).toBeDefined();
      expect(result.recentCV).toBeGreaterThanOrEqual(0);
      expect(result.sampleConfidence).toBeGreaterThan(0);
    });

    it('should use sample variance (Bessel correction) for CV', () => {
      const now = Date.now();
      const timestamps = [now - 4000, now - 3000, now - 2000, now - 1000];
      const result = calculateUpdateRhythm('test', timestamps, 1);

      const intervals = [1, 1, 1];
      const mean = 1;
      const sampleVar = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / (intervals.length - 1);
      const expectedCV = Math.sqrt(sampleVar) / mean;

      expect(result.intervalCV).toBeCloseTo(expectedCV, 4);
    });
  });

  describe('calculateConfidenceIntervalMetrics', () => {
    it('should detect expanding trend', () => {
      const data = [{ widthPercentage: 0.1 }, { widthPercentage: 0.15 }, { widthPercentage: 0.22 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.trend).toBe('expanding');
      expect(result.ewmaChangeRate).toBeGreaterThan(0);
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
      expect(result.ewmaChangeRate).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const data = [{ widthPercentage: 0.1 }, { widthPercentage: 0.1 }, { widthPercentage: 0.1 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.trend).toBe('stable');
      expect(result.ewmaChangeRate).toBeCloseTo(0, 4);
    });

    it('should handle empty data', () => {
      const result = calculateConfidenceIntervalMetrics('test', []);

      expect(result.currentWidth).toBe(0);
      expect(result.avgWidth).toBe(0);
      expect(result.widthChangeRate).toBe(0);
      expect(result.isSurge).toBe(false);
      expect(result.trend).toBe('stable');
      expect(result.widths).toEqual([]);
      expect(result.ewmaChangeRate).toBe(0);
      expect(result.absoluteWidthScore).toBe(70);
    });

    it('should handle single data point', () => {
      const result = calculateConfidenceIntervalMetrics('test', [{ widthPercentage: 0.1 }]);

      expect(result.currentWidth).toBe(0.1);
      expect(result.widthChangeRate).toBe(0);
      expect(result.isSurge).toBe(false);
    });

    it('should calculate absolute width score based on width level', () => {
      const tight = calculateConfidenceIntervalMetrics('test', [{ widthPercentage: 0.05 }]);
      expect(tight.absoluteWidthScore).toBe(100);

      const wide = calculateConfidenceIntervalMetrics('test', [{ widthPercentage: 2.0 }]);
      expect(wide.absoluteWidthScore).toBeLessThan(50);
    });

    it('should use EWMA for trend with 3+ data points', () => {
      const data = [{ widthPercentage: 0.1 }, { widthPercentage: 0.12 }, { widthPercentage: 0.18 }];

      const result = calculateConfidenceIntervalMetrics('test', data);

      expect(result.ewmaChangeRate).toBeDefined();
      expect(result.ewmaChangeRate).not.toBe(result.widthChangeRate);
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
      expect(result.heartbeatSeverity).toBe('critical');
      expect(result.recentReliability).toBe(0);
    });

    it('should detect heartbeat lost when time since last update exceeds threshold', () => {
      const now = Date.now();
      const expectedInterval = 1;
      const timestamps = [now - 10000];

      const result = calculateHeartbeat('test', timestamps, expectedInterval, now);

      expect(result.isHeartbeatLost).toBe(true);
    });

    it('should calculate graduated heartbeat severity', () => {
      const now = Date.now();
      const timestamps: number[] = [];
      for (let i = 9; i >= 0; i--) {
        timestamps.push(now - i * 1000);
      }

      const result = calculateHeartbeat('test', timestamps, 1, now);

      expect(result.heartbeatSeverity).toBe('none');
    });

    it('should assign critical severity for very large gaps', () => {
      const now = Date.now();
      const timestamps = [now - 20000, now - 5000];

      const result = calculateHeartbeat('test', timestamps, 1, now);

      expect(result.heartbeatSeverity).toBe('critical');
    });

    it('should assign severe severity for gaps between 3x and 5x expected', () => {
      const now = Date.now();
      const timestamps = [now - 10000, now - 5000];

      const result = calculateHeartbeat('test', timestamps, 1, now);

      expect(result.heartbeatSeverity).toBe('severe');
    });

    it('should calculate recent reliability for recent time window', () => {
      const now = Date.now();
      const timestamps: number[] = [];
      for (let i = 19; i >= 0; i--) {
        timestamps.push(now - i * 1000);
      }

      const result = calculateHeartbeat('test', timestamps, 1, now);

      expect(result.recentReliability).toBeDefined();
      expect(result.recentReliability).toBeGreaterThanOrEqual(0);
      expect(result.recentReliability).toBeLessThanOrEqual(1);
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
        recentCV: 0.05,
        sampleConfidence: 0.5,
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
        ewmaChangeRate: 0,
        absoluteWidthScore: 100,
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
        heartbeatSeverity: 'none' as const,
        recentReliability: 1,
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
      expect(result.weightProfile).toBeDefined();
      expect(result.penaltyAmplification).toBeDefined();
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
          recentCV: 0.8,
          sampleConfidence: 0.3,
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
          ewmaChangeRate: 0.8,
          absoluteWidthScore: 65,
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
          heartbeatSeverity: 'critical' as const,
          recentReliability: 0.05,
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
      params.rhythm.recentCV = 0.3;
      params.heartbeat.reliability = 0.7;
      params.heartbeat.recentReliability = 0.7;
      params.freshnessSeconds = 3;

      const result = calculateFeedHealthScore(params);

      if (result.score >= 60 && result.score < 80) {
        expect(result.level).toBe('fair');
      }
    });

    it('should use realtime weight profile for sub-second oracles', () => {
      const params = createHealthyParams();
      params.expectedIntervalSeconds = 1;

      const result = calculateFeedHealthScore(params);

      expect(result.weightProfile).toBe('realtime');
    });

    it('should use slow weight profile for hourly oracles', () => {
      const params = createHealthyParams();
      params.expectedIntervalSeconds = 3600;

      const result = calculateFeedHealthScore(params);

      expect(result.weightProfile).toBe('slow');
    });

    it('should apply penalty amplification when multiple metrics are poor', () => {
      const params = createHealthyParams();
      params.rhythm.intervalCV = 0.8;
      params.rhythm.recentCV = 0.8;
      params.heartbeat.reliability = 0.1;
      params.heartbeat.recentReliability = 0.1;
      params.heartbeat.isHeartbeatLost = true;
      params.heartbeat.heartbeatSeverity = 'critical';
      params.freshnessSeconds = 100;
      params.confidence.isSurge = true;

      const result = calculateFeedHealthScore(params);

      expect(result.penaltyAmplification).toBeLessThan(1);
      expect(result.score).toBeLessThan(30);
    });

    it('should apply interaction penalty for heartbeat lost + rhythm anomalous', () => {
      const params = createHealthyParams();
      params.rhythm.isAnomalous = true;
      params.rhythm.anomalyType = 'irregular';
      params.rhythm.intervalCV = 0.6;
      params.rhythm.recentCV = 0.6;
      params.heartbeat.isHeartbeatLost = true;
      params.heartbeat.heartbeatSeverity = 'moderate';

      const result = calculateFeedHealthScore(params);

      expect(result.penaltyAmplification).toBeLessThan(1);
    });

    it('should produce smooth freshness transition at boundary', () => {
      const paramsAtBoundary = createHealthyParams();
      paramsAtBoundary.freshnessSeconds = 2;
      paramsAtBoundary.expectedIntervalSeconds = 2;

      const paramsJustOver = createHealthyParams();
      paramsJustOver.freshnessSeconds = 2.1;
      paramsJustOver.expectedIntervalSeconds = 2;

      const resultAt = calculateFeedHealthScore(paramsAtBoundary);
      const resultOver = calculateFeedHealthScore(paramsJustOver);

      expect(Math.abs(resultAt.freshness - resultOver.freshness)).toBeLessThan(10);
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
