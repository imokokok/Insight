import { useCallback, useMemo, useRef, useState } from 'react';

import { type FavoriteConfig, useFavorites } from '@/hooks';
import { getDefaultFactory } from '@/lib/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { useUser } from '@/stores/authStore';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { useChartData } from './useChartData';
import { useExport, type PriceDifferenceItem } from './useExport';
import { useStatistics } from './useStatistics';

interface UseCrossChainExportParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedBaseChain: Blockchain | null;
  priceDifferences: PriceDifferenceItem[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
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

interface UseCrossChainExportReturn {
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

export function useCrossChainExportActions(): UseCrossChainExportReturn {
  const user = useUser();
  const { favorites: chainFavorites } = useFavorites({ configType: 'chain_config' });
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const setSelectedProvider = useCrossChainSelectorStore((s) => s.setSelectedProvider);
  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useCrossChainSelectorStore((s) => s.setSelectedSymbol);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  const setVisibleChains = useCrossChainUIStore((s) => s.setVisibleChains);
  const showMA = useCrossChainUIStore((s) => s.showMA);
  const maPeriod = useCrossChainUIStore((s) => s.maPeriod);
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const historicalPrices = useCrossChainDataStore((s) => s.historicalPrices);
  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);
  const storeClearCache = useCrossChainDataStore((s) => s.clearCache);
  const storeClearCacheForProvider = useCrossChainDataStore((s) => s.clearCacheForProvider);

  const supportedChains = useSupportedChainsForExport();
  const filteredChains = useMemo(
    () => supportedChains.filter((chain) => visibleChains.includes(chain)),
    [supportedChains, visibleChains]
  );

  const currentClient = useCurrentClientForExport();

  const statistics = useStatistics({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedTimeRange,
    currentClient,
    selectedBaseChain,
  });

  const chart = useChartData({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedBaseChain,
    selectedTimeRange,
    showMA,
    maPeriod,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
    thresholdConfig,
  });

  const clearCache = storeClearCache ?? (() => {});
  const clearCacheForProvider =
    storeClearCacheForProvider ?? ((() => {}) as (p: OracleProvider) => void);

  const exportHook = useExport({
    selectedProvider,
    selectedSymbol,
    selectedBaseChain,
    priceDifferences: chart.priceDifferences,
    historicalPrices,
    filteredChains,
    avgPrice: statistics.avgPrice,
    maxPrice: statistics.maxPrice,
    minPrice: statistics.minPrice,
    priceRange: statistics.priceRange,
    standardDeviationPercent: statistics.standardDeviationPercent,
    totalDataPoints: chart.totalDataPoints,
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

function useCurrentClientForExport() {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  return useMemo(() => getDefaultFactory().getClient(selectedProvider), [selectedProvider]);
}

function useSupportedChainsForExport(): Blockchain[] {
  const currentClient = useCurrentClientForExport();
  return currentClient.supportedChains;
}
