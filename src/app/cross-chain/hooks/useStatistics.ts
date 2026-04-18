/**
 * @fileoverview 统计计算 Hook
 * 提供价格数据的统计分析功能
 */

import { useMemo } from 'react';

import { type Blockchain, type PriceData, type BaseOracleClient } from '@/lib/oracles';
import { safeMax, safeMin } from '@/lib/utils/statistics';

import {
  calculateVariance,
  calculateStandardDeviation,
  calculatePercentile,
  getTCriticalValue,
} from '../utils';

interface UseStatisticsParams {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  filteredChains: Blockchain[];
  selectedTimeRange: number;
  currentClient: BaseOracleClient;
  selectedBaseChain: Blockchain | null;
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
  dataIntegrity: Partial<Record<Blockchain, number>>;
  actualUpdateIntervals: Partial<Record<Blockchain, number>>;
  chainVolatility: Partial<Record<Blockchain, number>>;
  updateDelays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>>;
}

export function useStatistics(params: UseStatisticsParams): UseStatisticsReturn {
  const {
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedTimeRange,
    currentClient,
    selectedBaseChain,
  } = params;

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

  const chainVolatility = useMemo(() => {
    const volatility: Partial<Record<Blockchain, number>> = {};
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      if (prices.length < 2) {
        volatility[chain] = 0;
        return;
      }
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance =
        prices.length > 1
          ? prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / (prices.length - 1)
          : 0;
      const stdDev = Math.sqrt(variance);
      volatility[chain] = mean > 0 ? (stdDev / mean) * 100 : 0;
    });
    return volatility;
  }, [historicalPrices, filteredChains]);

  const updateDelays = useMemo(() => {
    if (filteredChains.length === 0) return {};
    const baseChain =
      selectedBaseChain && filteredChains.includes(selectedBaseChain)
        ? selectedBaseChain
        : filteredChains[0];
    const delays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>> = {};

    const basePrices = historicalPrices[baseChain] || [];
    if (basePrices.length === 0) return delays;

    const chainTimestampMaps: Partial<Record<Blockchain, Map<number, PriceData>>> = {};
    filteredChains.forEach((chain) => {
      chainTimestampMaps[chain] = new Map(
        (historicalPrices[chain] || []).map((p) => [p.timestamp, p])
      );
    });

    filteredChains.forEach((chain) => {
      if (chain === baseChain) {
        delays[chain] = { avgDelay: 0, maxDelay: 0 };
        return;
      }

      const chainPrices = historicalPrices[chain] || [];
      if (chainPrices.length === 0) return;

      const chainTimestamps = chainPrices.map((p) => p.timestamp).sort((a, b) => a - b);

      const matchedDelays: number[] = [];
      basePrices.forEach((basePrice) => {
        const baseTimestamp = basePrice.timestamp;

        let lo = 0;
        let hi = chainTimestamps.length - 1;
        let closestTs = chainTimestamps[0];
        let minDiff = Math.abs(closestTs - baseTimestamp);

        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const diff = Math.abs(chainTimestamps[mid] - baseTimestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestTs = chainTimestamps[mid];
          }
          if (chainTimestamps[mid] < baseTimestamp) {
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        matchedDelays.push(Math.abs(closestTs - baseTimestamp) / 1000);
      });

      if (matchedDelays.length > 0) {
        const avgDelay = matchedDelays.reduce((a, b) => a + b, 0) / matchedDelays.length;
        const maxDelay = safeMax(matchedDelays);
        delays[chain] = { avgDelay, maxDelay };
      }
    });

    return delays;
  }, [historicalPrices, filteredChains, selectedBaseChain]);

  const dataIntegrity = useMemo(() => {
    const integrity: Partial<Record<Blockchain, number>> = {};
    const defaultUpdateIntervalMinutes = currentClient.defaultUpdateIntervalMinutes;

    const calculateActualUpdateInterval = (prices: PriceData[]): number => {
      if (prices.length < 2) return defaultUpdateIntervalMinutes;

      const intervals: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const diffMs = prices[i].timestamp - prices[i - 1].timestamp;
        const diffMinutes = diffMs / (1000 * 60);
        if (diffMinutes > 0 && diffMinutes < defaultUpdateIntervalMinutes * 10) {
          intervals.push(diffMinutes);
        }
      }

      if (intervals.length === 0) return defaultUpdateIntervalMinutes;

      const sorted = intervals.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return median;
    };

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      const actualPoints = prices.length;

      const configuredInterval = currentClient.chainUpdateIntervals[chain];
      const actualInterval = calculateActualUpdateInterval(prices);
      const updateIntervalMinutes = configuredInterval ?? actualInterval;

      const expectedPointsPerHour = 60 / updateIntervalMinutes;
      const expectedPoints = expectedPointsPerHour * selectedTimeRange;

      const score = expectedPoints > 0 ? (actualPoints / expectedPoints) * 100 : 0;
      integrity[chain] = Math.min(score, 100);
    });

    return integrity;
  }, [historicalPrices, filteredChains, selectedTimeRange, currentClient]);

  const actualUpdateIntervals = useMemo(() => {
    const intervals: Partial<Record<Blockchain, number>> = {};
    const defaultInterval = currentClient.defaultUpdateIntervalMinutes;

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) {
        intervals[chain] = currentClient.chainUpdateIntervals[chain] ?? defaultInterval;
        return;
      }

      const intervalDiffs: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const diffMs = prices[i].timestamp - prices[i - 1].timestamp;
        const diffMinutes = diffMs / (1000 * 60);
        if (diffMinutes > 0) {
          intervalDiffs.push(diffMinutes);
        }
      }

      if (intervalDiffs.length === 0) {
        intervals[chain] = currentClient.chainUpdateIntervals[chain] ?? defaultInterval;
        return;
      }

      const avgInterval = intervalDiffs.reduce((a, b) => a + b, 0) / intervalDiffs.length;
      intervals[chain] = Math.round(avgInterval * 100) / 100;
    });

    return intervals;
  }, [historicalPrices, filteredChains, currentClient]);

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
    dataIntegrity,
    actualUpdateIntervals,
    chainVolatility,
    updateDelays,
  };
}
