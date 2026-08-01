/**
 * @fileoverview Price statistics hook
 * @description Calculate various statistical metrics for price data, including mean, weighted average, max, min, price range, variance, standard deviation, etc.
 */

import { useMemo } from 'react';

import {
  calculatePriceStats,
  extractValidPrices,
  calculateMedian,
  calculateVariance,
  calculateWeightedAverage,
  calculateStandardDeviationFromVariance,
} from '@/lib/utils/statistics';
import { type PriceData, type SnapshotStats } from '@/types/oracle';

import { type PriceStatsResult } from '../types/index';

export function usePriceStats(priceData: PriceData[]): PriceStatsResult {
  const validPrices = useMemo(() => extractValidPrices(priceData), [priceData]);

  const baseStats = useMemo(() => calculatePriceStats(validPrices), [validPrices]);

  const weightedAvgPrice = useMemo(
    () =>
      calculateWeightedAverage(
        priceData.map((d) => ({ value: d.price, weight: d.confidence ?? 1 }))
      ),
    [priceData]
  );

  const medianPrice = useMemo(() => calculateMedian(validPrices), [validPrices]);

  const variance = useMemo(
    () => calculateVariance(validPrices, baseStats.avgPrice),
    [validPrices, baseStats.avgPrice]
  );

  const standardDeviation = useMemo(
    () => calculateStandardDeviationFromVariance(variance),
    [variance]
  );

  const currentStats: SnapshotStats = useMemo(
    () => ({
      avgPrice: baseStats.avgPrice,
      weightedAvgPrice,
      maxPrice: baseStats.maxPrice,
      minPrice: baseStats.minPrice,
      medianPrice,
      priceRange: baseStats.priceRange,
      variance,
      standardDeviation,
      standardDeviationPercent: baseStats.standardDeviationPercent,
    }),
    [baseStats, weightedAvgPrice, medianPrice, variance, standardDeviation]
  );

  return {
    validPrices,
    avgPrice: baseStats.avgPrice,
    weightedAvgPrice,
    maxPrice: baseStats.maxPrice,
    minPrice: baseStats.minPrice,
    medianPrice,
    priceRange: baseStats.priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent: baseStats.standardDeviationPercent,
    currentStats,
  };
}
