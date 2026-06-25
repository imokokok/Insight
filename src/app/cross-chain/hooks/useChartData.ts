/**
 * @fileoverview Chart data Hook
 * Provides chart data calculation functionality
 */

import { useMemo } from 'react';

import { safeMax } from '@/lib/utils/statistics';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { type HeatmapData } from '../constants';
import { chainNames } from '../utils';

interface UseChartDataParams {
  currentPrices: PriceData[];
  filteredChains: Blockchain[];
  selectedBaseChain: Blockchain | null;
}

interface UseChartDataReturn {
  priceDifferences: {
    chain: Blockchain;
    price: number;
    diff: number;
    diffPercent: number;
  }[];
  heatmapData: HeatmapData[];
  maxHeatmapValue: number;
}

export function useChartData(params: UseChartDataParams): UseChartDataReturn {
  const { currentPrices, filteredChains, selectedBaseChain } = params;

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

  return {
    priceDifferences,
    heatmapData,
    maxHeatmapValue,
  };
}
