import { useCallback, useMemo, useRef, useState } from 'react';

import { type FavoriteConfig, useFavorites } from '@/hooks';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useUser } from '@/stores/authStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type OracleProvider } from '@/types/oracle';

import { type PriceDifferenceItem } from '../types';

import { useExport } from './useExport';

function useFavoriteActions() {
  const { setSelectedProvider, setSelectedSymbol } = useCrossChainSelectorStore();
  const { setVisibleChains } = useCrossChainUIStore();

  const handleApplyFavorite = useCallback(
    (config: FavoriteConfig, onClose: () => void) => {
      if (config.chain) setSelectedProvider(config.chain as OracleProvider);
      if (config.symbol) setSelectedSymbol(config.symbol);
      if (config.chains) setVisibleChains(config.chains.filter(isBlockchain));
      onClose();
    },
    [setSelectedProvider, setSelectedSymbol, setVisibleChains]
  );

  return { handleApplyFavorite };
}

export function useCrossChainExportActions() {
  const user = useUser();
  const { favorites: chainFavorites } = useFavorites({ configType: 'chain_config' });
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const storeClearCache = useCrossChainDataStore((s) => s.clearCache);
  const storeClearCacheForProvider = useCrossChainDataStore((s) => s.clearCacheForProvider);

  const { handleApplyFavorite } = useFavoriteActions();

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

    const validPrices = filteredPrices.map((d) => d.price).filter((p) => p > 0);
    const avgPrice =
      validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const variance =
      validPrices.length > 1
        ? validPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
          (validPrices.length - 1)
        : 0;
    const stdDev = Math.sqrt(variance);
    const standardDeviationPercent = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;

    return {
      priceDifferences: diffs,
      statsForExport: {
        avgPrice,
        maxPrice,
        minPrice,
        priceRange: maxPrice - minPrice,
        standardDeviationPercent,
      },
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

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      chain: selectedProvider,
      symbol: selectedSymbol,
      chains: visibleChains.map((c) => c as string),
    }),
    [selectedProvider, selectedSymbol, visibleChains]
  );

  const onApplyFavorite = useCallback(
    (config: FavoriteConfig) => {
      handleApplyFavorite(config, () => setShowFavoritesDropdown(false));
    },
    [handleApplyFavorite]
  );

  const clearCache = storeClearCache;
  const clearCacheForProvider = storeClearCacheForProvider;

  return {
    exportToCSV: exportHook.exportToCSV,
    exportToJSON: exportHook.exportToJSON,
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite: onApplyFavorite,
    clearCache,
    clearCacheForProvider,
  };
}
