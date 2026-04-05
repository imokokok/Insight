/**
 * @fileoverview 价格统计 Hook
 * @description 计算价格数据的各种统计指标，包括平均值、加权平均值、最大值、最小值、价格范围、方差、标准差等
 */

import { useMemo } from 'react';

import {
  calculateMean,
  calculateMedian,
  calculateVariance,
  calculateStdDev,
  calculateWeightedAverage,
  calculateStandardDeviationFromVariance,
} from '@/lib/utils/statistics';
import { type PriceData, type SnapshotStats } from '@/types/oracle';

import { type PriceStatsResult } from '../types/index';

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
  const weightedAvgPrice = useMemo(
    () =>
      calculateWeightedAverage(priceData.map((d) => ({ value: d.price, weight: d.confidence }))),
    [priceData]
  );

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

  // 计算中位数
  const medianPrice = useMemo(() => calculateMedian(validPrices), [validPrices]);

  // 计算价格范围
  const priceRange = maxPrice - minPrice;

  // 计算方差
  const variance = useMemo(() => calculateVariance(validPrices, avgPrice), [validPrices, avgPrice]);

  // 计算标准差
  const standardDeviation = useMemo(
    () => calculateStandardDeviationFromVariance(variance),
    [variance]
  );

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
      medianPrice,
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
      medianPrice,
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
    medianPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    currentStats,
  } as PriceStatsResult;
}

export default usePriceStats;
