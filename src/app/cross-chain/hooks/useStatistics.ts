/**
 * @fileoverview Statistics calculation Hook
 * Provides statistical analysis functionality for price data
 */

import { useMemo } from 'react';

import { type BaseOracleClient } from '@/lib/oracles';
import { safeMax, safeMin } from '@/lib/utils/statistics';
import { type Blockchain, type PriceData } from '@/types/oracle';

import {
  calculateVariance,
  calculateStandardDeviation,
  calculatePercentile,
  getTCriticalValue,
} from '../utils';

interface UseStatisticsParams {
  currentPrices: PriceData[];
  filteredChains: Blockchain[];
  currentClient: BaseOracleClient;
}

export interface UseStatisticsReturn {
  validPrices: number[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  coefficientOfVariation: number;
  medianPrice: number;
  iqrValue: number;
  skewness: number;
  kurtosis: number;
  confidenceInterval95: {
    lower: number;
    upper: number;
    distributionType: 't' | 'z';
    criticalValue: number;
  };
}

export function useStatistics(params: UseStatisticsParams): UseStatisticsReturn {
  const { currentPrices, filteredChains } = params;

  const validPrices = useMemo(() => {
    return currentPrices
      .filter((d) => d.chain && filteredChains.includes(d.chain))
      .map((d) => d.price)
      .filter((p) => p > 0);
  }, [currentPrices, filteredChains]);

  const avgPrice = useMemo(() => {
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  }, [validPrices]);

  const maxPrice = useMemo(() => {
    return safeMax(validPrices);
  }, [validPrices]);

  const minPrice = useMemo(() => {
    return safeMin(validPrices);
  }, [validPrices]);

  const priceRange = useMemo(() => {
    return maxPrice - minPrice;
  }, [maxPrice, minPrice]);

  const variance = useMemo(() => {
    return calculateVariance(validPrices, avgPrice);
  }, [validPrices, avgPrice]);

  const standardDeviation = useMemo(() => {
    return calculateStandardDeviation(variance);
  }, [variance]);

  const standardDeviationPercent = useMemo(() => {
    return avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;
  }, [standardDeviation, avgPrice]);

  const coefficientOfVariation = useMemo(() => {
    return avgPrice > 0 ? standardDeviation / avgPrice : 0;
  }, [standardDeviation, avgPrice]);

  const medianPrice = useMemo(() => {
    if (validPrices.length === 0) return 0;
    const sorted = [...validPrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [validPrices]);

  const iqrValue = useMemo(() => {
    if (validPrices.length < 2) return 0;
    const sorted = [...validPrices].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    return q3 - q1;
  }, [validPrices]);

  const skewness = useMemo(() => {
    if (validPrices.length < 3 || standardDeviation === 0) return 0;
    const n = validPrices.length;
    const sumCubedDiff = validPrices.reduce(
      (sum, price) => sum + Math.pow((price - avgPrice) / standardDeviation, 3),
      0
    );
    return (n / ((n - 1) * (n - 2))) * sumCubedDiff;
  }, [validPrices, avgPrice, standardDeviation]);

  const kurtosis = useMemo(() => {
    if (validPrices.length < 4 || standardDeviation === 0) return 0;
    const n = validPrices.length;
    const sumFourthDiff = validPrices.reduce(
      (sum, price) => sum + Math.pow((price - avgPrice) / standardDeviation, 4),
      0
    );
    return (
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourthDiff -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3))
    );
  }, [validPrices, avgPrice, standardDeviation]);

  const confidenceInterval95 = useMemo(() => {
    if (validPrices.length < 2 || standardDeviation === 0) {
      return {
        lower: avgPrice,
        upper: avgPrice,
        distributionType: 'z' as const,
        criticalValue: 1.96,
      };
    }
    const n = validPrices.length;
    const standardError = standardDeviation / Math.sqrt(n);

    let criticalValue: number;
    let distributionType: 't' | 'z';

    if (n < 30) {
      const df = n - 1;
      criticalValue = getTCriticalValue(df, 0.95);
      distributionType = 't';
    } else {
      criticalValue = 1.96;
      distributionType = 'z';
    }

    const marginOfError = criticalValue * standardError;
    return {
      lower: avgPrice - marginOfError,
      upper: avgPrice + marginOfError,
      distributionType,
      criticalValue,
    };
  }, [validPrices, avgPrice, standardDeviation]);

  return {
    validPrices,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    coefficientOfVariation,
    medianPrice,
    iqrValue,
    skewness,
    kurtosis,
    confidenceInterval95,
  };
}
