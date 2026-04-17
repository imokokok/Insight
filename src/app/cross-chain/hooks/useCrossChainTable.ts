import { useMemo } from 'react';

import { type Blockchain, type PriceData } from '@/lib/oracles';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

import { chainNames, calculateDynamicThreshold, type ThresholdConfig } from '../utils';

import { type PriceDifferenceItem } from './useExport';

export interface UseCrossChainTableParams {
  priceDifferences: PriceDifferenceItem[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  filteredChains: Blockchain[];
  selectedBaseChain: Blockchain | null;
  thresholdConfig: ThresholdConfig;
}

export interface UseCrossChainTableReturn {
  priceDifferences: PriceDifferenceItem[];
  sortedPriceDifferences: PriceDifferenceItem[];
  chainsWithHighDeviation: PriceDifferenceItem[];
  filteredChains: Blockchain[];
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
  dynamicThreshold: number;
}

export function useCrossChainTable(params: UseCrossChainTableParams): UseCrossChainTableReturn {
  const { priceDifferences, historicalPrices, filteredChains, selectedBaseChain, thresholdConfig } =
    params;

  const { tableFilter, sortColumn, sortDirection, toggleChain, handleSort } =
    useCrossChainUIStore();

  const dynamicThreshold = useMemo(() => {
    const allHistoricalPrices: number[] = [];
    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      allHistoricalPrices.push(...prices);
    });
    return calculateDynamicThreshold(allHistoricalPrices, thresholdConfig);
  }, [historicalPrices, filteredChains, thresholdConfig]);

  const sortedPriceDifferences = useMemo(() => {
    let filtered = [...priceDifferences];

    if (tableFilter === 'abnormal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) > dynamicThreshold);
    } else if (tableFilter === 'normal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) <= dynamicThreshold);
    }

    const baseChainItem = filtered.find((item) => item.chain === selectedBaseChain);
    const otherItems = filtered.filter((item) => item.chain !== selectedBaseChain);

    otherItems.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'chain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'diff':
          comparison = a.diff - b.diff;
          break;
        case 'diffPercent':
          comparison = a.diffPercent - b.diffPercent;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return baseChainItem ? [baseChainItem, ...otherItems] : otherItems;
  }, [
    priceDifferences,
    sortColumn,
    sortDirection,
    selectedBaseChain,
    tableFilter,
    dynamicThreshold,
  ]);

  const chainsWithHighDeviation = useMemo(() => {
    return priceDifferences.filter((item) => Math.abs(item.diffPercent) > dynamicThreshold);
  }, [priceDifferences, dynamicThreshold]);

  return {
    priceDifferences,
    sortedPriceDifferences,
    chainsWithHighDeviation,
    filteredChains,
    toggleChain,
    handleSort,
    dynamicThreshold,
  };
}
