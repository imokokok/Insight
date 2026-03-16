import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useFavoriteMutations');

interface CreateFavoriteParams {
  name: string;
  configType: 'oracle_config' | 'symbol' | 'chain_config';
  configData: Record<string, unknown>;
}

interface DeleteFavoriteParams {
  id: string;
}

export function useFavoriteMutations() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const createFavorite = useMutation({
    mutationFn: async (params: CreateFavoriteParams) => {
      if (!user) throw new Error('User not authenticated');
      
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create favorite');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      logger.info('Favorite created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create favorite', error as Error);
    },
  });

  const deleteFavorite = useMutation({
    mutationFn: async ({ id }: DeleteFavoriteParams) => {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete favorite');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      logger.info('Favorite deleted successfully');
    },
    onError: (error) => {
      logger.error('Failed to delete favorite', error as Error);
    },
  });

  return {
    createFavorite: createFavorite.mutate,
    createFavoriteAsync: createFavorite.mutateAsync,
    deleteFavorite: deleteFavorite.mutate,
    deleteFavoriteAsync: deleteFavorite.mutateAsync,
    isCreating: createFavorite.isPending,
    isDeleting: deleteFavorite.isPending,
  };
}
