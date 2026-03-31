'use client';

import { useCallback, useMemo } from 'react';

export interface DataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface Anomaly {
  index: number;
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  type: 'zscore' | 'iqr' | 'trend';
}

export interface PredictionResult {
  timestamp: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface CorrelationResult {
  coefficient: number;
  strength: 'none' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative' | 'none';
}

export interface ComparisonResult {
  dataSource1: string;
  dataSource2: string;
  metric: string;
  value1: number;
  value2: number;
  difference: number;
  percentChange: number;
  correlation?: CorrelationResult;
}

export interface MetricDefinition {
  id: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
}

export interface ReportConfig {
  title: string;
  metrics: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  chartType: 'line' | 'bar' | 'area' | 'scatter';
  filters: Record<string, unknown>;
  groupBy?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'dapi' | 'chain' | 'timeframe';
  data: DataPoint[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

const SENSITIVITY_THRESHOLDS = {
  low: { zscore: 3.5, iqrMultiplier: 3 },
  medium: { zscore: 2.5, iqrMultiplier: 1.5 },
  high: { zscore: 1.5, iqrMultiplier: 1 },
};

export function useAPI3Analytics() {
  const calculateMovingAverage = useCallback((data: number[], window: number): number[] => {
    if (data.length < window) {
      return new Array(data.length).fill(null);
    }

    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(null as unknown as number);
      } else {
        const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
      }
    }
    return result;
  }, []);

  const calculateStandardDeviation = useCallback((data: number[]): number => {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(avgSquaredDiff);
  }, []);

  const calculateMean = useCallback((data: number[]): number => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }, []);

  const detectAnomaliesByZScore = useCallback(
    (data: DataPoint[], threshold: number = 2.5): Anomaly[] => {
      if (data.length < 3) return [];

      const values = data.map((d) => d.value);
      const mean = calculateMean(values);
      const std = calculateStandardDeviation(values);

      if (std === 0) return [];

      const anomalies: Anomaly[] = [];
      for (let i = 0; i < data.length; i++) {
        const zScore = Math.abs((data[i].value - mean) / std);
        if (zScore > threshold) {
          const deviation = Math.abs(data[i].value - mean);
          const severity: 'low' | 'medium' | 'high' =
            zScore > threshold * 1.5 ? 'high' : zScore > threshold * 1.2 ? 'medium' : 'low';
          anomalies.push({
            index: i,
            timestamp: data[i].timestamp,
            value: data[i].value,
            expectedValue: mean,
            deviation,
            severity,
            type: 'zscore',
          });
        }
      }
      return anomalies;
    },
    [calculateMean, calculateStandardDeviation]
  );

  const detectAnomaliesByIQR = useCallback(
    (data: DataPoint[]): Anomaly[] => {
      if (data.length < 4) return [];

      const values = data.map((d) => d.value).sort((a, b) => a - b);
      const q1Index = Math.floor(values.length * 0.25);
      const q3Index = Math.floor(values.length * 0.75);
      const q1 = values[q1Index];
      const q3 = values[q3Index];
      const iqr = q3 - q1;

      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const anomalies: Anomaly[] = [];
      const mean = calculateMean(data.map((d) => d.value));

      for (let i = 0; i < data.length; i++) {
        if (data[i].value < lowerBound || data[i].value > upperBound) {
          const deviation = Math.abs(data[i].value - mean);
          const distanceFromBound =
            data[i].value < lowerBound ? lowerBound - data[i].value : data[i].value - upperBound;
          const severity: 'low' | 'medium' | 'high' =
            distanceFromBound > iqr * 2 ? 'high' : distanceFromBound > iqr ? 'medium' : 'low';
          anomalies.push({
            index: i,
            timestamp: data[i].timestamp,
            value: data[i].value,
            expectedValue: mean,
            deviation,
            severity,
            type: 'iqr',
          });
        }
      }
      return anomalies;
    },
    [calculateMean]
  );

