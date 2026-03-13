/**
 * 统计工具函数 - 用于计算 CDF、分位数等统计指标
 */

export interface CDFPoint {
  value: number;
  probability: number;
  count: number;
}

export interface CDFResult {
  points: CDFPoint[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  totalCount: number;
}

export interface QuantileResult {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}

/**
 * 计算累积分布函数 (CDF)
 * CDF(x) = P(X <= x) = 小于等于x的数据点数量 / 总数据点数量
 *
 * @param data 输入数据数组
 * @param steps CDF曲线的采样点数（默认100）
 * @returns CDF计算结果
 */
export function calculateCDF(data: number[], steps: number = 100): CDFResult {
  if (data.length === 0) {
    return {
      points: [],
      p50: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0,
      mean: 0,
      stdDev: 0,
      totalCount: 0,
    };
  }

  const sortedData = [...data].sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const totalCount = sortedData.length;

  // 计算均值
  const mean = sortedData.reduce((sum, val) => sum + val, 0) / totalCount;

  // 计算标准差
  const variance = sortedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / totalCount;
  const stdDev = Math.sqrt(variance);

  // 计算分位数
  const p50 = calculatePercentile(sortedData, 50);
  const p95 = calculatePercentile(sortedData, 95);
  const p99 = calculatePercentile(sortedData, 99);

  // 生成CDF点
  const points: CDFPoint[] = [];
  const range = max - min;

  if (range === 0) {
    // 所有值相同的情况
    points.push({
      value: min,
      probability: 1,
      count: totalCount,
    });
  } else {
    for (let i = 0; i <= steps; i++) {
      const value = min + (range * i) / steps;
      const count = sortedData.filter((v) => v <= value).length;
      const probability = count / totalCount;

      points.push({
        value: Number(value.toFixed(2)),
        probability: Number((probability * 100).toFixed(2)),
        count,
      });
    }
  }

  return {
    points,
    p50,
    p95,
    p99,
    min,
    max,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    totalCount,
  };
}

/**
 * 计算指定分位数的值
 *
 * @param sortedData 已排序的数据数组
 * @param percentile 分位数 (0-100)
 * @returns 分位数值
 */
export function calculatePercentile(sortedData: number[], percentile: number): number {
  if (sortedData.length === 0) return 0;
  if (percentile <= 0) return sortedData[0];
  if (percentile >= 100) return sortedData[sortedData.length - 1];

  const index = (percentile / 100) * (sortedData.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedData[lowerIndex];
  }

  return sortedData[lowerIndex] * (1 - weight) + sortedData[upperIndex] * weight;
}

/**
 * 计算常用分位数
 *
 * @param data 输入数据数组
 * @returns 包含 P50, P90, P95, P99, P99.9 的结果
 */
export function calculateQuantiles(data: number[]): QuantileResult {
  if (data.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0, p999: 0 };
  }

  const sortedData = [...data].sort((a, b) => a - b);

  return {
    p50: calculatePercentile(sortedData, 50),
    p90: calculatePercentile(sortedData, 90),
    p95: calculatePercentile(sortedData, 95),
    p99: calculatePercentile(sortedData, 99),
    p999: calculatePercentile(sortedData, 99.9),
  };
}

/**
 * 计算直方图数据
 *
 * @param data 输入数据数组
 * @param binCount 分箱数量（默认20）
 * @returns 直方图数据点数组
 */
