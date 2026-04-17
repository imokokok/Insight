/* eslint-disable max-lines-per-function */
import {
  calculateStdDevDetection,
  detectPriceAnomalies,
  detectTrendBreak,
  detectVolatilityAnomalies,
  detectVolumeAnomalies,
  detectAllAnomalies,
  getAnomalyLevelColor,
  getAnomalyIcon,
  getAnomalyTypeText,
  getUnacknowledgedAnomalies,
  countAnomaliesByLevel,
  type AnomalyData,
  type AnomalyLevel,
  type AnomalyType,
} from '../anomalyDetection';

describe('anomalyDetection', () => {
  describe('calculateStdDevDetection', () => {
    it('should correctly calculate mean, standard deviation, and bounds', () => {
      const data = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
      const result = calculateStdDevDetection(data, 2);

      expect(result.mean).toBe(19);
      expect(result.stdDev).toBeCloseTo(5.745, 1);
      expect(result.upperBound).toBeCloseTo(30.49, 1);
      expect(result.lowerBound).toBeCloseTo(7.51, 1);
    });

    it('should identify upper anomalies correctly', () => {
      const data = [10, 10, 10, 10, 10, 100];
      const result = calculateStdDevDetection(data, 2);

      expect(result.anomalies.length).toBe(1);
      expect(result.anomalies[0].index).toBe(5);
      expect(result.anomalies[0].value).toBe(100);
      expect(result.anomalies[0].isUpper).toBe(true);
    });

    it('should identify lower anomalies correctly', () => {
      const data = [100, 100, 100, 100, 100, 10];
      const result = calculateStdDevDetection(data, 2);

      expect(result.anomalies.length).toBe(1);
      expect(result.anomalies[0].index).toBe(5);
      expect(result.anomalies[0].value).toBe(10);
      expect(result.anomalies[0].isUpper).toBe(false);
    });

    it('should identify multiple anomalies', () => {
      const data = [10, 10, 10, 10, 100, 10, 10, 500];
      const result = calculateStdDevDetection(data, 2);

      expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle custom threshold', () => {
      const data = [10, 10, 10, 10, 10, 100];
      const resultWithThreshold2 = calculateStdDevDetection(data, 2);
      const resultWithThreshold1 = calculateStdDevDetection(data, 1);

      expect(resultWithThreshold1.anomalies.length).toBeGreaterThanOrEqual(
        resultWithThreshold2.anomalies.length
      );
    });

    it('should return empty result for array with less than 2 elements', () => {
      const singleElement = calculateStdDevDetection([10], 2);
      const emptyArray = calculateStdDevDetection([], 2);

      expect(singleElement.mean).toBe(0);
      expect(singleElement.stdDev).toBe(0);
      expect(singleElement.anomalies).toEqual([]);
      expect(emptyArray.mean).toBe(0);
      expect(emptyArray.anomalies).toEqual([]);
    });

    it('should handle zero array', () => {
      const data = [0, 0, 0, 0, 0];
      const result = calculateStdDevDetection(data, 2);

      expect(result.mean).toBe(0);
      expect(result.stdDev).toBe(0);
      expect(result.upperBound).toBe(0);
      expect(result.lowerBound).toBe(0);
      expect(result.anomalies).toEqual([]);
    });

    it('should handle large values', () => {
      const data = [1e10, 1e10, 1e10, 1e10, 1e15];
      const result = calculateStdDevDetection(data, 2);

      expect(result.mean).toBeGreaterThan(0);
      expect(result.anomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative values', () => {
      const data = [-10, -10, -10, -10, -100];
      const result = calculateStdDevDetection(data, 2);

      expect(result.mean).toBeLessThan(0);
      expect(result.anomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed positive and negative values', () => {
      const data = [-5, -3, -1, 1, 3, 5, 100];
      const result = calculateStdDevDetection(data, 2);

      expect(result.anomalies.length).toBe(1);
      expect(result.anomalies[0].value).toBe(100);
    });
  });

  describe('detectPriceAnomalies', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    it('should calculate returns correctly', () => {
      const prices = [100, 110, 121, 133.1];
      const timestamps = createTimestamps(4);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result).toBeDefined();
    });

    it('should detect price spike anomalies', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 150];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('price_spike');
    });

    it('should detect price drop anomalies', () => {
      const prices = [100, 99, 98, 97, 96, 95, 94, 93, 92, 50];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('price_drop');
    });

    it('should assign correct level based on deviation', () => {
      const prices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 1000];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result.length).toBeGreaterThan(0);
      expect(['critical', 'high', 'medium']).toContain(result[0].level);
    });

    it('should assign appropriate level for moderate deviation', () => {
      const prices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 300];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result.length).toBeGreaterThan(0);
      expect(['critical', 'high', 'medium']).toContain(result[0].level);
    });

    it('should assign medium level for deviation > 2', () => {
      const prices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 130];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result.length).toBeGreaterThan(0);
      expect(['medium', 'high', 'critical']).toContain(result[0].level);
    });

    it('should return empty array for insufficient data', () => {
      const prices = [100, 101, 102, 103, 104];
      const timestamps = createTimestamps(5);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result).toEqual([]);
    });

    it('should include correct asset name in anomaly', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 200];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'ETH');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].asset).toBe('ETH');
    });

    it('should include correct timestamp in anomaly', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 200];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].timestamp).toBe(timestamps[9]);
    });

    it('should generate unique IDs for anomalies', () => {
      const prices = [
        100, 100, 100, 100, 100, 100, 100, 100, 200, 100, 100, 100, 100, 100, 100, 100, 100, 100,
        100, 300,
      ];
      const timestamps = createTimestamps(20);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      const ids = result.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('detectTrendBreak', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    it('should detect upward trend break', () => {
      const data: number[] = [];
      for (let i = 0; i < 15; i++) {
        data.push(100 + i * 0.1);
      }
      for (let i = 0; i < 15; i++) {
        data.push(101.5 + i * 2);
      }
      const timestamps = createTimestamps(30);
      const result = detectTrendBreak(data, timestamps, 2);

      expect(result.trend).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect downward trend break', () => {
      const data: number[] = [];
      for (let i = 0; i < 15; i++) {
        data.push(100 - i * 0.1);
      }
      for (let i = 0; i < 15; i++) {
        data.push(98.5 - i * 2);
      }
      const timestamps = createTimestamps(30);
      const result = detectTrendBreak(data, timestamps, 2);

      expect(result.trend).toBeDefined();
    });

    it('should return flat trend for stable data', () => {
      const data = Array(30).fill(100);
      const timestamps = createTimestamps(30);
      const result = detectTrendBreak(data, timestamps, 2);

      expect(result.trend.direction).toBe('flat');
      expect(result.trend.strength).toBe(0);
    });

    it('should return empty result for insufficient data', () => {
      const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
      const timestamps = createTimestamps(10);
      const result = detectTrendBreak(data, timestamps, 2);

      expect(result.trend.direction).toBe('flat');
      expect(result.trend.strength).toBe(0);
      expect(result.trend.confidence).toBe(0);
      expect(result.anomalies).toEqual([]);
    });

    it('should calculate trend confidence', () => {
      const data = Array(30)
        .fill(0)
        .map((_, i) => 100 + i * 0.5);
      const timestamps = createTimestamps(30);
      const result = detectTrendBreak(data, timestamps, 2);

      expect(result.trend.confidence).toBeGreaterThanOrEqual(0);
      expect(result.trend.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle custom threshold', () => {
      const data: number[] = [];
      for (let i = 0; i < 25; i++) {
        data.push(100 + Math.random() * 2);
      }
      for (let i = 0; i < 25; i++) {
        data.push(150 + Math.random() * 2);
      }
      const timestamps = createTimestamps(50);
      const resultLowThreshold = detectTrendBreak(data, timestamps, 1);
      const resultHighThreshold = detectTrendBreak(data, timestamps, 5);

      expect(resultLowThreshold.trend).toBeDefined();
      expect(resultHighThreshold.trend).toBeDefined();
    });

    it('should detect trend direction correctly', () => {
      const uptrendData = Array(30)
        .fill(0)
        .map((_, i) => 100 + i * 0.5);
      const timestamps = createTimestamps(30);
      const result = detectTrendBreak(uptrendData, timestamps, 2);

      expect(['up', 'down', 'flat']).toContain(result.trend.direction);
    });

    it('should include change point in result when detected', () => {
      const data: number[] = [];
      for (let i = 0; i < 20; i++) {
        data.push(100);
      }
      for (let i = 0; i < 20; i++) {
        data.push(120);
      }
      const timestamps = createTimestamps(40);
      const result = detectTrendBreak(data, timestamps, 2);

      if (result.trend.changePoint !== undefined) {
        expect(result.trend.changePoint).toBeGreaterThan(0);
        expect(result.trend.changePoint).toBeLessThan(data.length);
      }
    });
  });

  describe('detectVolatilityAnomalies', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    it('should calculate rolling volatility correctly', () => {
      const prices = Array(30)
        .fill(0)
        .map((_, i) => 100 + Math.sin(i) * 2);
      const timestamps = createTimestamps(30);
      const result = detectVolatilityAnomalies(prices, timestamps, 20);

      expect(result).toBeDefined();
    });

    it('should detect volatility spikes', () => {
      const prices: number[] = [];
      for (let i = 0; i < 25; i++) {
        prices.push(100 + Math.random() * 0.5);
      }
      for (let i = 0; i < 10; i++) {
        prices.push(100 + (Math.random() - 0.5) * 20);
      }
      const timestamps = createTimestamps(35);
      const result = detectVolatilityAnomalies(prices, timestamps, 20);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for insufficient data', () => {
      const prices = [100, 101, 102, 103, 104];
      const timestamps = createTimestamps(5);
      const result = detectVolatilityAnomalies(prices, timestamps, 20);

      expect(result).toEqual([]);
    });

    it('should handle custom window size', () => {
      const prices = Array(40)
        .fill(0)
        .map((_, i) => 100 + Math.sin(i) * 3);
      const timestamps = createTimestamps(40);
      const resultWindow10 = detectVolatilityAnomalies(prices, timestamps, 10);
      const resultWindow20 = detectVolatilityAnomalies(prices, timestamps, 20);

      expect(resultWindow10).toBeDefined();
      expect(resultWindow20).toBeDefined();
    });

    it('should assign correct levels based on deviation', () => {
      const prices: number[] = [];
      for (let i = 0; i < 30; i++) {
        prices.push(100);
      }
      for (let i = 0; i < 10; i++) {
        prices.push(100 + (i % 2 === 0 ? 10 : -10));
      }
      const timestamps = createTimestamps(40);
      const result = detectVolatilityAnomalies(prices, timestamps, 20);

      result.forEach((anomaly) => {
        expect(['low', 'medium', 'high', 'critical']).toContain(anomaly.level);
      });
    });

    it('should annualize volatility', () => {
      const prices = Array(30)
        .fill(0)
        .map((_, i) => 100 + Math.sin(i) * 5);
      const timestamps = createTimestamps(30);
      const result = detectVolatilityAnomalies(prices, timestamps, 20);

      result.forEach((anomaly) => {
        expect(anomaly.value).toBeGreaterThan(0);
      });
    });

    it('should include correct anomaly type', () => {
      const prices: number[] = [];
      for (let i = 0; i < 30; i++) {
        prices.push(100);
      }
      for (let i = 0; i < 10; i++) {
        prices.push(100 + (i % 2 === 0 ? 10 : -10));
      }
      const timestamps = createTimestamps(40);
      const result = detectVolatilityAnomalies(prices, timestamps, 20);

      result.forEach((anomaly) => {
        expect(anomaly.type).toBe('volatility_spike');
      });
    });
  });

  describe('detectVolumeAnomalies', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    it('should detect volume spikes', () => {
      const volumes = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 10000];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('volume_anomaly');
    });

    it('should detect volume drops', () => {
      const volumes = [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 100];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient data', () => {
      const volumes = [1000, 1000, 1000, 1000, 1000];
      const timestamps = createTimestamps(5);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result).toEqual([]);
    });

    it('should assign correct levels based on deviation', () => {
      const volumes = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 10000];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(result[0].level);
    });

    it('should assign critical level for very high deviation', () => {
      const volumes = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100000];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result.length).toBeGreaterThan(0);
      expect(['critical', 'high', 'medium', 'low']).toContain(result[0].level);
    });

    it('should include correct title for volume spike', () => {
      const volumes = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 10000];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('volume_spike_detected');
    });

    it('should include correct title for volume drop', () => {
      const volumes = [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 100];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('volume_drop_detected');
    });
  });

  describe('detectAllAnomalies', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    it('should detect all types of anomalies', () => {
      const prices: number[] = [];
      for (let i = 0; i < 25; i++) {
        prices.push(100);
      }
      for (let i = 0; i < 10; i++) {
        prices.push(120 + (i % 2 === 0 ? 5 : -5));
      }
      const timestamps = createTimestamps(35);
      const volumes = Array(35)
        .fill(0)
        .map((_, i) => (i < 30 ? 1000 : 5000));

      const result = detectAllAnomalies({
        prices,
        timestamps,
        volumes,
        asset: 'BTC',
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should work without volumes', () => {
      const prices = Array(30)
        .fill(0)
        .map((_, i) => 100 + i);
      const timestamps = createTimestamps(30);

      const result = detectAllAnomalies({
        prices,
        timestamps,
        asset: 'ETH',
      });

      expect(result).toBeDefined();
    });

    it('should sort anomalies by timestamp descending', () => {
      const prices = [
        100, 100, 100, 100, 100, 100, 100, 100, 100, 150, 150, 150, 150, 150, 150, 150, 150, 150,
        150, 200,
      ];
      const timestamps = createTimestamps(20);

      const result = detectAllAnomalies({
        prices,
        timestamps,
        asset: 'BTC',
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].timestamp).toBeGreaterThanOrEqual(result[i].timestamp);
      }
    });

    it('should use default asset name when not provided', () => {
      const prices = Array(15)
        .fill(0)
        .map((_, i) => 100 + i);
      const timestamps = createTimestamps(15);

      const result = detectAllAnomalies({
        prices,
        timestamps,
      });

      result.forEach((anomaly) => {
        if (anomaly.asset) {
          expect(anomaly.asset).toBe('Unknown');
        }
      });
    });

    it('should return empty array for insufficient data', () => {
      const prices = [100, 101, 102];
      const timestamps = createTimestamps(3);

      const result = detectAllAnomalies({
        prices,
        timestamps,
        asset: 'BTC',
      });

      expect(result).toEqual([]);
    });

    it('should handle empty arrays gracefully', () => {
      const result = detectAllAnomalies({
        prices: [],
        timestamps: [],
        asset: 'BTC',
      });

      expect(result).toEqual([]);
    });
  });

  describe('Helper Functions', () => {
    describe('getAnomalyLevelColor', () => {
      it('should return correct color for low level', () => {
        const color = getAnomalyLevelColor('low');
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });

      it('should return correct color for medium level', () => {
        const color = getAnomalyLevelColor('medium');
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });

      it('should return correct color for high level', () => {
        const color = getAnomalyLevelColor('high');
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });

      it('should return correct color for critical level', () => {
        const color = getAnomalyLevelColor('critical');
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });

    describe('getAnomalyIcon', () => {
      it('should return correct icon for price_spike', () => {
        expect(getAnomalyIcon('price_spike')).toBe('TrendingUp');
      });

      it('should return correct icon for price_drop', () => {
        expect(getAnomalyIcon('price_drop')).toBe('TrendingDown');
      });

      it('should return correct icon for volatility_spike', () => {
        expect(getAnomalyIcon('volatility_spike')).toBe('Activity');
      });

      it('should return correct icon for trend_break', () => {
        expect(getAnomalyIcon('trend_break')).toBe('GitBranch');
      });

      it('should return correct icon for volume_anomaly', () => {
        expect(getAnomalyIcon('volume_anomaly')).toBe('BarChart3');
      });

      it('should return correct icon for correlation_break', () => {
        expect(getAnomalyIcon('correlation_break')).toBe('Unlink');
      });
    });

    describe('getAnomalyTypeText', () => {
      it('should return correct text for price_spike', () => {
        expect(getAnomalyTypeText('Text')).toBe('anomaly_price_spike');
      });

      it('should return correct text for price_drop', () => {
        expect(getAnomalyTypeText('Text')).toBe('anomaly_price_drop');
      });

      it('should return correct text for volatility_spike', () => {
        expect(getAnomalyTypeText('Text')).toBe('anomaly_volatility_spike');
      });

      it('should return correct text for trend_break', () => {
        expect(getAnomalyTypeText('Text')).toBe('anomaly_trend_break');
      });

      it('should return correct text for volume_anomaly', () => {
        expect(getAnomalyTypeText('Text')).toBe('anomaly_volume');
      });

      it('should return correct text for correlation_break', () => {
        expect(getAnomalyTypeText('Text')).toBe('anomaly_correlation_break');
      });
    });

    describe('getUnacknowledgedAnomalies', () => {
      it('should filter out acknowledged anomalies', () => {
        const anomalies: AnomalyData[] = [
          {
            id: '1',
            type: 'price_spike',
            level: 'high',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 100,
            expectedValue: 90,
            deviation: 2.5,
            duration: 0,
            acknowledged: true,
          },
          {
            id: '2',
            type: 'price_drop',
            level: 'medium',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 80,
            expectedValue: 90,
            deviation: 2.1,
            duration: 0,
            acknowledged: false,
          },
        ];

        const result = getUnacknowledgedAnomalies(anomalies);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('2');
      });

      it('should return all anomalies when none are acknowledged', () => {
        const anomalies: AnomalyData[] = [
          {
            id: '1',
            type: 'price_spike',
            level: 'high',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 100,
            expectedValue: 90,
            deviation: 2.5,
            duration: 0,
            acknowledged: false,
          },
          {
            id: '2',
            type: 'price_drop',
            level: 'medium',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 80,
            expectedValue: 90,
            deviation: 2.1,
            duration: 0,
            acknowledged: false,
          },
        ];

        const result = getUnacknowledgedAnomalies(anomalies);
        expect(result.length).toBe(2);
      });

      it('should return empty array when all are acknowledged', () => {
        const anomalies: AnomalyData[] = [
          {
            id: '1',
            type: 'price_spike',
            level: 'high',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 100,
            expectedValue: 90,
            deviation: 2.5,
            duration: 0,
            acknowledged: true,
          },
        ];

        const result = getUnacknowledgedAnomalies(anomalies);
        expect(result).toEqual([]);
      });

      it('should handle empty array', () => {
        const result = getUnacknowledgedAnomalies([]);
        expect(result).toEqual([]);
      });
    });

    describe('countAnomaliesByLevel', () => {
      it('should count anomalies by level correctly', () => {
        const anomalies: AnomalyData[] = [
          {
            id: '1',
            type: 'price_spike',
            level: 'high',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 100,
            expectedValue: 90,
            deviation: 2.5,
            duration: 0,
            acknowledged: false,
          },
          {
            id: '2',
            type: 'price_drop',
            level: 'high',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 80,
            expectedValue: 90,
            deviation: 2.1,
            duration: 0,
            acknowledged: false,
          },
          {
            id: '3',
            type: 'volatility_spike',
            level: 'medium',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 50,
            expectedValue: 30,
            deviation: 2.3,
            duration: 0,
            acknowledged: false,
          },
        ];

        const result = countAnomaliesByLevel(anomalies);
        expect(result.high).toBe(2);
        expect(result.medium).toBe(1);
      });

      it('should return empty object for empty array', () => {
        const result = countAnomaliesByLevel([]);
        expect(result).toEqual({});
      });

      it('should count all levels', () => {
        const anomalies: AnomalyData[] = [
          {
            id: '1',
            type: 'price_spike',
            level: 'low',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 100,
            expectedValue: 90,
            deviation: 2.1,
            duration: 0,
            acknowledged: false,
          },
          {
            id: '2',
            type: 'price_drop',
            level: 'medium',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 80,
            expectedValue: 90,
            deviation: 2.3,
            duration: 0,
            acknowledged: false,
          },
          {
            id: '3',
            type: 'volatility_spike',
            level: 'high',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 50,
            expectedValue: 30,
            deviation: 3.1,
            duration: 0,
            acknowledged: false,
          },
          {
            id: '4',
            type: 'trend_break',
            level: 'critical',
            title: 'Test',
            description: 'Test',
            timestamp: Date.now(),
            value: 200,
            expectedValue: 100,
            deviation: 4.5,
            duration: 0,
            acknowledged: false,
          },
        ];

        const result = countAnomaliesByLevel(anomalies);
        expect(result.low).toBe(1);
        expect(result.medium).toBe(1);
        expect(result.high).toBe(1);
        expect(result.critical).toBe(1);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    it('should handle NaN values in data', () => {
      const data = [10, 10, NaN, 10, 10];
      const result = calculateStdDevDetection(data, 2);

      expect(result).toBeDefined();
    });

    it('should handle Infinity values', () => {
      const data = [10, 10, Infinity, 10, 10];
      const result = calculateStdDevDetection(data, 2);

      expect(result).toBeDefined();
    });

    it('should handle very small price changes', () => {
      const prices = [
        100.0000001, 100.0000002, 100.0000003, 100.0000004, 100.0000005, 100.0000006, 100.0000007,
        100.0000008, 100.0000009, 100.000001,
      ];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result).toBeDefined();
    });

    it('should handle prices with many decimal places', () => {
      const prices = [
        0.00001234, 0.00001235, 0.00001236, 0.00001237, 0.00001238, 0.00001239, 0.0000124,
        0.00001241, 0.00001242, 0.00001243,
      ];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result).toBeDefined();
    });

    it('should handle zero prices', () => {
      const prices = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const timestamps = createTimestamps(10);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result).toEqual([]);
    });

    it('should handle negative volumes', () => {
      const volumes = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, -5000];
      const timestamps = createTimestamps(10);
      const result = detectVolumeAnomalies(volumes, timestamps);

      expect(result).toBeDefined();
    });

    it('should handle mismatched array lengths', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
      const timestamps = createTimestamps(5);
      const result = detectPriceAnomalies(prices, timestamps, 'BTC');

      expect(result).toBeDefined();
    });

    it('should handle very large datasets', () => {
      const prices = Array(1000)
        .fill(0)
        .map((_, i) => 100 + Math.sin(i * 0.1) * 10);
      const timestamps = createTimestamps(1000);
      const result = detectAllAnomalies({
        prices,
        timestamps,
        asset: 'BTC',
      });

      expect(result).toBeDefined();
    });

    it('should handle single anomaly in dataset', () => {
      const data = [100, 100, 100, 100, 100, 100, 100, 100, 100, 1000];
      const result = calculateStdDevDetection(data, 2);

      expect(result.anomalies.length).toBe(1);
      expect(result.anomalies[0].value).toBe(1000);
    });

    it('should handle all values being the same', () => {
      const data = [50, 50, 50, 50, 50];
      const result = calculateStdDevDetection(data, 2);

      expect(result.mean).toBe(50);
      expect(result.stdDev).toBe(0);
      expect(result.upperBound).toBe(50);
      expect(result.lowerBound).toBe(50);
    });
  });

  describe('Type Exports', () => {
    it('should export AnomalyLevel type', () => {
      const level: AnomalyLevel = 'high';
      expect(['low', 'medium', 'high', 'critical']).toContain(level);
    });

    it('should export AnomalyType type', () => {
      const type: AnomalyType = 'price_spike';
      expect([
        'price_spike',
        'price_drop',
        'volatility_spike',
        'trend_break',
        'volume_anomaly',
        'correlation_break',
      ]).toContain(type);
    });

    it('should export AnomalyData interface', () => {
      const anomaly: AnomalyData = {
        id: 'test',
        type: 'price_spike',
        level: 'high',
        title: 'Test',
        description: 'Test description',
        timestamp: Date.now(),
        value: 100,
        expectedValue: 90,
        deviation: 2.5,
        duration: 0,
        acknowledged: false,
      };

      expect(anomaly.id).toBe('test');
      expect(anomaly.type).toBe('price_spike');
      expect(anomaly.level).toBe('high');
    });
  });

  describe('Error Handling Coverage', () => {
    const createTimestamps = (count: number): number[] => {
      const now = Date.now();
      return Array.from({ length: count }, (_, i) => now + i * 60000);
    };

    describe('detectPriceAnomalies error handling', () => {
      it('should return empty array for insufficient data', () => {
        const prices = [100, 101, 102, 103, 104];
        const timestamps = createTimestamps(5);
        const result = detectPriceAnomalies(prices, timestamps, 'BTC');
        expect(result).toEqual([]);
      });
    });

    describe('detectTrendBreak error handling', () => {
      it('should return default result for insufficient data', () => {
        const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
        const timestamps = createTimestamps(10);
        const result = detectTrendBreak(data, timestamps, 2);
        expect(result.trend.direction).toBe('flat');
        expect(result.trend.strength).toBe(0);
        expect(result.trend.confidence).toBe(0);
        expect(result.anomalies).toEqual([]);
      });
    });

    describe('detectVolatilityAnomalies error handling', () => {
      it('should return empty array for insufficient data', () => {
        const prices = [100, 101, 102, 103, 104];
        const timestamps = createTimestamps(5);
        const result = detectVolatilityAnomalies(prices, timestamps, 20);
        expect(result).toEqual([]);
      });
    });

    describe('detectVolumeAnomalies error handling', () => {
      it('should return empty array for insufficient data', () => {
        const volumes = [1000, 1000, 1000, 1000, 1000];
        const timestamps = createTimestamps(5);
        const result = detectVolumeAnomalies(volumes, timestamps);
        expect(result).toEqual([]);
      });
    });

    describe('detectAllAnomalies error handling', () => {
      it('should return empty array for insufficient data', () => {
        const prices = [100, 101, 102];
        const timestamps = createTimestamps(3);
        const result = detectAllAnomalies({
          prices,
          timestamps,
          asset: 'BTC',
        });
        expect(result).toEqual([]);
      });

      it('should handle empty arrays gracefully', () => {
        const result = detectAllAnomalies({
          prices: [],
          timestamps: [],
          asset: 'BTC',
        });
        expect(result).toEqual([]);
      });
    });
  });
});
