/**
 * @fileoverview 价格统计 Hook
 * @description 计算价格数据的各种统计指标，包括平均值、加权平均值、最大值、最小值、价格范围、方差、标准差等
 */

import { useMemo } from 'react';

import { type PriceData, type SnapshotStats } from '@/types/oracle';

import { type PriceStatsResult } from '../types';

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
 * 价格统计 Hook
 * @param priceData - 价格数据数组
 * @returns 统计结果和当前统计快照
 */
export function usePriceStats(priceData: PriceData[]): PriceStatsResult {
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
  const priceRange = maxPrice - minPrice;

  // 计算方差
  const variance = useMemo(() => calculateVariance(validPrices, avgPrice), [validPrices, avgPrice]);

  // 计算标准差
  const standardDeviation = useMemo(() => calculateStandardDeviation(variance), [variance]);

  // 计算标准差百分比（相对于平均值）
  const standardDeviationPercent = useMemo(
    () => (avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0),
    [avgPrice, standardDeviation]
  );

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
    [
      avgPrice,
      weightedAvgPrice,
      maxPrice,
      minPrice,
      priceRange,
      variance,
      standardDeviation,
      standardDeviationPercent,
    ]
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
    currentStats,
  };
}

export default usePriceStats;
