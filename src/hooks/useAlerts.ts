'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, queries, PriceAlert, AlertEvent } from '@/lib/supabase/client';
import type { AlertConditionType } from '@/lib/supabase/database.types';
import type { OracleProvider, Blockchain } from '@/types/oracle';
import { useAuth } from '@/contexts/AuthContext';

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
  createAlert: (
    input: CreateAlertInput
  ) => Promise<{ alert: PriceAlert | null; error: Error | null }>;
  isCreating: boolean;
}

export interface UseUpdateAlertReturn {
  updateAlert: (
    id: string,
    input: UpdateAlertInput
  ) => Promise<{ alert: PriceAlert | null; error: Error | null }>;
  isUpdating: boolean;
}

export interface UseDeleteAlertReturn {
  deleteAlert: (id: string) => Promise<{ success: boolean; error: Error | null }>;
  isDeleting: boolean;
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

const ALERTS_KEY = 'user-alerts';
const ALERT_EVENTS_KEY = 'user-alert-events';

export function useAlerts(): UseAlertsReturn {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, error, isLoading, refetch } = useQuery<PriceAlert[], Error>({
    queryKey: [ALERTS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const result = await queries.getAlerts(userId);
      return (result as PriceAlert[]) ?? [];
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
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createAlert = useCallback(
    async (input: CreateAlertInput) => {
      if (!user?.id) {
        return { alert: null, error: new Error('用户未登录') };
      }

      setIsCreating(true);
      try {
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
          return { alert: null, error: new Error('创建告警失败') };
        }

        await queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });

        return { alert: alert as PriceAlert, error: null };
      } catch (err) {
        return { alert: null, error: err as Error };
      } finally {
        setIsCreating(false);
      }
    },
    [user?.id, queryClient]
  );

  return { createAlert, isCreating };
}

export function useUpdateAlert(): UseUpdateAlertReturn {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const updateAlert = useCallback(
    async (id: string, input: UpdateAlertInput) => {
      if (!user?.id) {
        return { alert: null, error: new Error('用户未登录') };
      }

      setIsUpdating(true);
      try {
        const alert = await queries.updateAlert(id, {
          ...input,
          provider: (input.provider as string | null | undefined) ?? null,
          chain: (input.chain as string | null | undefined) ?? null,
        });

        if (!alert) {
          return { alert: null, error: new Error('更新告警失败') };
        }

        await queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });

        return { alert: alert as PriceAlert, error: null };
      } catch (err) {
        return { alert: null, error: err as Error };
      } finally {
        setIsUpdating(false);
      }
    },
    [user?.id, queryClient]
  );

  return { updateAlert, isUpdating };
}

export function useDeleteAlert(): UseDeleteAlertReturn {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const deleteAlert = useCallback(
    async (id: string) => {
      if (!user?.id) {
        return { success: false, error: new Error('用户未登录') };
      }

      setIsDeleting(true);
      try {
        const success = await queries.deleteAlert(id);

        if (!success) {
          return { success: false, error: new Error('删除告警失败') };
        }

        await queryClient.invalidateQueries({ queryKey: [ALERTS_KEY, user.id] });

        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: err as Error };
      } finally {
        setIsDeleting(false);
      }
    },
    [user?.id, queryClient]
  );

  return { deleteAlert, isDeleting };
}

export function useAlertEvents(): UseAlertEventsReturn {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, error, isLoading, refetch } = useQuery<AlertEvent[], Error>({
    queryKey: [ALERT_EVENTS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const result = await queries.getAlertEvents(userId);
      return (result as AlertEvent[]) ?? [];
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
  const { user } = useAuth();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const queryClient = useQueryClient();

  const acknowledge = useCallback(
    async (eventId: string) => {
      if (!user?.id) {
        return { event: null, error: new Error('用户未登录') };
      }

      setIsAcknowledging(true);
      try {
        const event = await queries.acknowledgeAlertEvent(eventId);

        if (!event) {
          return { event: null, error: new Error('确认告警失败') };
        }

        await queryClient.invalidateQueries({ queryKey: [ALERT_EVENTS_KEY, user.id] });

        return { event: event as AlertEvent, error: null };
      } catch (err) {
        return { event: null, error: err as Error };
      } finally {
        setIsAcknowledging(false);
      }
    },
    [user?.id, queryClient]
  );

  return { acknowledge, isAcknowledging };
}

export function useActiveAlertsRealtime() {
  const { user } = useAuth();
  const { alerts, refetch } = useAlerts();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`alerts:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  return { alerts };
}

export function useAlertEventsRealtime() {
  const { user } = useAuth();
  const { events, refetch } = useAlertEvents();

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
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  return { events };
}
