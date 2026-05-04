'use client';

import { useMemo } from 'react';

import { getDefaultFactory } from '@/lib/oracles';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain } from '@/types/oracle';

export function useCurrentClient() {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  return useMemo(() => getDefaultFactory().getClient(selectedProvider), [selectedProvider]);
}

export function useSupportedChains(): Blockchain[] {
  const currentClient = useCurrentClient();
  return useMemo(() => [...currentClient.supportedChains], [currentClient]);
}

export function useFilteredChains(): Blockchain[] {
  const supportedChains = useSupportedChains();
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  return useMemo(
    () => supportedChains.filter((chain) => visibleChains.includes(chain)),
    [supportedChains, visibleChains]
  );
}

export function useChainsWithHighDeviation() {
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const filteredChains = useFilteredChains();
  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

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

  const dynamicThreshold = useMemo(() => {
    return thresholdConfig.fixedThreshold;
  }, [thresholdConfig]);

  return useMemo(
    () => priceDifferences.filter((item) => Math.abs(item.diffPercent) > dynamicThreshold),
    [priceDifferences, dynamicThreshold]
  );
}