  const detectAnomalies = useCallback(
    (data: DataPoint[], sensitivity: 'low' | 'medium' | 'high' = 'medium'): Anomaly[] => {
      const thresholds = SENSITIVITY_THRESHOLDS[sensitivity];
      const zscoreAnomalies = detectAnomaliesByZScore(data, thresholds.zscore);
      const iqrAnomalies = detectAnomaliesByIQR(data);

      const anomalyMap = new Map<number, Anomaly>();
      [...zscoreAnomalies, ...iqrAnomalies].forEach((anomaly) => {
        const existing = anomalyMap.get(anomaly.index);
        if (!existing || anomaly.severity === 'high') {
          anomalyMap.set(anomaly.index, anomaly);
        }
      });

      return Array.from(anomalyMap.values()).sort((a, b) => a.index - b.index);
    },
    [detectAnomaliesByZScore, detectAnomaliesByIQR]
  );

  const calculateCorrelation = useCallback((x: number[], y: number[]): CorrelationResult => {
    if (x.length !== y.length || x.length < 2) {
      return {
        coefficient: 0,
        strength: 'none',
        direction: 'none',
      };
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return {
        coefficient: 0,
        strength: 'none',
        direction: 'none',
      };
    }

    const coefficient = numerator / denominator;
    const absCoefficient = Math.abs(coefficient);

    let strength: CorrelationResult['strength'];
    if (absCoefficient < 0.1) strength = 'none';
    else if (absCoefficient < 0.3) strength = 'weak';
    else if (absCoefficient < 0.5) strength = 'moderate';
    else if (absCoefficient < 0.7) strength = 'strong';
    else strength = 'very_strong';

    const direction: CorrelationResult['direction'] =
      coefficient > 0.05 ? 'positive' : coefficient < -0.05 ? 'negative' : 'none';

    return { coefficient, strength, direction };
  }, []);

  const predictTrend = useCallback(
    (data: DataPoint[], days: number, confidenceLevel: number = 0.95): PredictionResult[] => {
      if (data.length < 2) return [];

      const values = data.map((d) => d.value);
      const n = values.length;

      const xMean = (n - 1) / 2;
      const yMean = calculateMean(values);

      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += Math.pow(i - xMean, 2);
      }

      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;

      const residuals: number[] = [];
      for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        residuals.push(values[i] - predicted);
      }
      const standardError = calculateStandardDeviation(residuals);

      const zScore = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.95 ? 1.96 : 1.645;
      const lastTimestamp = data[data.length - 1].timestamp;
      const avgInterval =
        data.length > 1 ? (lastTimestamp - data[0].timestamp) / (data.length - 1) : 86400000;

      const predictions: PredictionResult[] = [];
      for (let i = 1; i <= days; i++) {
        const futureIndex = n - 1 + i;
        const predicted = slope * futureIndex + intercept;
        const intervalWidth =
          zScore *
          standardError *
          Math.sqrt(1 + 1 / n + Math.pow(futureIndex - xMean, 2) / denominator);

        predictions.push({
          timestamp: lastTimestamp + i * avgInterval,
          predicted,
          lowerBound: predicted - intervalWidth,
          upperBound: predicted + intervalWidth,
        });
      }

