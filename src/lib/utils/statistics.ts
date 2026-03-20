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
  // 过滤无效数据 (NaN 和 Infinity)
  const validData = data.filter(Number.isFinite);

  if (validData.length === 0) {
    return {
      points: [],
      p50: NaN,
      p95: NaN,
      p99: NaN,
      min: NaN,
      max: NaN,
      mean: NaN,
      stdDev: NaN,
      totalCount: 0,
    };
  }

  const sortedData = [...validData].sort((a, b) => a - b);
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
    // 使用双指针优化循环
    let dataIndex = 0;
    for (let i = 0; i <= steps; i++) {
      const value = min + (range * i) / steps;

      // 移动指针直到找到大于当前 value 的位置
      while (dataIndex < totalCount && sortedData[dataIndex] <= value) {
        dataIndex++;
      }
      const count = dataIndex;
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
  if (sortedData.length === 0) return NaN;
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
    return { p50: NaN, p90: NaN, p95: NaN, p99: NaN, p999: NaN };
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
    // 使用 Number.EPSILON 处理边界值问题
    const count = data.filter(
      (v) =>
        v >= binMin - Number.EPSILON &&
        (i === binCount - 1 ? v <= binMax + Number.EPSILON : v < binMax - Number.EPSILON)
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
