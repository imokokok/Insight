'use client';

import { useCallback, useEffect } from 'react';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { supabase, queries, type PriceAlert, type AlertEvent } from '@/lib/supabase/client';
import type { AlertConditionType } from '@/lib/supabase/database.types';
import { useUser } from '@/stores/authStore';
import type { OracleProvider, Blockchain } from '@/types/oracle';

export interface CreateAlertInput {
  name: string;
  symbol: string;
  provider?: OracleProvider | null;
  chain?: Blockchain | null;
  condition_type: AlertConditionType;
  target_value: number;
  is_active?: boolean;
}

export interface UpdateAlertInput {
  symbol?: string;
  provider?: OracleProvider | null;
  chain?: Blockchain | null;
  condition_type?: AlertConditionType;
  target_value?: number;
  is_active?: boolean;
}

export interface UseAlertsReturn {
  alerts: PriceAlert[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseCreateAlertReturn {
  createAlert: (input: CreateAlertInput) => Promise<PriceAlert | null>;
  mutate: (
    input: CreateAlertInput,
    options?: {
      onSuccess?: (data: PriceAlert) => void;
      onError?: (error: Error) => void;
      onSettled?: () => void;
    }
  ) => void;
  mutateAsync: (input: CreateAlertInput) => Promise<PriceAlert | null>;
  isPending: boolean;
  error: Error | null;
  data: PriceAlert | undefined;
  reset: () => void;
}

export interface UseUpdateAlertReturn {
  updateAlert: (id: string, input: UpdateAlertInput) => Promise<PriceAlert | null>;
  mutate: (
    id: string,
    input: UpdateAlertInput,
    options?: {
      onSuccess?: (data: PriceAlert) => void;
      onError?: (error: Error) => void;
      onSettled?: () => void;
    }
  ) => void;
  mutateAsync: (id: string, input: UpdateAlertInput) => Promise<PriceAlert | null>;
  isPending: boolean;
  error: Error | null;
  data: PriceAlert | undefined;
  reset: () => void;
}

export interface UseDeleteAlertReturn {
  deleteAlert: (id: string) => Promise<boolean>;
  mutate: (
    id: string,
    options?: { onSuccess?: () => void; onError?: (error: Error) => void; onSettled?: () => void }
  ) => void;
  mutateAsync: (id: string) => Promise<boolean>;
  isPending: boolean;
  error: Error | null;
  data: boolean | undefined;
  reset: () => void;
}

export interface UseAlertEventsReturn {
  events: AlertEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseAcknowledgeAlertReturn {
  acknowledge: (eventId: string) => Promise<{ event: AlertEvent | null; error: Error | null }>;
  isAcknowledging: boolean;
}

export interface BatchOperationResult {
  processed: number;
  succeeded: number;
  failed: number;
  successIds: string[];
  failedIds: string[];
}

export interface UseBatchAlertsReturn {
  batchOperation: (
    action: 'enable' | 'disable' | 'delete',
    alertIds: string[]
  ) => Promise<{ result: BatchOperationResult | null; error: Error | null }>;
  isProcessing: boolean;
}

const ALERTS_KEY = 'user-alerts';
const ALERT_EVENTS_KEY = 'user-alert-events';

// Alert error message keys for i18n
export const alertErrorKeys = {
  userNotLoggedIn: 'hooks.alerts.userNotLoggedIn',
  createFailed: 'hooks.alerts.createFailed',
  updateFailed: 'hooks.alerts.updateFailed',
  deleteFailed: 'hooks.alerts.deleteFailed',
  acknowledgeFailed: 'hooks.alerts.acknowledgeFailed',
};

export function useAlerts(): UseAlertsReturn {
  const user = useUser();
  const userId = user?.id;

  const { data, error, isLoading, refetch } = useQuery<PriceAlert[], Error>({
    queryKey: [ALERTS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const result = await queries.getAlerts(userId);
      return result ?? [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    alerts: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}

export function useCreateAlert(): UseCreateAlertReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      if (!user?.id) {
        throw new Error(alertErrorKeys.userNotLoggedIn);
      }

      const alert = await queries.createAlert(user.id, {
        name: input.name,
        symbol: input.symbol,
        provider: (input.provider as string | null | undefined) ?? null,
        chain: (input.chain as string | null | undefined) ?? null,
        condition_type: input.condition_type,
        target_value: input.target_value,
        is_active: input.is_active ?? true,
      });

      if (!alert) {
        throw new Error(alertErrorKeys.createFailed);
      }

      return alert;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const createAlert = async (input: CreateAlertInput) => {
    try {
      const alert = await mutation.mutateAsync(input);
      return alert;
    } catch (err) {
      throw err;
    }
  };

  return {
    createAlert,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useUpdateAlert(): UseUpdateAlertReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAlertInput }) => {
      if (!user?.id) {
        throw new Error(alertErrorKeys.userNotLoggedIn);
      }

      const alert = await queries.updateAlert(id, {
        ...input,
        provider: (input.provider as string | null | undefined) ?? null,
        chain: (input.chain as string | null | undefined) ?? null,
      });

      if (!alert) {
        throw new Error(alertErrorKeys.updateFailed);
      }

      return alert;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const updateAlert = async (id: string, input: UpdateAlertInput) => {
    try {
      const alert = await mutation.mutateAsync({ id, input });
      return alert;
    } catch (err) {
      throw err;
    }
  };

  return {
    updateAlert,
    mutate: (
      id: string,
      input: UpdateAlertInput,
      options?: {
        onSuccess?: (data: PriceAlert) => void;
        onError?: (error: Error) => void;
        onSettled?: () => void;
      }
    ) => {
      mutation.mutate({ id, input }, options);
    },
    mutateAsync: (id: string, input: UpdateAlertInput) => mutation.mutateAsync({ id, input }),
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useDeleteAlert(): UseDeleteAlertReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error(alertErrorKeys.userNotLoggedIn);
      }

      const success = await queries.deleteAlert(id, user.id);

      if (!success) {
        throw new Error(alertErrorKeys.deleteFailed);
      }

      return true;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const deleteAlert = async (id: string) => {
    try {
      await mutation.mutateAsync(id);
      return true;
    } catch (err) {
      throw err;
    }
  };

  return {
    deleteAlert,
    mutate: (
      id: string,
      options?: { onSuccess?: () => void; onError?: (error: Error) => void; onSettled?: () => void }
    ) => {
      mutation.mutate(id, options);
    },
    mutateAsync: (id: string) => mutation.mutateAsync(id),
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useAlertEvents(): UseAlertEventsReturn {
  const user = useUser();
  const userId = user?.id;

  const { data, error, isLoading, refetch } = useQuery<AlertEvent[], Error>({
    queryKey: [ALERT_EVENTS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const result = await queries.getAlertEvents(userId);
      return result ?? [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    events: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}

export function useAcknowledgeAlert(): UseAcknowledgeAlertReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) {
        throw new Error(alertErrorKeys.userNotLoggedIn);
      }

      const event = await queries.acknowledgeAlertEvent(eventId);

      if (!event) {
        throw new Error(alertErrorKeys.acknowledgeFailed);
      }

      return event;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERT_EVENTS_KEY, user.id] });
      }
    },
  });

  const acknowledge = useCallback(
    async (eventId: string) => {
      try {
        const event = await mutation.mutateAsync(eventId);
        return { event, error: null };
      } catch (err) {
        return { event: null, error: err as Error };
      }
    },
    [mutation]
  );

  return { acknowledge, isAcknowledging: mutation.isPending };
}

export function useAlertEventsRealtime() {
  const user = useUser();
  const { refetch } = useAlertEvents();
  const stableRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`alert-events:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_events',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          stableRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, stableRefetch]);
}

export function useBatchAlerts(): UseBatchAlertsReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      action,
      alertIds,
    }: {
      action: 'enable' | 'disable' | 'delete';
      alertIds: string[];
    }) => {
      if (!user?.id) {
        throw new Error(alertErrorKeys.userNotLoggedIn);
      }

      if (alertIds.length === 0) {
        throw new Error('No alerts selected');
      }

      const response = await apiClient.post<BatchOperationResult>('/api/alerts/batch', {
        action,
        alertIds,
      });

      return response.data;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const batchOperation = useCallback(
    async (action: 'enable' | 'disable' | 'delete', alertIds: string[]) => {
      try {
        const result = await mutation.mutateAsync({ action, alertIds });
        return { result, error: null };
      } catch (err) {
        return { result: null, error: err as Error };
      }
    },
    [mutation]
  );

  return { batchOperation, isProcessing: mutation.isPending };
}
