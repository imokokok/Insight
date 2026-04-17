'use client';

import { Download, FileJson, FileSpreadsheet, Star, ChevronDown } from 'lucide-react';

import type { FavoriteConfig } from '@/hooks';
import type { OracleProvider, Blockchain } from '@/lib/oracles';
import type { UserFavorite } from '@/lib/supabase/queries';

interface QueryHeaderProps {
  loading: boolean;
  queryResultsLength: number;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onOpenExportConfig: () => void;
  selectedOracle: OracleProvider | null;
  selectedChain: Blockchain | null;
  selectedSymbol: string;
  selectedTimeRange: number;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  setSelectedChain: (chain: Blockchain | null) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (timeRange: number) => void;
  symbolFavorites: UserFavorite[];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;
}

export function QueryHeader({
  loading,
  queryResultsLength,
  onExportCSV,
  onExportJSON,
  onOpenExportConfig,
  selectedOracle,
  selectedChain,
  selectedSymbol: _selectedSymbol,
  selectedTimeRange: _selectedTimeRange,
  setSelectedOracle: _setSelectedOracle,
  setSelectedChain: _setSelectedChain,
  setSelectedSymbol: _setSelectedSymbol,
  setSelectedTimeRange: _setSelectedTimeRange,
  symbolFavorites,
  currentFavoriteConfig,
  showFavoritesDropdown,
  setShowFavoritesDropdown,
  favoritesDropdownRef,
  handleApplyFavorite,
}: QueryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{'priceQuery.title'}</h1>
        <p className="text-sm text-gray-500 mt-1">{'priceQuery.description'}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* 收藏夹下拉菜单 */}
        <div className="relative" ref={favoritesDropdownRef}>
          <button
            onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Star className="w-4 h-4" />
            <span>{'priceQuery.favorites.title'}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showFavoritesDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">{'priceQuery.favorites.title'}</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {symbolFavorites.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    {'priceQuery.favorites.empty'}
                  </div>
                ) : (
                  symbolFavorites.map((favorite) => {
                    const config = favorite.config_data as { symbol?: string };
                    const symbol = config.symbol || '';
                    return (
                      <button
                        key={favorite.id}
                        onClick={() =>
                          handleApplyFavorite({
                            symbol,
                            selectedOracles: selectedOracle ? [selectedOracle] : [],
                            chains: selectedChain ? [selectedChain] : [],
                          })
                        }
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

        {/* 导出按钮组 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onExportCSV}
            disabled={queryResultsLength === 0 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={'priceQuery.export.csv'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">{'crossOracle.exportFormats.csv'}</span>
          </button>
          <button
            onClick={onExportJSON}
            disabled={queryResultsLength === 0 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border-t border-b border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={'priceQuery.export.json'}
          >
            <FileJson className="w-4 h-4" />
            <span className="hidden sm:inline">{'crossOracle.exportFormats.json'}</span>
          </button>
          <button
            onClick={onOpenExportConfig}
            disabled={queryResultsLength === 0 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={'priceQuery.export.advanced'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
