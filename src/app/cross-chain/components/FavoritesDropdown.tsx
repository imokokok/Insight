'use client';

import { useRouter } from 'next/navigation';

import type { FavoriteConfig } from '@/hooks';
import { type UserFavorite } from '@/lib/supabase/queries';

interface FavoritesDropdownProps {
  chainFavorites: UserFavorite[];
  showFavoritesDropdown: boolean;
  onToggleDropdown: () => void;
  onApplyFavorite: (config: FavoriteConfig) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function FavoritesDropdown({
  chainFavorites,
  showFavoritesDropdown,
  onToggleDropdown,
  onApplyFavorite,
  dropdownRef,
}: FavoritesDropdownProps) {
  const router = useRouter();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggleDropdown}
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
        <span>Favorites</span>
        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
          {chainFavorites.length}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${showFavoritesDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showFavoritesDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 z-50 max-h-96 overflow-y-auto rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Quick Access</h3>
          </div>
          <div className="p-1">
            {chainFavorites.map((favorite) => {
              const config = favorite.config_data as FavoriteConfig;
              return (
                <button
                  key={favorite.id}
                  onClick={() => onApplyFavorite(config)}
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
                onToggleDropdown();
                router.push('/favorites');
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Favorites
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
