'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { supabase, type PriceAlert, type AlertEvent } from '@/lib/supabase/client';
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

interface UpdateAlertInput {
  name?: string;
  symbol?: string;
  provider?: OracleProvider | null;
  chain?: Blockchain | null;
  condition_type?: AlertConditionType;
  target_value?: number;
  is_active?: boolean;
}

interface UseAlertsReturn {
  alerts: PriceAlert[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseCreateAlertReturn {
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

interface UseUpdateAlertReturn {
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

interface UseDeleteAlertReturn {
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

interface UseAlertEventsReturn {
  events: AlertEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseAcknowledgeAlertReturn {
  acknowledge: (eventId: string) => Promise<{ event: AlertEvent | null; error: Error | null }>;
  isAcknowledging: boolean;
}

interface BatchOperationResult {
  processed: number;
  succeeded: number;
  failed: number;
  successIds: string[];
  failedIds: string[];
}

interface BatchOperationResponse {
  message: string;
  results: BatchOperationResult;
}

interface UseBatchAlertsReturn {
  batchOperation: (
    action: 'enable' | 'disable' | 'delete',
    alertIds: string[]
  ) => Promise<{ result: BatchOperationResult | null; error: Error | null }>;
  isProcessing: boolean;
}

const ALERTS_KEY = 'user-alerts';
const ALERT_EVENTS_KEY = 'user-alert-events';

const ALERT_ERROR_MESSAGES = {
  userNotLoggedIn: 'User not logged in',
  createFailed: 'Failed to create alert',
  updateFailed: 'Failed to update alert',
  deleteFailed: 'Failed to delete alert',
  acknowledgeFailed: 'Failed to acknowledge alert',
} as const;

export function useAlerts(): UseAlertsReturn {
  const user = useUser();
  const userId = user?.id;

  const { data, error, isLoading, refetch } = useQuery<PriceAlert[], Error>({
    queryKey: [ALERTS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiClient.get<{ alerts: PriceAlert[]; count: number }>('/api/alerts');
      return response.data.alerts ?? [];
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
        throw new Error(ALERT_ERROR_MESSAGES.userNotLoggedIn);
      }

      const response = await apiClient.post<{ alert: PriceAlert; message: string }>('/api/alerts', {
        name: input.name,
        symbol: input.symbol,
        provider: input.provider ?? null,
        chain: input.chain ?? null,
        condition_type: input.condition_type,
        target_value: input.target_value,
        is_active: input.is_active ?? true,
      });

      return response.data.alert;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const createAlert = async (input: CreateAlertInput) => {
    return mutation.mutateAsync(input);
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
        throw new Error(ALERT_ERROR_MESSAGES.userNotLoggedIn);
      }

      const response = await apiClient.put<{ alert: PriceAlert; message: string }>(
        `/api/alerts/${id}`,
        {
          ...input,
          provider: input.provider ?? null,
          chain: input.chain ?? null,
        }
      );

      return response.data.alert;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const updateAlert = async (id: string, input: UpdateAlertInput) => {
    return mutation.mutateAsync({ id, input });
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
        throw new Error(ALERT_ERROR_MESSAGES.userNotLoggedIn);
      }

      await apiClient.delete<{ message: string }>(`/api/alerts/${id}`);
      return true;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const deleteAlert = async (id: string) => {
    await mutation.mutateAsync(id);
    return true;
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
      const response = await apiClient.get<{ events: AlertEvent[]; count: number }>(
        '/api/alerts/events'
      );
      return response.data.events ?? [];
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
        throw new Error(ALERT_ERROR_MESSAGES.userNotLoggedIn);
      }

      const response = await apiClient.post<{
        event: AlertEvent;
        message: string;
      }>(`/api/alerts/events/${eventId}/acknowledge`, {});

      return response.data.event;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERT_EVENTS_KEY, user.id] });
      }
    },
  });

  const mutationRef = useRef(mutation);
  useEffect(() => {
    mutationRef.current = mutation;
  });

  const acknowledge = useCallback(async (eventId: string) => {
    try {
      const event = await mutationRef.current.mutateAsync(eventId);
      return { event, error: null };
    } catch (err) {
      return { event: null, error: err as Error };
    }
  }, []);

  return { acknowledge, isAcknowledging: mutation.isPending };
}

export function useAlertEventsRealtime() {
  const user = useUser();
  const { refetch } = useAlertEvents();
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

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
          refetchRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
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
        throw new Error(ALERT_ERROR_MESSAGES.userNotLoggedIn);
      }

      if (alertIds.length === 0) {
        throw new Error('No alerts selected');
      }

      const response = await apiClient.post<BatchOperationResponse>('/api/alerts/batch', {
        action,
        alertIds,
      });

      return response.data.results;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });
      }
    },
  });

  const batchMutationRef = useRef(mutation);
  useEffect(() => {
    batchMutationRef.current = mutation;
  });

  const batchOperation = useCallback(
    async (action: 'enable' | 'disable' | 'delete', alertIds: string[]) => {
      try {
        const result = await batchMutationRef.current.mutateAsync({ action, alertIds });
        return { result, error: null };
      } catch (err) {
        return { result: null, error: err as Error };
      }
    },
    []
  );

  return { batchOperation, isProcessing: mutation.isPending };
}
