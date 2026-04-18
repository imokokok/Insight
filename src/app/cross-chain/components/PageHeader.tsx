'use client';

import { Download, RefreshCw, Eye } from 'lucide-react';

import { FavoriteButton } from '@/components/favorites';
import { LiveStatusBar } from '@/components/ui';
import { useColorblindMode, useSetColorblindMode } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

import { useCrossChainExportActions } from '../hooks/useCrossChainExport';

import { FavoritesDropdown } from './FavoritesDropdown';

export function PageHeader() {
  const colorblindMode = useColorblindMode();
  const setColorblindMode = useSetColorblindMode();

  const selectedSymbol = useCrossChainSelectorStore((s) => s.selectedSymbol);
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  const loading = useCrossChainDataStore((s) => s.loading);
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const refreshStatus = useCrossChainDataStore((s) => s.refreshStatus);
  const showRefreshSuccess = useCrossChainDataStore((s) => s.showRefreshSuccess);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const fetchData = useCrossChainDataStore((s) => s.fetchData);

  const {
    exportToCSV,
    exportToJSON,
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
  } = useCrossChainExportActions();

  return (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cross-Chain Price Comparison</h1>
          <p className="text-sm mt-1 text-gray-500">Compare prices across multiple oracles</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <FavoriteButton
              configType="chain_config"
              configData={currentFavoriteConfig}
              name={`${selectedSymbol} - ${selectedProvider} (${visibleChains.length} chains)`}
              variant="button"
              showLabel
            />
          )}

          {user && chainFavorites && chainFavorites.length > 0 && (
            <FavoritesDropdown
              chainFavorites={chainFavorites.filter((f): f is typeof f & { id: string } => !!f.id)}
              showFavoritesDropdown={showFavoritesDropdown}
              onToggleDropdown={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
              onApplyFavorite={handleApplyFavorite}
              dropdownRef={favoritesDropdownRef}
            />
          )}

          <button
            onClick={() => setColorblindMode(!colorblindMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
              colorblindMode
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
            title={colorblindMode ? 'Colorblind mode on' : 'Switch to colorblind mode'}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Colorblind Friendly</span>
            {colorblindMode && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={exportToCSV}
              disabled={loading || currentPrices.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={exportToJSON}
              disabled={loading || currentPrices.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
          </div>

          <button
            onClick={() => fetchData?.()}
            disabled={refreshStatus === 'refreshing'}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm text-white disabled:opacity-50 rounded-md transition-all duration-200 ${
              refreshStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : refreshStatus === 'success' && showRefreshSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshStatus === 'refreshing' ? 'animate-spin' : ''}`}
            />
            {refreshStatus === 'refreshing'
              ? 'Loading...'
              : showRefreshSuccess
                ? 'Refreshed!'
                : 'Refresh'}
          </button>
        </div>
      </div>

      <LiveStatusBar
        isConnected={!loading}
        lastUpdate={lastUpdated || undefined}
        isReconnecting={refreshStatus === 'refreshing'}
      />
    </div>
  );
}
