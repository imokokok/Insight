import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useSnapshotMutations');

interface CreateSnapshotParams {
  name: string;
  symbol: string;
  selectedOracles: string[];
  priceData: Record<string, unknown>;
  stats?: Record<string, unknown>;
  isPublic?: boolean;
}

interface DeleteSnapshotParams {
  id: string;
}

interface ShareSnapshotParams {
  id: string;
}

export function useSnapshotMutations() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const createSnapshot = useMutation({
    mutationFn: async (params: CreateSnapshotParams) => {
      if (!user) throw new Error('User not authenticated');
      
      const response = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create snapshot');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      logger.info('Snapshot created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create snapshot', error as Error);
    },
  });

  const deleteSnapshot = useMutation({
    mutationFn: async ({ id }: DeleteSnapshotParams) => {
      const response = await fetch(`/api/snapshots/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete snapshot');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      logger.info('Snapshot deleted successfully');
    },
    onError: (error) => {
      logger.error('Failed to delete snapshot', error as Error);
    },
  });

  const shareSnapshot = useMutation({
    mutationFn: async ({ id }: ShareSnapshotParams) => {
      const response = await fetch(`/api/snapshots/${id}/share`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to share snapshot');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      logger.info('Snapshot shared successfully', { shareId: data.id });
    },
    onError: (error) => {
      logger.error('Failed to share snapshot', error as Error);
    },
  });

  return {
    createSnapshot: createSnapshot.mutate,
    createSnapshotAsync: createSnapshot.mutateAsync,
    deleteSnapshot: deleteSnapshot.mutate,
    deleteSnapshotAsync: deleteSnapshot.mutateAsync,
    shareSnapshot: shareSnapshot.mutate,
    shareSnapshotAsync: shareSnapshot.mutateAsync,
    isCreating: createSnapshot.isPending,
    isDeleting: deleteSnapshot.isPending,
    isSharing: shareSnapshot.isPending,
  };
}
