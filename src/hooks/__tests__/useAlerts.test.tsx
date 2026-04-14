import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { apiClient } from '@/lib/api';
import { queries } from '@/lib/supabase/client';
import { useUser } from '@/stores/authStore';

import {
  useAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAlertEvents,
  useAcknowledgeAlert,
  useBatchAlerts,
  alertErrorKeys,
} from '../data/useAlerts';

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  queries: {
    getAlerts: jest.fn(),
    createAlert: jest.fn(),
    updateAlert: jest.fn(),
    deleteAlert: jest.fn(),
    getAlertEvents: jest.fn(),
    acknowledgeAlertEvent: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockAlert = {
  id: 'alert-1',
  user_id: 'test-user-id',
  name: 'BTC Alert',
  symbol: 'BTC/USD',
  provider: 'chainlink',
  condition_type: 'above',
  target_value: 50000,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAlertEvent = {
  id: 'event-1',
  alert_id: 'alert-1',
  user_id: 'test-user-id',
  triggered_at: new Date().toISOString(),
  acknowledged_at: null,
};

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should return empty array when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('should fetch alerts for logged in user', async () => {
    (queries.getAlerts as jest.Mock).mockResolvedValue([mockAlert]);

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].name).toBe('BTC Alert');
  });

  it('should handle fetch error', async () => {
    (queries.getAlerts as jest.Mock).mockRejectedValue(new Error('Fetch error'));

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch alerts', async () => {
    (queries.getAlerts as jest.Mock).mockResolvedValue([mockAlert]);

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(queries.getAlerts).toHaveBeenCalledTimes(2);
  });
});

