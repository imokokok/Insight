'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PairSelector } from './PairSelector';
import { FilterPanel } from './FilterPanel';
import { FavoriteButton } from '@/components/favorites';
import { OracleProvider } from '@/types/oracle';
import { symbols, oracleNames } from '../constants';
import { TimeRange, DeviationFilter } from '../constants';
import { FavoriteConfig } from '@/hooks/useFavorites';

interface HeaderSectionProps {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedOracles: OracleProvider[];
  isLoading: boolean;
  lastUpdated: Date | null;
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (open: boolean) => void;
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  deviationFilter: DeviationFilter;
  setDeviationFilter: (filter: DeviationFilter) => void;
  oracleFilter: OracleProvider | 'all';
  setOracleFilter: (filter: OracleProvider | 'all') => void;
  activeFilterCount: number;
  useAccessibleColors: boolean;
  setUseAccessibleColors: (value: boolean) => void;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  user: ReturnType<typeof import('@/stores/authStore').useUser>;
  oracleFavorites: ReturnType<typeof import('@/hooks/useFavorites').useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
  handleApplyFavorite: (config: FavoriteConfig) => void;
  fetchPriceData: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function HeaderSection({
  selectedSymbol,
  setSelectedSymbol,
  selectedOracles,
  isLoading,
  lastUpdated,
  isFilterPanelOpen,
  setIsFilterPanelOpen,
  filterPanelRef,
  timeRange,
  setTimeRange,
  deviationFilter,
  setDeviationFilter,
  oracleFilter,
  setOracleFilter,
  activeFilterCount,
  useAccessibleColors,
  setUseAccessibleColors,
  showFavoritesDropdown,
  setShowFavoritesDropdown,
  favoritesDropdownRef,
  user,
  oracleFavorites,
  currentFavoriteConfig,
  handleClearFilters,
  getFilterSummary,
  handleApplyFavorite,
  fetchPriceData,
  t,
}: HeaderSectionProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="hidden sm:block">
          <PairSelector
            selectedSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
            symbols={symbols}
            isLoading={isLoading}
            t={t}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
        <div className="relative" ref={filterPanelRef}>
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors ${
              isFilterPanelOpen || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>{t('crossOracle.filter.button')}</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium bg-blue-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`}
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
          <FilterPanel
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            deviationFilter={deviationFilter}
            onDeviationFilterChange={setDeviationFilter}
            oracleFilter={oracleFilter}
            onOracleFilterChange={setOracleFilter}
            activeFilterCount={activeFilterCount}
            onClearFilters={handleClearFilters}
            getFilterSummary={getFilterSummary}
            t={t}
          />
        </div>

        <button
          onClick={() => setUseAccessibleColors(!useAccessibleColors)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm border transition-colors ${
            useAccessibleColors
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          title={
            useAccessibleColors
              ? t('crossOracle.accessibility.standardColors')
              : t('crossOracle.accessibility.colorBlindMode')
          }
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="hidden sm:inline">
            {useAccessibleColors
              ? t('crossOracle.accessibility.standardMode')
              : t('crossOracle.accessibility.colorBlindMode')}
          </span>
        </button>

        <button
          onClick={fetchPriceData}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          {isLoading ? t('status.loading') : t('actions.refresh')}
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

        {user && oracleFavorites && oracleFavorites.length > 0 && (
          <div className="relative" ref={favoritesDropdownRef}>
            <button
              onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors"
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
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 z-50 max-h-96 overflow-y-auto">
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
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
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
                              className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {oracle}
                            </span>
                          ))}
                          {(config.selectedOracles?.length || 0) > 2 && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200">
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
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('crossOracle.favorites.viewAll')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {lastUpdated && (
          <span className="text-xs text-gray-400">
            {t('crossOracle.updated')} {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
