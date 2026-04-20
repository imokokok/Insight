'use client';

import { Star, ChevronDown } from 'lucide-react';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import type { OracleProvider, Blockchain } from '@/types/oracle';

import { useQueryParams, useQueryData, useQueryUI } from '../contexts';

import UnifiedExportSection from './UnifiedExportSection';

export function QueryHeader() {
  const params = useQueryParams();
  const queryData = useQueryData();
  const ui = useQueryUI();
  const { favorites: symbolFavorites } = useFavorites({ configType: 'symbol' });

  const {
    selectedOracle,
    setSelectedOracle,
    selectedChain,
    setSelectedChain,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
  } = params;

  const { queryResults, isLoading: loading } = queryData;

  const { avgPrice, maxPrice, minPrice, priceRange, standardDeviation, standardDeviationPercent } =
    queryData.stats;

  const { showFavoritesDropdown, setShowFavoritesDropdown, favoritesDropdownRef } = ui;

  const handleApplyFavorite = (config: FavoriteConfig) => {
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    if (config.selectedOracles && config.selectedOracles.length > 0) {
      setSelectedOracle(config.selectedOracles[0] as OracleProvider);
    } else {
      setSelectedOracle(null);
    }
    if (config.chains && config.chains.length > 0) {
      setSelectedChain(config.chains[0] as Blockchain);
    } else {
      setSelectedChain(null);
    }
    if (config.timeRange !== undefined) {
      params.setSelectedTimeRange(config.timeRange);
    }
    setShowFavoritesDropdown(false);
  };

  const currentFavoriteConfig: FavoriteConfig = {
    symbol: selectedSymbol,
    selectedOracles: selectedOracle ? [selectedOracle as string] : [],
    chains: selectedChain ? [selectedChain as string] : [],
    timeRange: selectedTimeRange,
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price Query</h1>
        <p className="text-sm text-gray-500 mt-1">Query oracle prices across multiple chains</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={favoritesDropdownRef}>
          <button
            onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Star className="w-4 h-4" />
            <span>Favorites</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showFavoritesDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Favorites</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {symbolFavorites.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    No favorites saved yet
                  </div>
                ) : (
                  symbolFavorites.map((favorite) => {
                    const config = favorite.config_data as FavoriteConfig;
                    const symbol = config.symbol || '';
                    return (
                      <button
                        key={favorite.id}
                        onClick={() => handleApplyFavorite(config)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>{symbol}</span>
                        {currentFavoriteConfig.symbol === symbol && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <UnifiedExportSection
          loading={loading}
          queryResults={queryResults}
          selectedSymbol={selectedSymbol}
          avgPrice={avgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviation={standardDeviation}
          standardDeviationPercent={standardDeviationPercent}
        />
      </div>
    </div>
  );
}