describe('useCreateAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.createAlert({
          name: 'Test Alert',
          symbol: 'BTC/USD',
          condition_type: 'above',
          target_value: 50000,
        });
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError?.message).toBe(alertErrorKeys.userNotLoggedIn);
  });

  it('should create alert successfully', async () => {
    (queries.createAlert as jest.Mock).mockResolvedValue(mockAlert);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    let createdAlert: typeof mockAlert | null = null;
    await act(async () => {
      createdAlert = await result.current.createAlert({
        name: 'BTC Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    expect(createdAlert).toEqual(mockAlert);
  });

  it('should throw error on create failure', async () => {
    (queries.createAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.createAlert({
          name: 'Test Alert',
          symbol: 'BTC/USD',
          condition_type: 'above',
          target_value: 50000,
        });
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError?.message).toBe(alertErrorKeys.createFailed);
  });

  it('should track isPending state', async () => {
    let resolveCreate: (value: typeof mockAlert) => void;
    const createPromise = new Promise<typeof mockAlert>((resolve) => {
      resolveCreate = resolve;
    });
    (queries.createAlert as jest.Mock).mockReturnValue(createPromise);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    let alertPromise: Promise<typeof mockAlert | null>;
    act(() => {
      alertPromise = result.current.createAlert({
        name: 'BTC Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveCreate!(mockAlert);
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutate with callbacks', async () => {
    (queries.createAlert as jest.Mock).mockResolvedValue(mockAlert);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    const onSuccess = jest.fn();
    const onError = jest.fn();

    act(() => {
      result.current.mutate(
        {
          name: 'BTC Alert',
          symbol: 'BTC/USD',
          condition_type: 'above',
          target_value: 50000,
        },
        { onSuccess, onError }
      );
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle error via mutate callbacks', async () => {
    (queries.createAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    const onSuccess = jest.fn();
    const onError = jest.fn();

    act(() => {
      result.current.mutate(
        {
          name: 'BTC Alert',
          symbol: 'BTC/USD',
          condition_type: 'above',
          target_value: 50000,
        },
        { onSuccess, onError }
      );
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(onError).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('useUpdateAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should update alert successfully', async () => {
    const updatedAlert = { ...mockAlert, target_value: 55000 };
    (queries.updateAlert as jest.Mock).mockResolvedValue(updatedAlert);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createTestWrapper(),
    });

    let updated: typeof mockAlert | null = null;
    await act(async () => {
      updated = await result.current.updateAlert('alert-1', {
        target_value: 55000,
      });
    });

    expect(updated?.target_value).toBe(55000);
  });

  it('should throw error on update failure', async () => {
    (queries.updateAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createTestWrapper(),
    });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.updateAlert('alert-1', {
          target_value: 55000,
        });
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError?.message).toBe(alertErrorKeys.updateFailed);
  });

  it('should track isPending state', async () => {
    let resolveUpdate: (value: typeof mockAlert) => void;
    const updatePromise = new Promise<typeof mockAlert>((resolve) => {
      resolveUpdate = resolve;
    });
    (queries.updateAlert as jest.Mock).mockReturnValue(updatePromise);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    let updatePromiseResult: Promise<typeof mockAlert | null>;
    act(() => {
      updatePromiseResult = result.current.updateAlert('alert-1', {
        target_value: 55000,
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveUpdate!(mockAlert);
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutate with callbacks', async () => {
    const updatedAlert = { ...mockAlert, target_value: 55000 };
    (queries.updateAlert as jest.Mock).mockResolvedValue(updatedAlert);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createTestWrapper(),
    });

    const onSuccess = jest.fn();
    const onError = jest.fn();

    act(() => {
      result.current.mutate('alert-1', { target_value: 55000 }, { onSuccess, onError });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('useDeleteAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should delete alert successfully', async () => {
    (queries.deleteAlert as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createTestWrapper(),
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteAlert('alert-1');
    });

    expect(success).toBe(true);
  });

  it('should throw error on delete failure', async () => {
    (queries.deleteAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createTestWrapper(),
    });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.deleteAlert('alert-1');
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError?.message).toBe(alertErrorKeys.deleteFailed);
  });

  it('should track isPending state', async () => {
    let resolveDelete: (value: boolean) => void;
    const deletePromise = new Promise<boolean>((resolve) => {
      resolveDelete = resolve;
    });
    (queries.deleteAlert as jest.Mock).mockReturnValue(deletePromise);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    let deletePromiseResult: Promise<boolean>;
    act(() => {
      deletePromiseResult = result.current.deleteAlert('alert-1');
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveDelete!(true);
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutate with callbacks', async () => {
    (queries.deleteAlert as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createTestWrapper(),
    });

    const onSuccess = jest.fn();
    const onError = jest.fn();

    act(() => {
      result.current.mutate('alert-1', { onSuccess, onError });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle error via mutate callbacks', async () => {
    (queries.deleteAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createTestWrapper(),
    });

    const onSuccess = jest.fn();
    const onError = jest.fn();

    act(() => {
      result.current.mutate('alert-1', { onSuccess, onError });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(onError).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('useAlertEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should fetch alert events', async () => {
    (queries.getAlertEvents as jest.Mock).mockResolvedValue([mockAlertEvent]);

    const { result } = renderHook(() => useAlertEvents(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
  });
});

describe('useAcknowledgeAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should acknowledge alert event', async () => {
    const acknowledgedEvent = { ...mockAlertEvent, acknowledged_at: new Date().toISOString() };
    (queries.acknowledgeAlertEvent as jest.Mock).mockResolvedValue(acknowledgedEvent);

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createTestWrapper(),
    });

    let response: { event: typeof mockAlertEvent | null; error: Error | null };
    await act(async () => {
      response = await result.current.acknowledge('event-1');
    });

    expect(response!.event?.acknowledged_at).toBeDefined();
  });

  it('should handle acknowledge error', async () => {
    (queries.acknowledgeAlertEvent as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createTestWrapper(),
    });

    let response: { event: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.acknowledge('event-1');
    });

    expect(response!.error?.message).toBe(alertErrorKeys.acknowledgeFailed);
  });
});

describe('useBatchAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should perform batch operation', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        processed: 3,
        succeeded: 3,
        failed: 0,
        successIds: ['1', '2', '3'],
        failedIds: [],
      },
    });

    const { result } = renderHook(() => useBatchAlerts(), {
      wrapper: createTestWrapper(),
    });

    let response: { result: { succeeded: number } | null; error: Error | null };
    await act(async () => {
      response = await result.current.batchOperation('enable', ['1', '2', '3']);
    });

    expect(response!.result?.succeeded).toBe(3);
  });

  it('should return error for empty alert ids', async () => {
    const { result } = renderHook(() => useBatchAlerts(), {
      wrapper: createTestWrapper(),
    });

    let response: { result: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.batchOperation('enable', []);
    });

    expect(response!.error).toBeTruthy();
    expect(response!.error?.message).toBe('No alerts selected');
  });

  it('should track isProcessing state', async () => {
    let resolveBatch: (value: {
      data: {
        processed: number;
        succeeded: number;
        failed: number;
        successIds: string[];
        failedIds: string[];
      };
    }) => void;
    const batchPromise = new Promise<{
      data: {
        processed: number;
        succeeded: number;
        failed: number;
        successIds: string[];
        failedIds: string[];
      };
    }>((resolve) => {
      resolveBatch = resolve;
    });
    (apiClient.post as jest.Mock).mockReturnValue(batchPromise);

    const { result } = renderHook(() => useBatchAlerts(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isProcessing).toBe(false);

    let operationPromise: Promise<{
      result: {
        processed: number;
        succeeded: number;
        failed: number;
        successIds: string[];
        failedIds: string[];
      } | null;
      error: Error | null;
    }>;
    act(() => {
      operationPromise = result.current.batchOperation('enable', ['1']);
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    resolveBatch!({
      data: { processed: 1, succeeded: 1, failed: 0, successIds: ['1'], failedIds: [] },
    });
    await act(async () => {
      await operationPromise!;
    });

    expect(result.current.isProcessing).toBe(false);
  });
});
