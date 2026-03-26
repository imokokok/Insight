'use client';

import { useRouter } from 'next/navigation';

import { FavoriteButton } from '@/components/favorites';
import { type FavoriteConfig } from '@/hooks';
import { type OracleProvider } from '@/types/oracle';

import { oracleNames } from '../constants';

interface HeaderSectionProps {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  isLoading: boolean;
  lastUpdated: Date | null;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  user: ReturnType<typeof import('@/stores/authStore').useUser>;
  oracleFavorites: ReturnType<typeof import('@/hooks/useFavorites').useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  handleApplyFavorite: (config: FavoriteConfig) => void;
  fetchPriceData: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function HeaderSection({
  selectedSymbol,
  selectedOracles,
  isLoading,
  lastUpdated,
  showFavoritesDropdown,
  setShowFavoritesDropdown,
  favoritesDropdownRef,
  user,
  oracleFavorites,
  currentFavoriteConfig,
  handleApplyFavorite,
  fetchPriceData,
  t,
}: HeaderSectionProps) {
  const router = useRouter();

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3">
        {/* Title row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {/* 更新时间 */}
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                {t('crossOracle.updated')} {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPriceData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {isLoading ? t('status.loading') : t('actions.refresh')}
                </span>
              </button>

              {user && (
                <FavoriteButton
                  configType="oracle_config"
                  configData={currentFavoriteConfig}
                  name={`${selectedSymbol} - ${selectedOracles.map((o) => oracleNames[o]).join(', ')}`}
                  variant="button"
                  showLabel
                />
              )}
            </div>
          </div>
        </div>

        {/* Favorites row - only show when user has favorites */}
        {user && oracleFavorites && oracleFavorites.length > 0 && (
          <div className="flex items-center">
            <div className="relative" ref={favoritesDropdownRef}>
              <button
                onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors"
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
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {oracleFavorites.length}
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
                <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('crossOracle.favorites.quickAccess')}
                    </h3>
                  </div>
                  <div className="p-1">
                    {oracleFavorites.map((favorite) => {
                      const config = favorite.config_data as typeof currentFavoriteConfig;
                      return (
                        <button
                          key={favorite.id}
                          onClick={() => handleApplyFavorite(config)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {favorite.name}
                            </span>
                            <span className="text-xs text-gray-500">{config.symbol}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.selectedOracles?.slice(0, 2).map((oracle) => (
                              <span
                                key={oracle}
                                className="px-1.5 py-0.5 text-xs bg-primary-50 text-primary-700 border border-primary-100 rounded"
                              >
                                {oracle}
                              </span>
                            ))}
                            {(config.selectedOracles?.length || 0) > 2 && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded">
                                +{(config.selectedOracles?.length || 0) - 2}
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
                      className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {t('crossOracle.favorites.viewAll')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
