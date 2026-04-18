'use client';

import { useState, useCallback } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthenticationError } from '@/lib/errors';
import { queries } from '@/lib/supabase/client';
import type { ConfigType } from '@/lib/supabase/database.types';
import type { UserFavorite } from '@/lib/supabase/queries';
import { useUser } from '@/stores/authStore';

export interface FavoriteConfig {
  selectedOracles?: string[];
  symbol?: string;
  chains?: string[];
  chain?: string;
  symbols?: string[];
}

interface UseFavoritesOptions {
  configType?: ConfigType;
}

const VALID_CONFIG_TYPES = new Set<string>(['oracle_config', 'symbol', 'chain_config']);

function isConfigType(value: string): value is ConfigType {
  return VALID_CONFIG_TYPES.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!isRecord(a) || !isRecord(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => deepEqual(a[key], b[key]));
}

export function useFavorites(options: UseFavoritesOptions = {}) {
  const user = useUser();
  const { configType } = options;

  const queryKey = configType ? ['favorites', user?.id, configType] : ['favorites', user?.id];

  const {
    data: favorites,
    error,
    isLoading,
    refetch,
  } = useQuery<UserFavorite[], Error>({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      let result;
      if (configType) {
        result = await queries.getFavoritesByType(
          user.id,
          configType as 'oracle_config' | 'symbol' | 'chain_config'
        );
      } else {
        result = await queries.getFavorites(user.id);
      }
      return result || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    favorites: favorites || [],
    isLoading,
    error,
    refetch,
  };
}

export function useAddFavorite() {
  const user = useUser();
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const addFavorite = useCallback(
    async (name: string, configType: ConfigType, configData: FavoriteConfig) => {
      if (!user) {
        throw new AuthenticationError('User must be logged in to add favorites', {
          reason: 'not_authenticated',
        });
      }

      setIsAdding(true);
      try {
        const favorite = await queries.addFavorite(user.id, {
          name,
          config_type: mapConfigType(configType),
          config_data: Object.fromEntries(Object.entries(configData)),
        });

        if (favorite) {
          await queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['favorites', user.id, configType] });
        }

        return favorite;
      } finally {
        setIsAdding(false);
      }
    },
    [user, queryClient]
  );

  return {
    addFavorite,
    isAdding,
  };
}

export function useRemoveFavorite() {
  const user = useUser();
  const [isRemoving, setIsRemoving] = useState(false);
  const queryClient = useQueryClient();

  const removeFavorite = useCallback(
    async (favoriteId: string, configType?: ConfigType) => {
      if (!user) {
        throw new AuthenticationError('User must be logged in to remove favorites', {
          reason: 'not_authenticated',
        });
      }

      setIsRemoving(true);
      try {
        const success = await queries.deleteFavorite(favoriteId, user.id);

        if (success) {
          await queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
          if (configType) {
            await queryClient.invalidateQueries({ queryKey: ['favorites', user.id, configType] });
          }
        }

        return success;
      } finally {
        setIsRemoving(false);
      }
    },
    [user, queryClient]
  );

  return {
    removeFavorite,
    isRemoving,
  };
}

export function useToggleFavorite() {
  const user = useUser();
  const { favorites, refetch: _refetch } = useFavorites();
  const { addFavorite, isAdding } = useAddFavorite();
  const { removeFavorite, isRemoving } = useRemoveFavorite();
  const [isToggling, setIsToggling] = useState(false);

  const toggleFavorite = useCallback(
    async (name: string, configType: ConfigType, configData: FavoriteConfig) => {
      if (!user) {
        throw new AuthenticationError('User must be logged in to toggle favorites', {
          reason: 'not_authenticated',
        });
      }

      setIsToggling(true);
      try {
        const existingFavorite = favorites?.find(
          (f) => f.config_type === mapConfigType(configType) && deepEqual(f.config_data, configData)
        );

        if (existingFavorite) {
          if (!existingFavorite.id)
            return { action: 'removed' as const, favorite: existingFavorite };
          await removeFavorite(existingFavorite.id, configType);
          return { action: 'removed' as const, favorite: existingFavorite };
        } else {
          const newFavorite = await addFavorite(name, configType, configData);
          return { action: 'added' as const, favorite: newFavorite };
        }
      } finally {
        setIsToggling(false);
      }
    },
    [user, favorites, addFavorite, removeFavorite]
  );

  return {
    toggleFavorite,
    isToggling: isToggling || isAdding || isRemoving,
  };
}

export function useIsFavorited(configType: ConfigType, configData: FavoriteConfig) {
  const { favorites } = useFavorites({ configType });

  const isFavorited = favorites?.some((f) => deepEqual(f.config_data, configData)) ?? false;

  const matchingFavorite = favorites?.find((f) => deepEqual(f.config_data, configData));

  return {
    isFavorited,
    favorite: matchingFavorite,
  };
}

export function useUpdateFavorite() {
  const user = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const updateFavorite = useCallback(
    async (
      favoriteId: string,
      data: { name?: string; configData?: FavoriteConfig },
      configType?: ConfigType
    ) => {
      if (!user) {
        throw new AuthenticationError('User must be logged in to update favorites', {
          reason: 'not_authenticated',
        });
      }

      setIsUpdating(true);
      try {
        const updateData: { name?: string; config_data?: Record<string, unknown> } = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.configData !== undefined)
          updateData.config_data = Object.fromEntries(Object.entries(data.configData));

        const favorite = await queries.updateFavorite(favoriteId, updateData);

        if (favorite) {
          await queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
          if (configType) {
            await queryClient.invalidateQueries({ queryKey: ['favorites', user.id, configType] });
          }
        }

        return favorite;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, queryClient]
  );

  return {
    updateFavorite,
    isUpdating,
  };
}

function mapConfigType(configType: ConfigType): 'oracle_config' | 'symbol' | 'chain_config' {
  return configType;
}

export function mapConfigTypeFromDB(dbConfigType: string): ConfigType {
  if (isConfigType(dbConfigType)) {
    return dbConfigType;
  }
  return 'symbol';
}