      return predictions;
    },
    [calculateMean, calculateStandardDeviation]
  );

  const calculatePredictionAccuracy = useCallback(
    (actual: DataPoint[], predicted: PredictionResult[]): number => {
      if (actual.length === 0 || predicted.length === 0) return 0;

      let correctPredictions = 0;
      const tolerance = 0.1;

      for (const pred of predicted) {
        const actualPoint = actual.find((a) => Math.abs(a.timestamp - pred.timestamp) < 86400000);
        if (actualPoint) {
          const lowerBound = actualPoint.value * (1 - tolerance);
          const upperBound = actualPoint.value * (1 + tolerance);
          if (pred.predicted >= lowerBound && pred.predicted <= upperBound) {
            correctPredictions++;
          }
        }
      }

      return predicted.length > 0 ? (correctPredictions / predicted.length) * 100 : 0;
    },
    []
  );

  const compareDataSources = useCallback(
    (source1: DataSource, source2: DataSource, metric: string): ComparisonResult => {
      const values1 = source1.data.map((d) => d.value);
      const values2 = source2.data.map((d) => d.value);

      const avg1 = calculateMean(values1);
      const avg2 = calculateMean(values2);

      const difference = avg1 - avg2;
      const percentChange = avg2 !== 0 ? ((avg1 - avg2) / avg2) * 100 : 0;

      const minLength = Math.min(values1.length, values2.length);
      const correlation = calculateCorrelation(
        values1.slice(0, minLength),
        values2.slice(0, minLength)
      );

      return {
        dataSource1: source1.name,
        dataSource2: source2.name,
        metric,
        value1: avg1,
        value2: avg2,
        difference,
        percentChange,
        correlation,
      };
    },
    [calculateMean, calculateCorrelation]
  );

  const calculateTrendDirection = useCallback(
    (data: DataPoint[]): 'up' | 'down' | 'stable' => {
      if (data.length < 2) return 'stable';

      const values = data.map((d) => d.value);
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));

      const firstAvg = calculateMean(firstHalf);
      const secondAvg = calculateMean(secondHalf);

      const changePercent = Math.abs((secondAvg - firstAvg) / firstAvg) * 100;

      if (changePercent < 1) return 'stable';
      return secondAvg > firstAvg ? 'up' : 'down';
    },
    [calculateMean]
  );

  const calculateVolatility = useCallback(
    (data: DataPoint[]): number => {
      if (data.length < 2) return 0;

      const values = data.map((d) => d.value);
      const returns: number[] = [];

      for (let i = 1; i < values.length; i++) {
        if (values[i - 1] !== 0) {
          returns.push((values[i] - values[i - 1]) / values[i - 1]);
        }
      }

      return calculateStandardDeviation(returns) * Math.sqrt(365);
    },
    [calculateStandardDeviation]
  );

  const generateReportData = useCallback(
    (config: ReportConfig, data: DataPoint[]) => {
      const startTime = config.timeRange.start.getTime();
      const endTime = config.timeRange.end.getTime();

      const filteredData = data.filter((d) => d.timestamp >= startTime && d.timestamp <= endTime);

      return {
        config,
        data: filteredData,
        statistics: {
          count: filteredData.length,
          mean: calculateMean(filteredData.map((d) => d.value)),
          std: calculateStandardDeviation(filteredData.map((d) => d.value)),
          min: Math.min(...filteredData.map((d) => d.value)),
          max: Math.max(...filteredData.map((d) => d.value)),
        },
        anomalies: detectAnomalies(filteredData, 'medium'),
        trend: calculateTrendDirection(filteredData),
        volatility: calculateVolatility(filteredData),
      };
    },
    [
      calculateMean,
      calculateStandardDeviation,
      detectAnomalies,
      calculateTrendDirection,
      calculateVolatility,
    ]
  );

  return useMemo(
    () => ({
      calculateMovingAverage,
      calculateStandardDeviation,
      calculateMean,
      detectAnomaliesByZScore,
      detectAnomaliesByIQR,
      detectAnomalies,
      calculateCorrelation,
      predictTrend,
      calculatePredictionAccuracy,
      compareDataSources,
      calculateTrendDirection,
      calculateVolatility,
      generateReportData,
    }),
    [
      calculateMovingAverage,
      calculateStandardDeviation,
      calculateMean,
      detectAnomaliesByZScore,
      detectAnomaliesByIQR,
      detectAnomalies,
      calculateCorrelation,
      predictTrend,
      calculatePredictionAccuracy,
      compareDataSources,
      calculateTrendDirection,
      calculateVolatility,
      generateReportData,
    ]
  );
}

export default useAPI3Analytics;
