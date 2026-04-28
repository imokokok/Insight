'use client';

import { useRef, useEffect } from 'react';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { supabase, type UserSnapshot, type UserSnapshotInsert } from '@/lib/supabase/client';
import { useUser } from '@/stores/authStore';
import type { OracleProvider } from '@/types/oracle';

const SNAPSHOTS_KEY = 'user-snapshots';

const SNAPSHOT_ERROR_MESSAGES = {
  userNotLoggedIn: 'User not logged in',
  createFailed: 'Failed to create snapshot',
  updateFailed: 'Failed to update snapshot',
  deleteFailed: 'Failed to delete snapshot',
} as const;

export interface CreateSnapshotInput {
  name?: string;
  symbol: string;
  selected_oracles: OracleProvider[];
  price_data: UserSnapshotInsert['price_data'];
  stats: UserSnapshotInsert['stats'];
  is_public?: boolean;
}

interface UpdateSnapshotInput {
  name?: string;
  is_public?: boolean;
}

interface UseSnapshotsReturn {
  snapshots: UserSnapshot[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseCreateSnapshotReturn {
  createSnapshot: (input: CreateSnapshotInput) => Promise<UserSnapshot | null>;
  mutate: (
    input: CreateSnapshotInput,
    options?: {
      onSuccess?: (data: UserSnapshot) => void;
      onError?: (error: Error) => void;
      onSettled?: () => void;
    }
  ) => void;
  mutateAsync: (input: CreateSnapshotInput) => Promise<UserSnapshot | null>;
  isPending: boolean;
  error: Error | null;
  data: UserSnapshot | undefined;
  reset: () => void;
}

interface UseUpdateSnapshotReturn {
  updateSnapshot: (id: string, input: UpdateSnapshotInput) => Promise<UserSnapshot | null>;
  mutate: (
    id: string,
    input: UpdateSnapshotInput,
    options?: {
      onSuccess?: (data: UserSnapshot) => void;
      onError?: (error: Error) => void;
      onSettled?: () => void;
    }
  ) => void;
  mutateAsync: (id: string, input: UpdateSnapshotInput) => Promise<UserSnapshot | null>;
  isPending: boolean;
  error: Error | null;
  data: UserSnapshot | undefined;
  reset: () => void;
}

interface UseDeleteSnapshotReturn {
  deleteSnapshot: (id: string) => Promise<boolean>;
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

export function useSnapshots(): UseSnapshotsReturn {
  const user = useUser();
  const userId = user?.id;

  const { data, error, isLoading, refetch } = useQuery<UserSnapshot[], Error>({
    queryKey: [SNAPSHOTS_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiClient.get<{ snapshots: UserSnapshot[]; count: number }>(
        '/api/snapshots'
      );
      return response.data.snapshots ?? [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    snapshots: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}

export function useCreateSnapshot(): UseCreateSnapshotReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateSnapshotInput) => {
      if (!user?.id) {
        throw new Error(SNAPSHOT_ERROR_MESSAGES.userNotLoggedIn);
      }

      const response = await apiClient.post<{ snapshot: UserSnapshot; message: string }>(
        '/api/snapshots',
        {
          name: input.name,
          symbol: input.symbol,
          selected_oracles: input.selected_oracles,
          price_data: input.price_data,
          stats: input.stats,
          is_public: input.is_public ?? false,
        }
      );

      return response.data.snapshot;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [SNAPSHOTS_KEY, user.id] });
      }
    },
  });

  const createSnapshot = async (input: CreateSnapshotInput) => {
    return mutation.mutateAsync(input);
  };

  return {
    createSnapshot,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useUpdateSnapshot(): UseUpdateSnapshotReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSnapshotInput }) => {
      if (!user?.id) {
        throw new Error(SNAPSHOT_ERROR_MESSAGES.userNotLoggedIn);
      }

      const response = await apiClient.put<{ snapshot: UserSnapshot; message: string }>(
        `/api/snapshots/${id}`,
        input
      );

      return response.data.snapshot;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [SNAPSHOTS_KEY, user.id] });
      }
    },
  });

  const updateSnapshot = async (id: string, input: UpdateSnapshotInput) => {
    return mutation.mutateAsync({ id, input });
  };

  return {
    updateSnapshot,
    mutate: (
      id: string,
      input: UpdateSnapshotInput,
      options?: {
        onSuccess?: (data: UserSnapshot) => void;
        onError?: (error: Error) => void;
        onSettled?: () => void;
      }
    ) => {
      mutation.mutate({ id, input }, options);
    },
    mutateAsync: (id: string, input: UpdateSnapshotInput) => mutation.mutateAsync({ id, input }),
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useDeleteSnapshot(): UseDeleteSnapshotReturn {
  const user = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error(SNAPSHOT_ERROR_MESSAGES.userNotLoggedIn);
      }

      await apiClient.delete<{ message: string }>(`/api/snapshots/${id}`);
      return true;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [SNAPSHOTS_KEY, user.id] });
      }
    },
  });

  const deleteSnapshot = async (id: string) => {
    await mutation.mutateAsync(id);
    return true;
  };

  return {
    deleteSnapshot,
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

export function useSnapshotsRealtime() {
  const user = useUser();
  const { refetch } = useSnapshots();
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`snapshots:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_snapshots',
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
