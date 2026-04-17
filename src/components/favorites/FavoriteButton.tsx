'use client';

import { useState, useCallback } from 'react';

import { useToggleFavorite, useIsFavorited, type FavoriteConfig } from '@/hooks';
import type { ConfigType } from '@/lib/supabase/database.types';
import { createLogger } from '@/lib/utils/logger';
import { useUser } from '@/stores/authStore';

const logger = createLogger('FavoriteButton');

interface FavoriteButtonProps {
  configType: ConfigType;
  configData: FavoriteConfig;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'text';
  showLabel?: boolean;
  className?: string;
  onFavoriteChange?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  configType,
  configData,
  name,
  size = 'md',
  variant = 'icon',
  showLabel = false,
  className = '',
  onFavoriteChange,
}: FavoriteButtonProps) {
  const user = useUser();
  const { isFavorited, favorite: _favorite } = useIsFavorited(configType, configData);
  const { toggleFavorite, isToggling } = useToggleFavorite();
  const [_showTooltip, setShowTooltip] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        return;
      }

      try {
        const result = await toggleFavorite(name, configType, configData);
        onFavoriteChange?.(result.action === 'added');
      } catch (error) {
        logger.error(
          'Failed to toggle favorite',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },
    [user, name, configType, configData, toggleFavorite, onFavoriteChange]
  );

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSize = sizeClasses[size];
  const buttonSize = buttonSizeClasses[size];

  const heartIcon = isFavorited ? (
    <svg
      className={`${iconSize} text-danger-500 transition-colors`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg
      className={`${iconSize} text-gray-400 hover:text-red-400 transition-colors`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );

  if (!user) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isToggling}
        className={`${buttonSize}  transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isToggling ? (
          <svg className={`${iconSize} text-gray-400 animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          heartIcon
        )}
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleClick}
        disabled={isToggling}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          isFavorited ? 'text-danger-500' : 'text-gray-600 hover:text-danger-500'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isToggling ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          heartIcon
        )}
        {showLabel && <span>{isFavorited ? 'Added' : 'Add'}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium  border transition-all ${
        isFavorited
          ? 'bg-danger-50 border-danger-200 text-danger-700 hover:bg-danger-100'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-300'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isToggling ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        heartIcon
      )}
      {showLabel && <span>{isFavorited ? 'Added' : 'Add'}</span>}
    </button>
  );
}
