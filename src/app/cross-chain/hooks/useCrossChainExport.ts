import { useMemo } from 'react';

import { calculatePriceStats, extractValidPrices } from '@/lib/utils/statistics';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

import { type PriceDifferenceItem } from '../types';

import { useExport } from './useExport';

export function useCrossChainExportActions() {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);

  const filteredChains = useMemo(() => visibleChains, [visibleChains]);

  const { priceDifferences, statsForExport } = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));

    let diffs: PriceDifferenceItem[] = [];
    if (filteredPrices.length >= 2 && selectedBaseChain) {
      const basePriceData = filteredPrices.find((p) => p.chain === selectedBaseChain);
      if (basePriceData) {
        const basePrice = basePriceData.price;
        diffs = filteredPrices.map((priceData) => {
          const diff = priceData.price - basePrice;
          const diffPercent = basePrice > 0 && priceData.price > 0 ? (diff / basePrice) * 100 : 0;
          return {
            chain: priceData.chain!,
            price: priceData.price,
            diff,
            diffPercent,
          };
        });
      }
    }

    const stats = calculatePriceStats(extractValidPrices(filteredPrices));

    return {
      priceDifferences: diffs,
      statsForExport: stats,
    };
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const exportHook = useExport({
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences,
    filteredChains,
    ...statsForExport,
  });

  return {
    exportToCSV: exportHook.exportToCSV,
    exportToJSON: exportHook.exportToJSON,
  };
}
