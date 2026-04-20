/**
 * @fileoverview Chart data Hook
 * Provides chart data calculation functionality
 */

import { useMemo } from 'react';

import { safeMax } from '@/lib/utils/statistics';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { type HeatmapData, type IqrOutliers } from '../constants';
import {
  chainNames,
  calculatePercentile,
  defaultThresholdConfig,
  type ThresholdConfig,
} from '../utils';

export interface UseChartDataParams {
  currentPrices: PriceData[];
  filteredChains: Blockchain[];
  selectedBaseChain: Blockchain | null;
  validPrices: number[];
  avgPrice: number;
  standardDeviation: number;
  medianPrice: number;
  thresholdConfig?: ThresholdConfig;
}

export interface UseChartDataReturn {
  priceDifferences: {
    chain: Blockchain;
    price: number;
    diff: number;
    diffPercent: number;
  }[];
  heatmapData: HeatmapData[];
  maxHeatmapValue: number;
  iqrOutliers: IqrOutliers;
}

export function useChartData(params: UseChartDataParams): UseChartDataReturn {
  const {
    currentPrices,
    filteredChains,
    selectedBaseChain,
    validPrices,
    avgPrice,
    thresholdConfig: thresholdConfigParam,
  } = params;

  const thresholdConfig = thresholdConfigParam ?? defaultThresholdConfig;

  const priceDifferences = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2 || !selectedBaseChain) return [];
    const basePriceData = filteredPrices.find((p) => p.chain === selectedBaseChain);
    if (!basePriceData) return [];
    const basePrice = basePriceData.price;
    return filteredPrices.map((priceData) => {
      const diff = priceData.price - basePrice;
      const diffPercent = basePrice > 0 && priceData.price > 0 ? (diff / basePrice) * 100 : 0;
      return {
        chain: priceData.chain!,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const heatmapData = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2) return [];
    const data: HeatmapData[] = [];

    filteredChains.forEach((xChain) => {
      filteredChains.forEach((yChain) => {
        const xPrice = filteredPrices.find((p) => p.chain === xChain)?.price || 0;
        const yPrice = filteredPrices.find((p) => p.chain === yChain)?.price || 0;
        const diff = Math.abs(xPrice - yPrice);
        const percent = xPrice > 0 && yPrice > 0 ? (diff / xPrice) * 100 : 0;

        data.push({
          x: chainNames[xChain],
          y: chainNames[yChain],
          value: diff,
          percent,
          xChain,
          yChain,
        });
      });
    });

    return data;
  }, [currentPrices, filteredChains]);

  const maxHeatmapValue = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    return safeMax(heatmapData.map((d) => d.percent));
  }, [heatmapData]);

  const iqrOutliers = useMemo((): IqrOutliers => {
    if (validPrices.length < 4) {
      return { outliers: [], q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };
    }

    const multiplier =
      thresholdConfig.outlierDetectionMethod === 'iqr' ? thresholdConfig.outlierThreshold : 1.5;

    const sorted = [...validPrices].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const outliers: {
      chain: Blockchain;
      price: number;
      deviationPercent: number;
      boundType: 'lower' | 'upper';
      expectedRange: string;
    }[] = [];

    currentPrices.forEach((priceData) => {
      if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;
      if (priceData.price < lowerBound || priceData.price > upperBound) {
        const boundType = priceData.price < lowerBound ? 'lower' : 'upper';
        const boundValue = boundType === 'lower' ? lowerBound : upperBound;
        const deviationPercent = Math.abs((priceData.price - boundValue) / boundValue) * 100;

        outliers.push({
          chain: priceData.chain,
          price: priceData.price,
          deviationPercent,
          boundType,
          expectedRange: `$${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}`,
        });
      }
    });

    return { outliers, q1, q3, iqr, lowerBound, upperBound };
  }, [validPrices, currentPrices, filteredChains, thresholdConfig]);

  return {
    priceDifferences,
    heatmapData,
    maxHeatmapValue,
    iqrOutliers,
  };
}
