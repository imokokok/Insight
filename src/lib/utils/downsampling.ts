export interface DataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ma7?: number;
  isComparison?: boolean;
  predictionUpper?: number;
  predictionLower?: number;
  predictionMean?: number;
  [key: string]: unknown;
}

export interface DownsamplingConfig {
  targetPoints?: number;
  preservePeaks?: boolean;
  preserveTrends?: boolean;
  maxDataPoints?: number;
  performanceMode?: boolean;
}

const DEFAULT_CONFIG: Required<DownsamplingConfig> = {
  targetPoints: 250,
  preservePeaks: true,
  preserveTrends: true,
  maxDataPoints: 10000,
  performanceMode: false,
};

function calculateOptimalTargetPoints(dataLength: number, config: DownsamplingConfig): number {
  if (config.targetPoints) return config.targetPoints;

  if (config.performanceMode) {
    return Math.min(150, Math.floor(dataLength * 0.1));
  }

  if (dataLength <= 200) return dataLength;
  if (dataLength <= 500) return 125;
  if (dataLength <= 1000) return 175;
  if (dataLength <= 2000) return 250;
  if (dataLength <= 5000) return 350;
  return 500;
}

export function downsampleData(data: DataPoint[], config: DownsamplingConfig = {}): DataPoint[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const dataLength = data.length;

  if (dataLength <= 200) return data;

  const targetPoints = calculateOptimalTargetPoints(dataLength, finalConfig);
  if (targetPoints >= dataLength) return data;

  if (dataLength > finalConfig.maxDataPoints) {
    const step = Math.ceil(dataLength / finalConfig.maxDataPoints);
    const sampled = data.filter((_, index) => index % step === 0);
    return downsampleData(sampled, { ...finalConfig, maxDataPoints: Infinity });
  }

  const result: DataPoint[] = [];
  result.push({ ...data[0] });

  const bucketSize = (dataLength - 2) / (targetPoints - 2);

  for (let i = 0; i < targetPoints - 2; i++) {
    const start = Math.floor(i * bucketSize) + 1;
    const end = Math.min(Math.floor((i + 1) * bucketSize) + 1, dataLength - 1);

    if (start >= end) {
      result.push({ ...data[start] });
      continue;
    }

    const bucket = data.slice(start, end);

    if (finalConfig.preservePeaks) {
      let maxPrice = bucket[0].price;
      let minPrice = bucket[0].price;

      for (const point of bucket) {
        if (point.price > maxPrice) {
          maxPrice = point.price;
        }
        if (point.price < minPrice) {
          minPrice = point.price;
        }
      }

      const midIndex = Math.floor(bucket.length / 2);
      const midPoint = bucket[midIndex];

      if (minPrice !== 0 && Math.abs(maxPrice - minPrice) / minPrice > 0.02) {
        const firstHalf = bucket.slice(0, midIndex);
        const secondHalf = bucket.slice(midIndex);

        let firstHalfMax = firstHalf[0];
        let firstHalfMin = firstHalf[0];
        for (const p of firstHalf) {
          if (p.price > firstHalfMax.price) firstHalfMax = p;
          if (p.price < firstHalfMin.price) firstHalfMin = p;
        }

        let secondHalfMax = secondHalf[0];
        let secondHalfMin = secondHalf[0];
        for (const p of secondHalf) {
          if (p.price > secondHalfMax.price) secondHalfMax = p;
          if (p.price < secondHalfMin.price) secondHalfMin = p;
        }

        const firstPoint = firstHalfMax.price > firstHalfMin.price ? firstHalfMax : firstHalfMin;
        const secondPoint =
          secondHalfMax.price > secondHalfMin.price ? secondHalfMax : secondHalfMin;

        result.push({ ...firstPoint });
        result.push({ ...secondPoint });
      } else {
        result.push({ ...midPoint });
      }
    } else if (finalConfig.preserveTrends) {
      const trendPoints = bucket.filter((_, idx) => idx % Math.ceil(bucket.length / 3) === 0);
      trendPoints.forEach((p) => result.push({ ...p }));
    }
  }

  result.push({ ...data[dataLength - 1] });

  return result;
}

