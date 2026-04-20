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

interface DownsamplingConfig {
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

  // 找到全局最大值和最小值的位置
  let globalMaxIndex = 0;
  let globalMinIndex = 0;
  let globalMaxPrice = data[0].price;
  let globalMinPrice = data[0].price;

  for (let i = 1; i < dataLength; i++) {
    if (data[i].price > globalMaxPrice) {
      globalMaxPrice = data[i].price;
      globalMaxIndex = i;
    }
    if (data[i].price < globalMinPrice) {
      globalMinPrice = data[i].price;
      globalMinIndex = i;
    }
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
      let maxPoint = bucket[0];
      let minPoint = bucket[0];

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

      // 只有当波动足够大时才保留极值点
      const priceRange = Math.abs(maxPrice - minPrice);
      const relativeThreshold = minPrice !== 0 ? priceRange / Math.abs(minPrice) : priceRange;

      if (relativeThreshold > 0.02) {
        // 保留最大值和最小值点
        // 按原始顺序添加
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

        // 选择前半部分的最值和后半部分的最值
        const firstExtreme =
          firstHalfMax.price - firstHalfMin.price >= 0 ? firstHalfMax : firstHalfMin;
        const secondExtreme =
          secondHalfMax.price - secondHalfMin.price >= 0 ? secondHalfMax : secondHalfMin;

        result.push({ ...firstExtreme });
        result.push({ ...secondExtreme });
      } else {
        result.push({ ...midPoint });
      }
    } else if (finalConfig.preserveTrends) {
      const trendPoints = bucket.filter((_, idx) => idx % Math.ceil(bucket.length / 3) === 0);
      trendPoints.forEach((p) => result.push({ ...p }));
    }
  }

  result.push({ ...data[dataLength - 1] });

  // 确保全局最大值和最小值被保留
  const resultPrices = result.map((d) => d.price);
  const resultMax = Math.max(...resultPrices);
  const resultMin = Math.min(...resultPrices);

  if (resultMax < globalMaxPrice) {
    // 找到合适的位置插入全局最大值
    const insertIndex = Math.min(globalMaxIndex, result.length - 1);
    result.splice(insertIndex, 0, { ...data[globalMaxIndex] });
  }
  if (resultMin > globalMinPrice && globalMinIndex !== globalMaxIndex) {
    const insertIndex = Math.min(globalMinIndex, result.length - 1);
    result.splice(insertIndex, 0, { ...data[globalMinIndex] });
  }

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

/**
 * LTTB (Largest Triangle Three Buckets) 降采样算法
 * 通过保留视觉上最重要的点来保持数据特征
 * 时间复杂度: O(n)
 *
 * @param data 原始数据点数组
 * @param targetPoints 目标点数
 * @returns 降采样后的数据点数组
 */
export function lttbDownsample(data: DataPoint[], targetPoints: number): DataPoint[] {
  if (data.length <= targetPoints) return data;
  if (targetPoints < 3) return data.slice(0, targetPoints);

  const result: DataPoint[] = [];
  result.push({ ...data[0] }); // 保留第一个点

  const bucketSize = (data.length - 2) / (targetPoints - 2);

  for (let i = 0; i < targetPoints - 2; i++) {
    const start = Math.floor((i + 1) * bucketSize) + 1;
    const end = Math.floor((i + 2) * bucketSize) + 1;

    // 计算当前桶的平均点（作为参考点）
    let avgX = 0;
    let avgY = 0;
    const bucketEnd = Math.min(end, data.length - 1);
    const bucketStart = Math.min(start, data.length - 1);

    for (let j = bucketStart; j < bucketEnd; j++) {
      avgX += j;
      avgY += data[j].price;
    }

    const bucketCount = bucketEnd - bucketStart;
    if (bucketCount > 0) {
      avgX /= bucketCount;
      avgY /= bucketCount;
    }

    // 在桶中找到与上一个点和平均点形成最大三角形的点
    let maxArea = -1;
    let maxIdx = bucketStart;

    const prevIdx = result.length - 1;
    const prevX = prevIdx;
    const prevY = result[prevIdx].price;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (prevX - avgX) * (data[j].price - prevY) - (prevX - j) * (avgY - prevY)
      );
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    result.push({ ...data[maxIdx] });
  }

  result.push({ ...data[data.length - 1] }); // 保留最后一个点
  return result;
}

/**
 * Min-Max 降采样算法
 * 在每个桶中保留最小值和最大值，保留极值点
 * 适合保留峰值和谷值的数据
 *
 * @param data 原始数据点数组
 * @param targetPoints 目标点数
 * @returns 降采样后的数据点数组
 */
export function minMaxDownsample(data: DataPoint[], targetPoints: number): DataPoint[] {
  if (data.length <= targetPoints) return data;

  const result: DataPoint[] = [];
  result.push({ ...data[0] });

  const bucketSize = Math.floor((data.length - 2) / (targetPoints - 2));

  for (let i = 1; i < data.length - 1; i += bucketSize) {
    const bucket = data.slice(i, Math.min(i + bucketSize, data.length - 1));
    if (bucket.length === 0) continue;

    let minPoint = bucket[0];
    let maxPoint = bucket[0];

    for (const point of bucket) {
      if (point.price < minPoint.price) minPoint = point;
      if (point.price > maxPoint.price) maxPoint = point;
    }

    // 按时间顺序添加
    if (minPoint.timestamp <= maxPoint.timestamp) {
      result.push({ ...minPoint });
      if (maxPoint.timestamp !== minPoint.timestamp) {
        result.push({ ...maxPoint });
      }
    } else {
      result.push({ ...maxPoint });
      if (minPoint.timestamp !== maxPoint.timestamp) {
        result.push({ ...minPoint });
      }
    }
  }

  result.push({ ...data[data.length - 1] });

  // 如果点数超过目标，使用 LTTB 进一步降采样
  if (result.length > targetPoints) {
    return lttbDownsample(result, targetPoints);
  }

  return result;
}

interface AdaptiveDownsampleConfig {
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
