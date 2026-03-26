'use client';

import { useMemo, useCallback } from 'react';

import type { PriceData, SnapshotStats } from '@/types/oracle';

/**
 * 历史极值类型
 */
export interface HistoryMinMaxValue {
  min: number;
  max: number;
}

/**
 * 历史极值集合
 */
export interface HistoryMinMax {
  avgPrice: HistoryMinMaxValue;
  weightedAvgPrice: HistoryMinMaxValue;
  maxPrice: HistoryMinMaxValue;
  minPrice: HistoryMinMaxValue;
  priceRange: HistoryMinMaxValue;
  standardDeviationPercent: HistoryMinMaxValue;
  variance: HistoryMinMaxValue;
}

/**
 * 一致性评级
 */
export type ConsistencyRating = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * 统计结果接口
 */
export interface OracleStatisticsResult {
  /** 有效价格数组 */
  validPrices: number[];
  /** 平均值 */
  avgPrice: number;
  /** 加权平均值 */
  weightedAvgPrice: number;
  /** 最大值 */
  maxPrice: number;
  /** 最小值 */
  minPrice: number;
  /** 价格范围 */
  priceRange: number;
  /** 方差 */
  variance: number;
  /** 标准差 */
  standardDeviation: number;
  /** 标准差百分比 */
  standardDeviationPercent: number;
  /** 中位数 */
  medianPrice: number;
  /** 当前统计快照 */
  currentStats: SnapshotStats;
  /** 一致性评级 */
  consistencyRating: ConsistencyRating;
  /** 变化百分比计算函数 */
  calculateChangePercent: (current: number, previous: number) => number | null;
  /** 获取一致性评级函数 */
  getConsistencyRating: (stdDevPercent: number) => ConsistencyRating;
  /** 更新历史极值 */
  updateHistoryMinMax: (
    currentStats: SnapshotStats,
    prevHistory: HistoryMinMax
  ) => HistoryMinMax;
}

/**
 * 初始历史极值
 */
export const initialHistoryMinMax: HistoryMinMax = {
  avgPrice: { min: Infinity, max: -Infinity },
  weightedAvgPrice: { min: Infinity, max: -Infinity },
  maxPrice: { min: Infinity, max: -Infinity },
  minPrice: { min: Infinity, max: -Infinity },
  priceRange: { min: Infinity, max: -Infinity },
  standardDeviationPercent: { min: Infinity, max: -Infinity },
  variance: { min: Infinity, max: -Infinity },
};

/**
 * 计算加权平均值
 * 使用 confidence 作为权重，如果没有 confidence 则使用权重 1
 */
