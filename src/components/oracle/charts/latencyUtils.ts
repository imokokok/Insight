export interface LatencyDataPoint {
  timestamp: string;
  latency: number;
  isAnomaly: boolean;
  fullTimestamp: Date;
}

export interface ThresholdHistoryEntry {
  timestamp: Date;
  threshold: number;
  baseline: number;
  stdDev: number;
}

export interface DynamicThreshold {
  threshold: number;
  baseline: number;
  stdDev: number;
}

export interface HistogramDataPoint {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface PredictionPoint {
  timestamp: string;
  predicted: number;
  upperBound: number;
  lowerBound: number;
  fullTimestamp: Date;
}

export interface PredictionAccuracy {
  mae: number;
  rmse: number;
  mape: number;
}

export function calculatePercentile(sortedData: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedData.length) - 1;
  return sortedData[Math.max(0, index)];
}

export function generateHistogramData(
  latencies: number[],
  bucketCount: number = 12
): HistogramDataPoint[] {
  if (latencies.length === 0) return [];

  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const range = max - min;

  if (range === 0) {
    return [{ range: `${min.toFixed(0)}`, count: latencies.length, min, max }];
  }

  const bucketSize = range / bucketCount;
  const buckets: HistogramDataPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketMin = min + i * bucketSize;
    const bucketMax = min + (i + 1) * bucketSize;
    const count = latencies.filter(
      (l) => l >= bucketMin && (i === bucketCount - 1 ? l <= bucketMax : l < bucketMax)
    ).length;

    buckets.push({
      range: `${bucketMin.toFixed(0)}-${bucketMax.toFixed(0)}`,
      count,
      min: bucketMin,
      max: bucketMax,
    });
  }

  return buckets;
}

export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

export function calculateStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

export function generateFutureTimestamp(baseDate: Date, minutesAhead: number): Date {
  const future = new Date(baseDate);
  future.setMinutes(future.getMinutes() + minutesAhead);
  return future;
}

export function generatePredictions(
  historicalData: LatencyDataPoint[],
  periods: number,
  smaPeriod: number
): PredictionPoint[] {
  if (historicalData.length === 0) return [];

  const latencies = historicalData.map((d) => d.latency);
  const sma = calculateSMA(latencies, smaPeriod);
  const stdDev = calculateStdDev(latencies);
  const lastTimestamp = historicalData[historicalData.length - 1].fullTimestamp;

  return Array.from({ length: periods }, (_, i) => {
    const futureTimestamp = generateFutureTimestamp(lastTimestamp, i + 1);
    const hour = futureTimestamp.getHours();
    const minute = futureTimestamp.getMinutes();
    const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    return {
      timestamp: label,
      predicted: Number(sma.toFixed(1)),
      upperBound: Number((sma + 1.96 * stdDev).toFixed(1)),
      lowerBound: Number(Math.max(0, sma - 1.96 * stdDev).toFixed(1)),
      fullTimestamp: futureTimestamp,
    };
  });
}

export function calculatePredictionAccuracy(actual: number[], predicted: number[]): PredictionAccuracy {
  if (actual.length === 0 || predicted.length === 0 || actual.length !== predicted.length) {
    return { mae: 0, rmse: 0, mape: 0 };
  }

  const n = actual.length;
  let maeSum = 0;
  let rmseSum = 0;
  let mapeSum = 0;
  let validMapeCount = 0;

  for (let i = 0; i < n; i++) {
    const error = Math.abs(actual[i] - predicted[i]);
    maeSum += error;
    rmseSum += error * error;

    if (actual[i] !== 0) {
      mapeSum += (error / actual[i]) * 100;
      validMapeCount++;
    }
  }

  return {
    mae: Number((maeSum / n).toFixed(2)),
    rmse: Number(Math.sqrt(rmseSum / n).toFixed(2)),
    mape: validMapeCount > 0 ? Number((mapeSum / validMapeCount).toFixed(2)) : 0,
  };
}

export function generateMockLatencyData(threshold: number): LatencyDataPoint[] {
  const now = new Date();
  const data: LatencyDataPoint[] = [];
  const baseLatency = 80;
  const normalVariance = 30;

  for (let i = 59; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setMinutes(timestamp.getMinutes() - i);

    const minute = timestamp.getMinutes();
    const hour = timestamp.getHours();

    let latency: number;
    const random = Math.random();

    if (random > 0.92) {
      latency = baseLatency + 150 + Math.random() * 100;
    } else if (random > 0.85) {
      latency = baseLatency + 80 + Math.random() * 50;
    } else {
      const timeFactor = hour >= 9 && hour <= 17 ? 1.2 : 0.9;
      latency = baseLatency + (Math.random() - 0.5) * normalVariance * timeFactor;
    }

    latency = Math.max(20, latency);
    const isAnomaly = latency > threshold;

    const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    data.push({
      timestamp: label,
      latency: Number(latency.toFixed(1)),
      isAnomaly,
      fullTimestamp: timestamp,
    });
  }

  return data;
}

export function downsampleLatencyData(
  data: LatencyDataPoint[],
  targetPoints: number = 50
): LatencyDataPoint[] {
  if (data.length <= targetPoints) {
    return data;
  }

  const step = Math.ceil(data.length / targetPoints);
  const result: LatencyDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, Math.min(i + step, data.length));

    let maxLatencyPoint = chunk[0];
    let minLatencyPoint = chunk[0];

    for (const point of chunk) {
      if (point.latency > maxLatencyPoint.latency) {
        maxLatencyPoint = point;
      }
      if (point.latency < minLatencyPoint.latency) {
        minLatencyPoint = point;
      }
    }

    if (!result.includes(maxLatencyPoint)) {
      result.push(maxLatencyPoint);
    }

    if (
      chunk.length > 2 &&
      minLatencyPoint !== maxLatencyPoint &&
      !result.includes(minLatencyPoint)
    ) {
      result.push(minLatencyPoint);
    }

    const middleIndex = Math.floor(chunk.length / 2);
    const middlePoint = chunk[middleIndex];
    if (middlePoint && !result.includes(middlePoint) && result.length < targetPoints) {
      result.push(middlePoint);
    }
  }

  const lastPoint = data[data.length - 1];
  if (!result.includes(lastPoint)) {
    result.push(lastPoint);
  }

  return result.sort((a, b) => a.fullTimestamp.getTime() - b.fullTimestamp.getTime());
}

export function calculateDynamicThreshold(data: LatencyDataPoint[]): DynamicThreshold {
  if (data.length < 20) {
    const avg = data.reduce((sum, d) => sum + d.latency, 0) / data.length;
    return {
      baseline: Number(avg.toFixed(1)),
      stdDev: 0,
      threshold: Number((avg * 2).toFixed(1)),
    };
  }

  const recentData = data.slice(-20);
  const movingAverage = recentData.reduce((sum, d) => sum + d.latency, 0) / 20;
  const variance =
    recentData.reduce((sum, d) => sum + Math.pow(d.latency - movingAverage, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  const dynamicThreshold = movingAverage + 2 * stdDev;

  return {
    baseline: Number(movingAverage.toFixed(1)),
    stdDev: Number(stdDev.toFixed(1)),
    threshold: Number(dynamicThreshold.toFixed(1)),
  };
}
