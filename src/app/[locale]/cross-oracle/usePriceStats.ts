import { useMemo } from 'react';

import { type PriceData, type SnapshotStats } from '@/types/oracle';

import {
  calculateWeightedAverage,
  calculateVariance,
  calculateStandardDeviation,
} from './constants';
import { type PriceStatsResult } from './types';

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

  const weightedAvgPrice = useMemo(() => calculateWeightedAverage(priceData), [priceData]);

  const maxPrice = useMemo(
    () => (validPrices.length > 0 ? Math.max(...validPrices) : 0),
    [validPrices]
  );

  const minPrice = useMemo(
    () => (validPrices.length > 0 ? Math.min(...validPrices) : 0),
    [validPrices]
  );

  const priceRange = maxPrice - minPrice;

  const variance = useMemo(() => calculateVariance(validPrices, avgPrice), [validPrices, avgPrice]);

  const standardDeviation = useMemo(() => calculateStandardDeviation(variance), [variance]);

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
