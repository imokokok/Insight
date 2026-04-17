'use client';

import { useState, useMemo } from 'react';

import { useFavorites, useRemoveFavorite, type FavoriteConfig, mapConfigTypeFromDB } from '@/hooks';
import type { ConfigType } from '@/lib/supabase/database.types';
import type { UserFavorite } from '@/lib/supabase/queries';
import { useUser } from '@/stores/authStore';

import { FavoriteCard } from './FavoriteCard';

interface FavoritesManagerProps {
  onApply?: (config: FavoriteConfig, configType: ConfigType) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showGroupByType?: boolean;
  className?: string;
}

export function FavoritesManager({
  onApply,
  showSearch = true,
  showFilters = true,
  showGroupByType = true,
  className = '',
}: FavoritesManagerProps) {
  const user = useUser();
  const { favorites, isLoading, error } = useFavorites();
  const { removeFavorite } = useRemoveFavorite();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ConfigType | 'all'>('all');
  const [_editingFavorite, setEditingFavorite] = useState<UserFavorite | null>(null);

  const filteredFavorites = useMemo(() => {
    let result = favorites;

    if (selectedType !== 'all') {
      result = result.filter((f) => mapConfigTypeFromDB(f.config_type) === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => {
        const nameMatch = f.name.toLowerCase().includes(query);
        const config = f.config_data as FavoriteConfig;
        const symbolMatch = config.symbol?.toLowerCase().includes(query);
        const chainMatch = config.chain?.toLowerCase().includes(query);
        const oracleMatch = config.selectedOracles?.some((o) => o.toLowerCase().includes(query));
        return nameMatch || symbolMatch || chainMatch || oracleMatch;
      });
    }

    return result;
  }, [favorites, selectedType, searchQuery]);

  const groupedFavorites = useMemo(() => {
    if (!showGroupByType) {
      return { all: filteredFavorites } as Record<ConfigType | 'all', UserFavorite[]>;
    }

    const groups: Record<ConfigType | 'all', UserFavorite[]> = {
      oracle_config: [],
      symbol: [],
      chain_config: [],
      all: [],
    };

    filteredFavorites.forEach((favorite) => {
      const configType = mapConfigTypeFromDB(favorite.config_type);
      groups[configType].push(favorite);
    });

    return groups;
  }, [filteredFavorites, showGroupByType]);

  const handleApply = (config: FavoriteConfig, favorite: UserFavorite) => {
    const configType = mapConfigTypeFromDB(favorite.config_type);
    onApply?.(config, configType);
  };

  const handleEdit = (favorite: UserFavorite) => {
    setEditingFavorite(favorite);
  };

  const handleDelete = async (favoriteId: string) => {
    const favorite = favorites.find((f) => f.id === favoriteId);
    if (favorite) {
      await removeFavorite(favoriteId, mapConfigTypeFromDB(favorite.config_type));
    }
    setEditingFavorite(null);
  };

  const typeFilters: Array<{ value: ConfigType | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'favorites.all', count: favorites.length },
    {
      value: 'oracle_config',
      label: 'favorites.oracleConfig',
      count: favorites.filter((f) => mapConfigTypeFromDB(f.config_type) === 'oracle_config').length,
    },
    {
      value: 'symbol',
      label: 'favorites.symbol',
      count: favorites.filter((f) => mapConfigTypeFromDB(f.config_type) === 'symbol').length,
    },
    {
      value: 'chain_config',
      label: 'favorites.chainConfig',
      count: favorites.filter((f) => mapConfigTypeFromDB(f.config_type) === 'chain_config').length,
    },
  ];

  if (!user) {
    return (
      <div className={`bg-gray-50  p-8 text-center ${className}`}>
        <svg
          className="w-12 h-12 mx-auto text-gray-300 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <p className="text-sm text-gray-500">{'favorites.loginRequired'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-danger-50 border border-danger-200  p-6 text-center ${className}`}>
        <svg
          className="w-10 h-10 mx-auto text-red-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-danger-600">{'favorites.loadError'}</p>
        <p className="text-xs text-danger-500 mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {(showSearch || showFilters) && (
        <div className="mb-6 space-y-4">
          {showSearch && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={'favorites.searchPlaceholder'}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200  text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedType(filter.value)}
                  className={`px-3 py-1.5 text-sm font-medium  border transition-all ${
                    selectedType === filter.value
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {filter.label}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-xs  ${
                      selectedType === filter.value
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-gray-200  p-4 animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 " />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="bg-gray-50  p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <p className="text-base font-medium text-gray-600 mb-1">
            {searchQuery || selectedType !== 'all' ? 'favorites.noResults' : 'favorites.empty'}
          </p>
          <p className="text-sm text-gray-500">
            {searchQuery || selectedType !== 'all'
              ? 'favorites.noResultsDesc'
              : 'favorites.emptyDesc'}
          </p>
        </div>
      ) : showGroupByType && selectedType === 'all' ? (
        <div className="space-y-8">
          {(['oracle_config', 'symbol', 'chain_config'] as ConfigType[]).map((type) => {
            const typeFavorites = groupedFavorites[type];
            if (typeFavorites.length === 0) return null;

            const typeLabels: Record<ConfigType, string> = {
              oracle_config: 'favorites.oracleConfig',
              symbol: 'favorites.symbol',
              chain_config: 'favorites.chainConfig',
            };

            return (
              <div key={type}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {typeLabels[type]}
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 ">
                    {typeFavorites.length}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeFavorites.map((favorite) => (
                    <FavoriteCard
                      key={favorite.id}
                      favorite={favorite}
                      onApply={(config) => handleApply(config, favorite)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFavorites.map((favorite) => (
            <FavoriteCard
              key={favorite.id}
              favorite={favorite}
              onApply={(config) => handleApply(config, favorite)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
