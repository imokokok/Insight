'use client';

import { useRouter } from 'next/navigation';

import { Download, RefreshCw, Eye } from 'lucide-react';

import { FavoriteButton } from '@/components/favorites';
import { LiveStatusBar } from '@/components/ui';
import type { FavoriteConfig } from '@/hooks';
import { useTranslations } from '@/i18n';
import { useColorblindMode, useSetColorblindMode } from '@/stores/crossChainConfigStore';

import { type useCrossChainData } from '../useCrossChainData';

interface PageHeaderProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function PageHeader({ data }: PageHeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const colorblindMode = useColorblindMode();
  const setColorblindMode = useSetColorblindMode();

  const {
    user,
    chainFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    selectedSymbol,
    selectedProvider,
    visibleChains,
    loading,
    currentPrices,
    exportToCSV,
    exportToJSON,
    refreshStatus,
    showRefreshSuccess,
    fetchData,
    lastUpdated,
  } = data;

  return (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossChain.title')}</h1>
          <p className="text-sm mt-1 text-gray-500">{t('crossOracle.subtitle')}</p>
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
            <div className="relative" ref={favoritesDropdownRef}>
              <button
                onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 bg-white hover:bg-gray-50 transition-colors rounded-md"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span>{t('crossOracle.favorites.button')}</span>
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  {chainFavorites.length}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showFavoritesDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showFavoritesDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 z-50 max-h-96 overflow-y-auto rounded-lg shadow-lg">
                  <div className="p-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('crossOracle.favorites.quickAccess')}
                    </h3>
                  </div>
                  <div className="p-1">
                    {chainFavorites.map((favorite) => {
                      const config = favorite.config_data as FavoriteConfig;
                      return (
                        <button
                          key={favorite.id}
                          onClick={() => handleApplyFavorite(config)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {favorite.name}
                            </span>
                            <span className="text-xs text-gray-500">{config.symbol}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.chains?.slice(0, 3).map((chain) => (
                              <span
                                key={chain}
                                className="px-1.5 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-100 rounded"
                              >
                                {chain}
                              </span>
                            ))}
                            {(config.chains?.length || 0) > 3 && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded">
                                +{(config.chains?.length || 0) - 3}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowFavoritesDropdown(false);
                        router.push('/favorites');
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('crossOracle.favorites.viewAll')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setColorblindMode(!colorblindMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
              colorblindMode
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
            title={
              colorblindMode
                ? t('crossChain.colorblindModeOn')
                : t('crossChain.switchToColorblindMode')
            }
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">{t('crossChain.colorblindFriendly')}</span>
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
            onClick={fetchData}
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
              ? t('status.loading')
              : showRefreshSuccess
                ? t('crossChain.refreshSuccess')
                : t('actions.refresh')}
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