export function calculateHistogram(
  data: number[],
  binCount: number = 20
): { range: string; min: number; max: number; count: number; percentage: number }[] {
  if (data.length === 0) return [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  if (range === 0) {
    return [
      {
        range: `${min.toFixed(0)}`,
        min,
        max: min,
        count: data.length,
        percentage: 100,
      },
    ];
  }

  const binSize = range / binCount;
  const bins: { range: string; min: number; max: number; count: number; percentage: number }[] = [];

  for (let i = 0; i < binCount; i++) {
    const binMin = min + i * binSize;
    const binMax = min + (i + 1) * binSize;
    const count = data.filter(
      (v) => v >= binMin && (i === binCount - 1 ? v <= binMax : v < binMax)
    ).length;

    bins.push({
      range: `${binMin.toFixed(0)}-${binMax.toFixed(0)}`,
      min: binMin,
      max: binMax,
      count,
      percentage: Number(((count / data.length) * 100).toFixed(2)),
    });
  }

  return bins;
}

/**
 * 计算概率密度函数 (PDF) 的估计值
 * 使用核密度估计 (KDE) 方法
 *
 * @param data 输入数据数组
 * @param points 评估点的数量（默认100）
 * @returns PDF数据点数组
 */
export function calculatePDF(
  data: number[],
  points: number = 100
): { value: number; density: number }[] {
  if (data.length === 0) return [];

  const sortedData = [...data].sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const range = max - min;

  if (range === 0) {
    return [{ value: min, density: 1 }];
  }

  // 使用Silverman规则计算带宽
  const stdDev = Math.sqrt(
    sortedData.reduce((sum, val) => {
      const mean = sortedData.reduce((a, b) => a + b, 0) / sortedData.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / sortedData.length
  );
  const bandwidth = 1.06 * stdDev * Math.pow(data.length, -0.2);

  const result: { value: number; density: number }[] = [];

  for (let i = 0; i <= points; i++) {
    const x = min + (range * i) / points;
    let density = 0;

    for (const xi of sortedData) {
      const u = (x - xi) / bandwidth;
      // 高斯核函数
      const kernel = Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      density += kernel;
    }

    density = density / (data.length * bandwidth);

    result.push({
      value: Number(x.toFixed(2)),
      density: Number((density * 100).toFixed(4)),
    });
  }

  return result;
}

/**
 * 计算描述性统计信息
 *
 * @param data 输入数据数组
 * @returns 描述性统计结果
 */
export function calculateDescriptiveStats(data: number[]): {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
} {
  if (data.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      range: 0,
      variance: 0,
      stdDev: 0,
      skewness: 0,
      kurtosis: 0,
    };
  }

  const sortedData = [...data].sort((a, b) => a - b);
  const count = data.length;
  const mean = data.reduce((sum, val) => sum + val, 0) / count;
  const median = calculatePercentile(sortedData, 50);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const range = max - min;

  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  // 计算偏度 (Skewness)
  const skewness =
    data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / count;

  // 计算峰度 (Kurtosis)
  const kurtosis =
    data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / count - 3;

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    range: Number(range.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    skewness: Number(skewness.toFixed(4)),
    kurtosis: Number(kurtosis.toFixed(4)),
  };
}

/**
 * 格式化CDF数据用于图表显示
 *
 * @param cdfResult CDF计算结果
 * @returns 格式化后的数据点数组
 */
export function formatCDFDataForChart(
  cdfResult: CDFResult
): { x: number; y: number; label: string }[] {
  return cdfResult.points.map((point) => ({
    x: point.value,
    y: point.probability,
    label: `P(X ≤ ${point.value.toFixed(0)}) = ${point.probability.toFixed(1)}%`,
  }));
}

/**
 * 获取指定概率对应的值（逆CDF）
 *
 * @param sortedData 已排序的数据数组
 * @param probability 概率值 (0-1)
 * @returns 对应的值
 */
export function inverseCDF(sortedData: number[], probability: number): number {
  if (sortedData.length === 0) return 0;
  if (probability <= 0) return sortedData[0];
  if (probability >= 1) return sortedData[sortedData.length - 1];

  return calculatePercentile(sortedData, probability * 100);
}

/**
 * 检测异常值 (使用 IQR 方法)
 *
 * @param data 输入数据数组
 * @returns 异常值数组
 */
export function detectOutliers(data: number[]): { value: number; type: 'low' | 'high' }[] {
  if (data.length < 4) return [];

  const sortedData = [...data].sort((a, b) => a - b);
  const q1 = calculatePercentile(sortedData, 25);
  const q3 = calculatePercentile(sortedData, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers: { value: number; type: 'low' | 'high' }[] = [];

  for (const value of data) {
    if (value < lowerBound) {
      outliers.push({ value, type: 'low' });
    } else if (value > upperBound) {
      outliers.push({ value, type: 'high' });
    }
  }

  return outliers;
}

/**
 * 计算两个数据集之间的 Kolmogorov-Smirnov 统计量
 * 用于比较两个分布的相似性
 *
 * @param data1 第一个数据集
 * @param data2 第二个数据集
 * @returns KS统计量 (0-1，越小表示越相似)
 */
export function calculateKolmogorovSmirnov(data1: number[], data2: number[]): number {
  if (data1.length === 0 || data2.length === 0) return 1;

  const sorted1 = [...data1].sort((a, b) => a - b);
  const sorted2 = [...data2].sort((a, b) => a - b);

  const allValues = Array.from(new Set([...sorted1, ...sorted2])).sort((a, b) => a - b);

  let maxDiff = 0;

  for (const value of allValues) {
    const cdf1 = sorted1.filter((v) => v <= value).length / sorted1.length;
    const cdf2 = sorted2.filter((v) => v <= value).length / sorted2.length;
    const diff = Math.abs(cdf1 - cdf2);
    maxDiff = Math.max(maxDiff, diff);
  }

  return Number(maxDiff.toFixed(4));
}
