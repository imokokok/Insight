import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useAlertMutations');

interface CreateAlertParams {
  symbol: string;
  condition: 'above' | 'below' | 'change_percent';
  targetValue: number;
  provider?: string;
  chain?: string;
}

interface UpdateAlertParams {
  id: string;
  updates: Partial<CreateAlertParams & { isActive: boolean }>;
}

interface DeleteAlertParams {
  id: string;
}

export function useAlertMutations() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const createAlert = useMutation({
    mutationFn: async (params: CreateAlertParams) => {
      if (!user) throw new Error('User not authenticated');
      
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create alert');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      logger.info('Alert created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create alert', error as Error);
    },
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, updates }: UpdateAlertParams) => {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update alert');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      logger.info('Alert updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to update alert', error as Error);
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async ({ id }: DeleteAlertParams) => {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete alert');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      logger.info('Alert deleted successfully');
    },
    onError: (error) => {
      logger.error('Failed to delete alert', error as Error);
    },
  });

  return {
    createAlert: createAlert.mutate,
    createAlertAsync: createAlert.mutateAsync,
    updateAlert: updateAlert.mutate,
    updateAlertAsync: updateAlert.mutateAsync,
    deleteAlert: deleteAlert.mutate,
    deleteAlertAsync: deleteAlert.mutateAsync,
    isCreating: createAlert.isPending,
    isUpdating: updateAlert.isPending,
    isDeleting: deleteAlert.isPending,
  };
}
