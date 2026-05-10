/**
 * @fileoverview Price statistics hook
 * @description Calculate various statistical metrics for price data, including mean, weighted average, max, min, price range, variance, standard deviation, etc.
 */

import { useMemo } from 'react';

import {
  calculateConsensusPrice,
  type ConsensusResult,
  type ConsensusMethod,
} from '@/lib/analytics/consensusPrice';
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

export function usePriceStats(
  priceData: PriceData[],
  symbol?: string,
  consensusMethod?: ConsensusMethod
): PriceStatsResult {
  const validPrices = useMemo(
    () => priceData.map((d) => d.price).filter((p) => p > 0 && !isNaN(p) && isFinite(p)),
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

  const consensusResult: ConsensusResult | null = useMemo(() => {
    if (priceData.length === 0) return null;
    const inputs = priceData
      .filter((p) => p.price > 0 && Number.isFinite(p.price))
      .map((p) => ({
        provider: p.provider,
        price: p.price,
        timestamp: p.timestamp,
        confidence: p.confidence,
        confidenceInterval: p.confidenceInterval,
      }));
    if (inputs.length === 0) return null;
    return calculateConsensusPrice(inputs, consensusMethod, symbol);
  }, [priceData, consensusMethod, symbol]);

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
    consensusResult,
  };
}