function calculateWeightedAverage(
  prices: { price: number; confidence?: number | null | undefined }[]
): number {
  const validData = prices.filter((d) => d.price > 0);
  if (validData.length === 0) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  validData.forEach((data) => {
    const weight = data.confidence && data.confidence > 0 ? data.confidence : 1;
    weightedSum += data.price * weight;
    weightSum += weight;
  });

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * 计算方差
 */
function calculateVariance(prices: number[], mean: number): number {
  if (prices.length < 2) return 0;
  const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
  return sumSquaredDiff / prices.length;
}

/**
 * 计算标准差
 */
function calculateStandardDeviation(variance: number): number {
  return Math.sqrt(variance);
}

/**
 * 计算中位数
 */
function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 获取一致性评级
 */
function getConsistencyRating(stdDevPercent: number): ConsistencyRating {
  if (stdDevPercent < 0.1) return 'excellent';
  if (stdDevPercent < 0.3) return 'good';
  if (stdDevPercent < 0.5) return 'fair';
  return 'poor';
}

/**
 * 计算变化百分比
 */
function calculateChangePercent(current: number, previous: number): number | null {
  if (previous === 0 || current === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * 更新历史极值
 */
function updateHistoryMinMax(
  currentStats: SnapshotStats,
  prevHistory: HistoryMinMax
): HistoryMinMax {
  return {
    avgPrice: {
      min: Math.min(prevHistory.avgPrice.min, currentStats.avgPrice),
      max: Math.max(prevHistory.avgPrice.max, currentStats.avgPrice),
    },
    weightedAvgPrice: {
      min: Math.min(prevHistory.weightedAvgPrice.min, currentStats.weightedAvgPrice),
      max: Math.max(prevHistory.weightedAvgPrice.max, currentStats.weightedAvgPrice),
    },
    maxPrice: {
      min: Math.min(prevHistory.maxPrice.min, currentStats.maxPrice),
      max: Math.max(prevHistory.maxPrice.max, currentStats.maxPrice),
    },
    minPrice: {
      min: Math.min(prevHistory.minPrice.min, currentStats.minPrice),
      max: Math.max(prevHistory.minPrice.max, currentStats.minPrice),
    },
    priceRange: {
      min: Math.min(prevHistory.priceRange.min, currentStats.priceRange),
      max: Math.max(prevHistory.priceRange.max, currentStats.priceRange),
    },
    standardDeviationPercent: {
      min: Math.min(prevHistory.standardDeviationPercent.min, currentStats.standardDeviationPercent),
      max: Math.max(prevHistory.standardDeviationPercent.max, currentStats.standardDeviationPercent),
    },
    variance: {
      min: Math.min(prevHistory.variance.min, currentStats.variance),
      max: Math.max(prevHistory.variance.max, currentStats.variance),
    },
  };
}

/**
 * 预言机统计 Hook
 * @description 计算价格数据的各种统计指标，包括平均值、中位数、标准差等
 * @param priceData - 价格数据数组
 * @returns 统计结果和辅助函数
 */
export function useOracleStatistics(priceData: PriceData[]): OracleStatisticsResult {
  // 提取有效价格（大于 0 的价格）
  const validPrices = useMemo(
    () => priceData.map((d) => d.price).filter((p) => p > 0),
    [priceData]
  );

  // 计算平均值
  const avgPrice = useMemo(
    () =>
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0,
    [validPrices]
  );

  // 计算加权平均值
  const weightedAvgPrice = useMemo(() => calculateWeightedAverage(priceData), [priceData]);

  // 计算最大值
  const maxPrice = useMemo(
    () => (validPrices.length > 0 ? Math.max(...validPrices) : 0),
    [validPrices]
  );

  // 计算最小值
  const minPrice = useMemo(
    () => (validPrices.length > 0 ? Math.min(...validPrices) : 0),
    [validPrices]
  );

  // 计算价格范围
  const priceRange = useMemo(() => maxPrice - minPrice, [maxPrice, minPrice]);

  // 计算方差
  const variance = useMemo(() => calculateVariance(validPrices, avgPrice), [validPrices, avgPrice]);

  // 计算标准差
  const standardDeviation = useMemo(() => calculateStandardDeviation(variance), [variance]);

  // 计算标准差百分比（相对于平均值）
  const standardDeviationPercent = useMemo(
    () => (avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0),
    [avgPrice, standardDeviation]
  );

  // 计算中位数
  const medianPrice = useMemo(() => calculateMedian(validPrices), [validPrices]);

  // 构建当前统计快照
  const currentStats: SnapshotStats = useMemo(
    () => ({
      avgPrice,
      weightedAvgPrice,
      maxPrice,
      minPrice,
      priceRange,
      variance,
      standardDeviation,
      standardDeviationPercent,
    }),
    [avgPrice, weightedAvgPrice, maxPrice, minPrice, priceRange, variance, standardDeviation, standardDeviationPercent]
  );

  // 计算一致性评级
  const consistencyRating = useMemo(
    () => getConsistencyRating(standardDeviationPercent),
    [standardDeviationPercent]
  );

  // 记忆化回调函数
  const memoizedCalculateChangePercent = useCallback(
    (current: number, previous: number) => calculateChangePercent(current, previous),
    []
  );

  const memoizedGetConsistencyRating = useCallback(
    (stdDevPercent: number) => getConsistencyRating(stdDevPercent),
    []
  );

  const memoizedUpdateHistoryMinMax = useCallback(
    (currentStats: SnapshotStats, prevHistory: HistoryMinMax) =>
      updateHistoryMinMax(currentStats, prevHistory),
    []
  );

  return {
    validPrices,
    avgPrice,
    weightedAvgPrice,
    maxPrice,
    minPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    medianPrice,
    currentStats,
    consistencyRating,
    calculateChangePercent: memoizedCalculateChangePercent,
    getConsistencyRating: memoizedGetConsistencyRating,
    updateHistoryMinMax: memoizedUpdateHistoryMinMax,
  };
}

export default useOracleStatistics;
