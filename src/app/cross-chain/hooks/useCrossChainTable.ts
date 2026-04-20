import { useMemo } from 'react';

import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain } from '@/types/oracle';

import { type PriceDifferenceItem } from '../types';
import { chainNames, defaultThresholdConfig, type ThresholdConfig } from '../utils';

interface UseCrossChainTableParams {
  priceDifferences: PriceDifferenceItem[];
  filteredChains: Blockchain[];
  selectedBaseChain: Blockchain | null;
  thresholdConfig?: ThresholdConfig;
}

interface UseCrossChainTableReturn {
  priceDifferences: PriceDifferenceItem[];
  sortedPriceDifferences: PriceDifferenceItem[];
  chainsWithHighDeviation: PriceDifferenceItem[];
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
  dynamicThreshold: number;
}

export function useCrossChainTable(params: UseCrossChainTableParams): UseCrossChainTableReturn {
  const {
    priceDifferences,
    filteredChains,
    selectedBaseChain,
    thresholdConfig: thresholdConfigParam,
  } = params;

  const thresholdConfig = thresholdConfigParam ?? defaultThresholdConfig;

  const { tableFilter, sortColumn, sortDirection, toggleChain, handleSort } =
    useCrossChainUIStore();

  const dynamicThreshold = useMemo(() => {
    return thresholdConfig.fixedThreshold;
  }, [thresholdConfig]);

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
          comparison =
            chainNames[a.chain] < chainNames[b.chain]
              ? -1
              : chainNames[a.chain] > chainNames[b.chain]
                ? 1
                : 0;
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
    toggleChain,
    handleSort,
    dynamicThreshold,
  };
}
