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
  [key: string]: any;
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

export function downsampleData<T extends DataPoint>(
  data: T[],
  config: DownsamplingConfig = {}
): T[] {
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

  const result: T[] = [];
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
      let maxPoint = bucket[0];
      let minPoint = bucket[0];
      let maxPrice = bucket[0].price;
      let minPrice = bucket[0].price;

      for (const point of bucket) {
        if (point.price > maxPrice) {
          maxPrice = point.price;
          maxPoint = point;
        }
        if (point.price < minPrice) {
          minPrice = point.price;
          minPoint = point;
        }
      }

      const midIndex = Math.floor(bucket.length / 2);
      const midPoint = bucket[midIndex];

      if (Math.abs(maxPrice - minPrice) / minPrice > 0.02) {
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
        const secondPoint = secondHalfMax.price > secondHalfMin.price ? secondHalfMax : secondHalfMin;

        result.push({ ...firstPoint });
        result.push({ ...secondPoint });
      } else {
        result.push({ ...midPoint });
      }
    } else {
      const avgIndex = Math.floor(bucket.length / 2);
      result.push({ ...bucket[avgIndex] });
    }
  }

  result.push({ ...data[dataLength - 1] });

  if (finalConfig.preserveTrends && result.length > 3) {
    const smoothed: T[] = [result[0]];
    for (let i = 1; i < result.length - 1; i++) {
      const prev = result[i - 1];
      const curr = result[i];
      const next = result[i + 1];

      if (
        (prev.price < curr.price && curr.price < next.price) ||
        (prev.price > curr.price && curr.price > next.price)
      ) {
        smoothed.push(curr);
      } else {
        smoothed.push(curr);
      }
    }
    smoothed.push(result[result.length - 1]);
    return smoothed;
  }

  return result;
}

export function downsampleDataForChart<T extends DataPoint>(
  data: T[],
  chartWidth: number,
  devicePixelRatio: number = 1
): T[] {
  const targetPoints = Math.min(Math.floor(chartWidth * devicePixelRatio * 0.8), 500);
  return downsampleData(data, {
    targetPoints,
    preservePeaks: true,
    preserveTrends: true,
    performanceMode: false,
  });
}

export function downsampleDataForPerformance<T extends DataPoint>(data: T[]): T[] {
  return downsampleData(data, {
    targetPoints: 150,
    preservePeaks: true,
    preserveTrends: false,
    performanceMode: true,
  });
}

export function adaptiveDownsample<T extends DataPoint>(
  data: T[],
  options: {
    renderTime?: number;
    targetRenderTime?: number;
    chartWidth?: number;
  } = {}
): T[] {
  const { renderTime, targetRenderTime = 300, chartWidth } = options;

  if (renderTime && renderTime > targetRenderTime) {
    const ratio = targetRenderTime / renderTime;
    const currentPoints = data.length;
    const targetPoints = Math.floor(currentPoints * ratio);

    return downsampleData(data, {
      targetPoints,
      preservePeaks: true,
      preserveTrends: false,
      performanceMode: true,
    });
  }

  if (chartWidth) {
    return downsampleDataForChart(data, chartWidth);
  }

  return downsampleData(data, { preservePeaks: true, preserveTrends: true });
}
