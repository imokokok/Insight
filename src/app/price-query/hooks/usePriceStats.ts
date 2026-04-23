import { useMemo } from 'react';

import { safeMax, safeMin } from '@/lib/utils';

import type { QueryResult } from '../constants';

export interface PriceStats {
  validPrices: number[];
  avgPrice: number;
  avgChange24hPercent: number | undefined;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  compareValidPrices: number[];
  compareAvgPrice: number;
  compareAvgChange24hPercent: number | undefined;
  compareMaxPrice: number;
  compareMinPrice: number;
  comparePriceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

export function usePriceStats(
  queryResults: QueryResult[],
  compareQueryResults: QueryResult[]
): PriceStats {
  return useMemo<PriceStats>(() => {
    const validPrices = queryResults
      .filter((r) => r.priceData && typeof r.priceData.price === 'number' && r.priceData.price > 0)
      .map((r) => r.priceData!.price);

    const avgPrice =
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;

    const validChanges = queryResults.filter((r) => r.priceData?.change24hPercent !== undefined);
    const avgChange24hPercent =
      validChanges.length > 0
        ? validChanges.reduce((sum, r) => sum + r.priceData!.change24hPercent!, 0) /
          validChanges.length
        : undefined;

    const maxPrice = safeMax(validPrices);
    const minPrice = safeMin(validPrices);
    const priceRange = maxPrice - minPrice;

    const variance =
      validPrices.length > 1
        ? validPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
          (validPrices.length - 1)
        : 0;
    const standardDeviation = Math.sqrt(variance);
    const standardDeviationPercent = avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;

    const compareValidPrices = compareQueryResults
      .filter((r) => r.priceData && typeof r.priceData.price === 'number' && r.priceData.price > 0)
      .map((r) => r.priceData!.price);

    const compareAvgPrice =
      compareValidPrices.length > 0
        ? compareValidPrices.reduce((a, b) => a + b, 0) / compareValidPrices.length
        : 0;

    const compareValidChanges = compareQueryResults.filter(
      (r) => r.priceData?.change24hPercent !== undefined
    );
    const compareAvgChange24hPercent =
      compareValidChanges.length > 0
        ? compareValidChanges.reduce((sum, r) => sum + r.priceData!.change24hPercent!, 0) /
          compareValidChanges.length
        : undefined;

    const compareMaxPrice = safeMax(compareValidPrices);
    const compareMinPrice = safeMin(compareValidPrices);
    const comparePriceRange = compareMaxPrice - compareMinPrice;

    return {
      validPrices,
      avgPrice,
      avgChange24hPercent,
      maxPrice,
      minPrice,
      priceRange,
      compareValidPrices,
      compareAvgPrice,
      compareAvgChange24hPercent,
      compareMaxPrice,
      compareMinPrice,
      comparePriceRange,
      variance,
      standardDeviation,
      standardDeviationPercent,
    };
  }, [queryResults, compareQueryResults]);
}