export function downsampleDataForPerformance(data: DataPoint[]): DataPoint[] {
  return downsampleData(data, {
    targetPoints: 150,
    preservePeaks: true,
    preserveTrends: false,
    performanceMode: true,
  });
}

export interface AdaptiveDownsampleConfig {
  renderTime?: number;
  targetRenderTime?: number;
  minPoints?: number;
  maxPoints?: number;
}

const PERFORMANCE_THRESHOLDS = {
  excellent: { maxRenderTime: 100, targetPoints: 500 },
  good: { maxRenderTime: 200, targetPoints: 350 },
  acceptable: { maxRenderTime: 300, targetPoints: 250 },
  poor: { maxRenderTime: 500, targetPoints: 150 },
  critical: { maxRenderTime: Infinity, targetPoints: 100 },
};

export function adaptiveDownsample(
  data: DataPoint[],
  config: AdaptiveDownsampleConfig = {}
): DataPoint[] {
  const { renderTime = 0, targetRenderTime = 300, minPoints = 100, maxPoints = 500 } = config;

  const dataLength = data.length;

  if (dataLength <= minPoints) {
    return data;
  }

  let targetPoints: number;

  if (renderTime === 0) {
    if (dataLength <= 200) return data;
    if (dataLength <= 500) targetPoints = Math.min(250, dataLength);
    else if (dataLength <= 1000) targetPoints = 300;
    else if (dataLength <= 2000) targetPoints = 350;
    else if (dataLength <= 5000) targetPoints = 400;
    else targetPoints = maxPoints;
  } else {
    const renderRatio = renderTime / targetRenderTime;

    if (renderRatio <= 0.5) {
      targetPoints = PERFORMANCE_THRESHOLDS.excellent.targetPoints;
    } else if (renderRatio <= 0.75) {
      targetPoints = PERFORMANCE_THRESHOLDS.good.targetPoints;
    } else if (renderRatio <= 1.0) {
      targetPoints = PERFORMANCE_THRESHOLDS.acceptable.targetPoints;
    } else if (renderRatio <= 1.5) {
      targetPoints = PERFORMANCE_THRESHOLDS.poor.targetPoints;
    } else {
      targetPoints = PERFORMANCE_THRESHOLDS.critical.targetPoints;
    }

    targetPoints = Math.max(minPoints, Math.min(maxPoints, Math.floor(targetPoints / renderRatio)));
  }

  targetPoints = Math.min(targetPoints, dataLength);

  return downsampleData(data, {
    targetPoints,
    preservePeaks: true,
    preserveTrends: targetPoints >= 250,
  });
}

export function shouldDownsample(dataLength: number, threshold: number = 500): boolean {
  return dataLength > threshold;
}

export function calculateOptimalPoints(
  dataLength: number,
  devicePerformance: 'low' | 'medium' | 'high' = 'medium'
): number {
  const multipliers = {
    low: 0.5,
    medium: 1,
    high: 1.5,
  };

  const basePoints = calculateOptimalTargetPoints(dataLength, {});
  return Math.floor(basePoints * multipliers[devicePerformance]);
}

export function getDownsamplingMetrics(
  originalLength: number,
  downsampledLength: number,
  processingTime: number
): {
  compressionRatio: number;
  pointsRemoved: number;
  processingTimeMs: number;
  efficiency: 'excellent' | 'good' | 'acceptable' | 'poor';
} {
  const compressionRatio =
    originalLength === 0 ? 0 : (1 - downsampledLength / originalLength) * 100;
  const pointsRemoved = originalLength - downsampledLength;

  let efficiency: 'excellent' | 'good' | 'acceptable' | 'poor';
  if (processingTime < 10) efficiency = 'excellent';
  else if (processingTime < 30) efficiency = 'good';
  else if (processingTime < 50) efficiency = 'acceptable';
  else efficiency = 'poor';

  return {
    compressionRatio,
    pointsRemoved,
    processingTimeMs: processingTime,
    efficiency,
  };
}
