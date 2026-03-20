'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/stores/authStore';
import { queries } from '@/lib/supabase/client';
import type { ConfigType } from '@/lib/supabase/database.types';
import type { UserFavorite } from '@/lib/supabase/queries';

export interface FavoriteConfig {
  selectedOracles?: string[];
  symbol?: string;
  chains?: string[];
  chain?: string;
  symbols?: string[];
}

export interface UseFavoritesOptions {
  configType?: ConfigType;
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
        throw new Error('User must be logged in to add favorites');
      }

      setIsAdding(true);
      try {
        const favorite = await queries.addFavorite(user.id, {
          name,
          config_type: mapConfigType(configType),
          config_data: configData as Record<string, unknown>,
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
        throw new Error('User must be logged in to remove favorites');
      }

      setIsRemoving(true);
      try {
        const success = await queries.deleteFavorite(favoriteId);

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
        throw new Error('User must be logged in to toggle favorites');
      }

      setIsToggling(true);
      try {
        const existingFavorite = favorites?.find(
          (f) =>
            f.config_type === mapConfigType(configType) &&
            JSON.stringify(f.config_data) === JSON.stringify(configData)
        );

        if (existingFavorite) {
          await removeFavorite(existingFavorite.id!, configType);
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
  const _user = useUser();
  const { favorites } = useFavorites({ configType });

  const isFavorited =
    favorites?.some((f) => JSON.stringify(f.config_data) === JSON.stringify(configData)) ?? false;

  const matchingFavorite = favorites?.find(
    (f) => JSON.stringify(f.config_data) === JSON.stringify(configData)
  );

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
        throw new Error('User must be logged in to update favorites');
      }

      setIsUpdating(true);
      try {
        const updateData: { name?: string; config_data?: Record<string, unknown> } = {};
        if (data.name) updateData.name = data.name;
        if (data.configData) updateData.config_data = data.configData as Record<string, unknown>;

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
  return dbConfigType as ConfigType;
}
