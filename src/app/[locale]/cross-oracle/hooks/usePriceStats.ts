/**
 * @fileoverview 价格统计 Hook
 * @description 计算价格数据的各种统计指标，包括平均值、加权平均值、最大值、最小值、价格范围、方差、标准差等
 */

import { useMemo } from 'react';

import {
  safeMax,
  safeMin,
  calculateMedian,
  calculateVariance,
  calculateWeightedAverage,
  calculateStandardDeviationFromVariance,
} from '@/lib/utils/statistics';
import { type PriceData, type SnapshotStats } from '@/types/oracle';

import { type PriceStatsResult } from '../types/index';

export function usePriceStats(priceData: PriceData[]): PriceStatsResult {
  const validPrices = useMemo(
    () => priceData.map((d) => d.price).filter((p) => p > 0),
    [priceData]
  );

  const avgPrice = useMemo(
    () =>
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0,
    [validPrices]
  );

  const weightedAvgPrice = useMemo(
    () =>
      calculateWeightedAverage(
        priceData.map((d) => ({ value: d.price, weight: d.confidence ?? 1 }))
      ),
    [priceData]
  );

  const maxPrice = useMemo(
    () => (validPrices.length > 0 ? safeMax(validPrices) : 0),
    [validPrices]
  );

  const minPrice = useMemo(
    () => (validPrices.length > 0 ? safeMin(validPrices) : 0),
    [validPrices]
  );

  const medianPrice = useMemo(() => calculateMedian(validPrices), [validPrices]);

  const priceRange = useMemo(() => maxPrice - minPrice, [maxPrice, minPrice]);

  const variance = useMemo(() => calculateVariance(validPrices, avgPrice), [validPrices, avgPrice]);

  const standardDeviation = useMemo(
    () => calculateStandardDeviationFromVariance(variance),
    [variance]
  );

  const standardDeviationPercent = useMemo(
    () => (avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0),
    [avgPrice, standardDeviation]
  );

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
  };
}

export default usePriceStats;
