import { renderHook, act } from '@testing-library/react';

import {
  useAPI3Analytics,
  type DataPoint,
  type DataSource,
  type ReportConfig,
} from '../api3/useAPI3Analytics';

describe('useAPI3Analytics', () => {
  const mockDataPoints: DataPoint[] = [
    { timestamp: 1000, value: 100 },
    { timestamp: 2000, value: 105 },
    { timestamp: 3000, value: 110 },
    { timestamp: 4000, value: 108 },
    { timestamp: 5000, value: 115 },
  ];

  describe('calculateMovingAverage', () => {
    it('should calculate moving average correctly', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data = [10, 20, 30, 40, 50];
      const ma = result.current.calculateMovingAverage(data, 3);

      expect(ma[0]).toBeNull();
      expect(ma[1]).toBeNull();
      expect(ma[2]).toBe(20);
      expect(ma[3]).toBe(30);
      expect(ma[4]).toBe(40);
    });

    it('should return nulls when data length is less than window', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data = [10, 20];
      const ma = result.current.calculateMovingAverage(data, 5);

      expect(ma).toHaveLength(2);
      expect(ma.every((v) => v === null)).toBe(true);
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const std = result.current.calculateStandardDeviation(data);

      expect(std).toBeCloseTo(2, 1);
    });

    it('should return 0 for empty data', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const std = result.current.calculateStandardDeviation([]);

      expect(std).toBe(0);
    });
  });

  describe('calculateMean', () => {
    it('should calculate mean correctly', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const mean = result.current.calculateMean([10, 20, 30, 40, 50]);

      expect(mean).toBe(30);
    });

    it('should return 0 for empty data', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const mean = result.current.calculateMean([]);

      expect(mean).toBe(0);
    });
  });

  describe('detectAnomaliesByZScore', () => {
    it('should detect anomalies using z-score', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 101 },
        { timestamp: 3000, value: 99 },
        { timestamp: 4000, value: 100 },
        { timestamp: 5000, value: 101 },
        { timestamp: 6000, value: 99 },
        { timestamp: 7000, value: 100 },
        { timestamp: 8000, value: 1000 },
      ];

      const anomalies = result.current.detectAnomaliesByZScore(data, 2);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('zscore');
    });

    it('should return empty array for small datasets', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 102 },
      ];

      const anomalies = result.current.detectAnomaliesByZScore(data);

      expect(anomalies).toEqual([]);
    });

    it('should return empty array when std is 0', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 100 },
        { timestamp: 3000, value: 100 },
      ];

      const anomalies = result.current.detectAnomaliesByZScore(data);

      expect(anomalies).toEqual([]);
    });
  });

  describe('detectAnomaliesByIQR', () => {
    it('should detect anomalies using IQR', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 102 },
        { timestamp: 3000, value: 101 },
        { timestamp: 4000, value: 103 },
        { timestamp: 5000, value: 1000 },
      ];

      const anomalies = result.current.detectAnomaliesByIQR(data);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('iqr');
    });

    it('should return empty array for small datasets', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 102 },
        { timestamp: 3000, value: 101 },
      ];

      const anomalies = result.current.detectAnomaliesByIQR(data);

      expect(anomalies).toEqual([]);
    });
  });

  describe('detectAnomalies', () => {
    it('should combine z-score and IQR anomalies', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 102 },
        { timestamp: 3000, value: 101 },
        { timestamp: 4000, value: 103 },
        { timestamp: 5000, value: 500 },
      ];

      const anomalies = result.current.detectAnomalies(data, 'medium');

      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should respect sensitivity levels', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 102 },
        { timestamp: 3000, value: 101 },
        { timestamp: 4000, value: 103 },
        { timestamp: 5000, value: 200 },
      ];

      const lowAnomalies = result.current.detectAnomalies(data, 'low');
      const highAnomalies = result.current.detectAnomalies(data, 'high');

      expect(lowAnomalies.length).toBeLessThanOrEqual(highAnomalies.length);
    });
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation correctly for positive correlation', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const correlation = result.current.calculateCorrelation(x, y);

      expect(correlation.coefficient).toBeCloseTo(1, 2);
      expect(correlation.direction).toBe('positive');
      expect(correlation.strength).toBe('very_strong');
    });

    it('should calculate correlation correctly for negative correlation', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];

      const correlation = result.current.calculateCorrelation(x, y);

      expect(correlation.coefficient).toBeCloseTo(-1, 2);
      expect(correlation.direction).toBe('negative');
    });

    it('should return none for mismatched lengths', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const correlation = result.current.calculateCorrelation([1, 2, 3], [1, 2]);

      expect(correlation.coefficient).toBe(0);
      expect(correlation.strength).toBe('none');
    });

    it('should return none for small datasets', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const correlation = result.current.calculateCorrelation([1], [2]);

      expect(correlation.strength).toBe('none');
    });
  });

  describe('predictTrend', () => {
    it('should predict future trend', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const predictions = result.current.predictTrend(mockDataPoints, 3);

      expect(predictions).toHaveLength(3);
      expect(predictions[0].predicted).toBeDefined();
      expect(predictions[0].lowerBound).toBeLessThan(predictions[0].predicted);
      expect(predictions[0].upperBound).toBeGreaterThan(predictions[0].predicted);
    });

    it('should return empty array for small datasets', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const predictions = result.current.predictTrend(
        [{ timestamp: 1000, value: 100 }],
        3
      );

      expect(predictions).toEqual([]);
    });
  });

  describe('calculatePredictionAccuracy', () => {
    it('should calculate prediction accuracy', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const actual: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 105 },
      ];

      const predicted = [
        { timestamp: 1000, predicted: 101, lowerBound: 95, upperBound: 107 },
        { timestamp: 2000, predicted: 106, lowerBound: 100, upperBound: 112 },
      ];

      const accuracy = result.current.calculatePredictionAccuracy(actual, predicted);

      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(100);
    });

    it('should return 0 for empty data', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const accuracy = result.current.calculatePredictionAccuracy([], []);

      expect(accuracy).toBe(0);
    });
  });

  describe('compareDataSources', () => {
    it('should compare two data sources', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const source1: DataSource = {
        id: '1',
        name: 'Source 1',
        type: 'dapi',
        data: [
          { timestamp: 1000, value: 100 },
          { timestamp: 2000, value: 105 },
        ],
      };

      const source2: DataSource = {
        id: '2',
        name: 'Source 2',
        type: 'dapi',
        data: [
          { timestamp: 1000, value: 102 },
          { timestamp: 2000, value: 107 },
        ],
      };

      const comparison = result.current.compareDataSources(source1, source2, 'price');

      expect(comparison.dataSource1).toBe('Source 1');
      expect(comparison.dataSource2).toBe('Source 2');
      expect(comparison.metric).toBe('price');
      expect(comparison.correlation).toBeDefined();
    });
  });

  describe('calculateTrendDirection', () => {
    it('should detect upward trend', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 110 },
        { timestamp: 3000, value: 120 },
        { timestamp: 4000, value: 130 },
      ];

      const trend = result.current.calculateTrendDirection(data);

      expect(trend).toBe('up');
    });

    it('should detect downward trend', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 130 },
        { timestamp: 2000, value: 120 },
        { timestamp: 3000, value: 110 },
        { timestamp: 4000, value: 100 },
      ];

      const trend = result.current.calculateTrendDirection(data);

      expect(trend).toBe('down');
    });

    it('should detect stable trend', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const data: DataPoint[] = [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 100.5 },
        { timestamp: 3000, value: 100.3 },
        { timestamp: 4000, value: 100.2 },
      ];

      const trend = result.current.calculateTrendDirection(data);

      expect(trend).toBe('stable');
    });

    it('should return stable for small datasets', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const trend = result.current.calculateTrendDirection([
        { timestamp: 1000, value: 100 },
      ]);

      expect(trend).toBe('stable');
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const volatility = result.current.calculateVolatility(mockDataPoints);

      expect(volatility).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for small datasets', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const volatility = result.current.calculateVolatility([
        { timestamp: 1000, value: 100 },
      ]);

      expect(volatility).toBe(0);
    });
  });

  describe('generateReportData', () => {
    it('should generate report data', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const config: ReportConfig = {
        title: 'Test Report',
        metrics: ['price'],
        timeRange: {
          start: new Date(0),
          end: new Date(10000),
        },
        chartType: 'line',
        filters: {},
      };

      const report = result.current.generateReportData(config, mockDataPoints);

      expect(report.config).toEqual(config);
      expect(report.statistics.count).toBe(5);
      expect(report.statistics.mean).toBeDefined();
      expect(report.statistics.std).toBeDefined();
      expect(report.anomalies).toBeDefined();
      expect(report.trend).toBeDefined();
      expect(report.volatility).toBeDefined();
    });

    it('should filter data by time range', () => {
      const { result } = renderHook(() => useAPI3Analytics());

      const config: ReportConfig = {
        title: 'Test Report',
        metrics: ['price'],
        timeRange: {
          start: new Date(2000),
          end: new Date(4000),
        },
        chartType: 'line',
        filters: {},
      };

      const report = result.current.generateReportData(config, mockDataPoints);

      expect(report.statistics.count).toBe(3);
    });
  });

  describe('memoization', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useAPI3Analytics());

      const firstCalculateMean = result.current.calculateMean;

      rerender();

      const secondCalculateMean = result.current.calculateMean;

      expect(firstCalculateMean).toBe(secondCalculateMean);
    });
  });
});
