import { useCallback, useMemo, useRef, useState } from 'react';

import { type FavoriteConfig, useFavorites } from '@/hooks';
import { type OracleProvider, type Blockchain } from '@/lib/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useUser } from '@/stores/authStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

import { useExport, type PriceDifferenceItem, type UseExportParams } from './useExport';

export interface UseCrossChainExportParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedBaseChain: Blockchain | null;
  priceDifferences: PriceDifferenceItem[];
  historicalPrices: Partial<Record<Blockchain, import('@/lib/oracles').PriceData[]>>;
  filteredChains: Blockchain[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
  totalDataPoints: number;
  visibleChains: Blockchain[];
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export interface UseCrossChainExportReturn {
  exportToCSV: () => boolean;
  exportToJSON: () => boolean;
  user: ReturnType<typeof useUser>;
  chainFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export function useCrossChainExport(params: UseCrossChainExportParams): UseCrossChainExportReturn {
  const user = useUser();
  const { favorites: chainFavorites } = useFavorites({ configType: 'chain_config' });
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const { setSelectedProvider, setSelectedSymbol } = useCrossChainSelectorStore();
  const { setVisibleChains } = useCrossChainUIStore();

  const {
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences,
    historicalPrices,
    filteredChains,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviationPercent,
    totalDataPoints,
    visibleChains,
    clearCache,
    clearCacheForProvider,
  } = params;

  const exportHook = useExport({
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences,
    historicalPrices,
    filteredChains,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviationPercent,
    totalDataPoints,
  });

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      chain: selectedProvider,
      symbol: selectedSymbol,
      chains: visibleChains.map((c) => c as string),
    }),
    [selectedProvider, selectedSymbol, visibleChains]
  );

  const handleApplyFavorite = useCallback(
    (config: FavoriteConfig) => {
      if (config.chain) setSelectedProvider(config.chain as OracleProvider);
      if (config.symbol) setSelectedSymbol(config.symbol);
      if (config.chains) setVisibleChains(config.chains.filter(isBlockchain));
      setShowFavoritesDropdown(false);
    },
    [setSelectedProvider, setSelectedSymbol, setVisibleChains]
  );

  return {
    exportToCSV: exportHook.exportToCSV,
    exportToJSON: exportHook.exportToJSON,
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    clearCache,
    clearCacheForProvider,
  };
}
