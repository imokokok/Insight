import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { apiClient } from '@/lib/api';
import { useUser } from '@/stores/authStore';

import {
  useAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAlertEvents,
  useAcknowledgeAlert,
  useBatchAlerts,
} from '../data/useAlerts';

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    removeChannel: jest.fn(),
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
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { alerts: [mockAlert], count: 1 },
    });

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].name).toBe('BTC Alert');
    expect(apiClient.get).toHaveBeenCalledWith('/api/alerts');
  });

  it('should handle fetch error', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Fetch error'));

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch alerts', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { alerts: [mockAlert], count: 1 },
    });

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);
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
    expect(thrownError?.message).toBe('User not logged in');
  });

  it('should create alert successfully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { alert: mockAlert, message: 'Alert created' },
    });

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
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/alerts',
      expect.objectContaining({
        name: 'BTC Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      })
    );
  });

  it('should throw error on create failure', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Failed to create alert'));

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
  });

  it('should track isPending state', async () => {
    let resolveCreate: (value: { data: { alert: typeof mockAlert; message: string } }) => void;
    const createPromise = new Promise<{ data: { alert: typeof mockAlert; message: string } }>(
      (resolve) => {
        resolveCreate = resolve;
      }
    );
    (apiClient.post as jest.Mock).mockReturnValue(createPromise);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({
        name: 'BTC Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveCreate!({ data: { alert: mockAlert, message: 'Alert created' } });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutate with callbacks', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { alert: mockAlert, message: 'Alert created' },
    });

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
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Create failed'));

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
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { alert: updatedAlert, message: 'Alert updated' },
    });

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
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/alerts/alert-1',
      expect.objectContaining({
        target_value: 55000,
      })
    );
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createTestWrapper(),
    });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.updateAlert('alert-1', { target_value: 55000 });
      } catch (err) {
        thrownError = err as Error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError?.message).toBe('User not logged in');
  });

  it('should use mutate with callbacks', async () => {
    const updatedAlert = { ...mockAlert, target_value: 55000 };
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { alert: updatedAlert, message: 'Alert updated' },
    });

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
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: { message: 'Alert deleted' },
    });

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createTestWrapper(),
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteAlert('alert-1');
    });

    expect(success).toBe(true);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/alerts/alert-1');
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

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
    expect(thrownError?.message).toBe('User not logged in');
  });

  it('should use mutate with callbacks', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: { message: 'Alert deleted' },
    });

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
    (apiClient.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

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
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { events: [mockAlertEvent], count: 1 },
    });

    const { result } = renderHook(() => useAlertEvents(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/alerts/events');
  });
});

describe('useAcknowledgeAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  it('should acknowledge alert event', async () => {
    const acknowledgedEvent = { ...mockAlertEvent, acknowledged_at: new Date().toISOString() };
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { event: acknowledgedEvent, message: 'Event acknowledged' },
    });

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createTestWrapper(),
    });

    let response: { event: typeof mockAlertEvent | null; error: Error | null };
    await act(async () => {
      response = await result.current.acknowledge('event-1');
    });

    expect(response!.event?.acknowledged_at).toBeDefined();
    expect(apiClient.post).toHaveBeenCalledWith('/api/alerts/events/event-1/acknowledge', {});
  });

  it('should handle acknowledge error', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Failed to acknowledge alert'));

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createTestWrapper(),
    });

    let response: { event: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.acknowledge('event-1');
    });

    expect(response!.error).toBeTruthy();
  });

  it('should track isAcknowledging state', async () => {
    let resolveAcknowledge: (value: {
      data: { event: typeof mockAlertEvent; message: string };
    }) => void;
    const acknowledgePromise = new Promise<{
      data: { event: typeof mockAlertEvent; message: string };
    }>((resolve) => {
      resolveAcknowledge = resolve;
    });
    (apiClient.post as jest.Mock).mockReturnValue(acknowledgePromise);

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isAcknowledging).toBe(false);

    act(() => {
      result.current.acknowledge('event-1');
    });

    await waitFor(() => {
      expect(result.current.isAcknowledging).toBe(true);
    });

    resolveAcknowledge!({
      data: {
        event: { ...mockAlertEvent, acknowledged_at: new Date().toISOString() },
        message: 'Event acknowledged',
      },
    });

    await waitFor(() => {
      expect(result.current.isAcknowledging).toBe(false);
    });
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
        message: 'Batch operation completed',
        results: {
          processed: 3,
          succeeded: 3,
          failed: 0,
          successIds: ['1', '2', '3'],
          failedIds: [],
        },
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
    expect(apiClient.post).toHaveBeenCalledWith('/api/alerts/batch', {
      action: 'enable',
      alertIds: ['1', '2', '3'],
    });
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
        message: string;
        results: {
          processed: number;
          succeeded: number;
          failed: number;
          successIds: string[];
          failedIds: string[];
        };
      };
    }) => void;
    const batchPromise = new Promise<{
      data: {
        message: string;
        results: {
          processed: number;
          succeeded: number;
          failed: number;
          successIds: string[];
          failedIds: string[];
        };
      };
    }>((resolve) => {
      resolveBatch = resolve;
    });
    (apiClient.post as jest.Mock).mockReturnValue(batchPromise);

    const { result } = renderHook(() => useBatchAlerts(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isProcessing).toBe(false);

    act(() => {
      result.current.batchOperation('enable', ['1']);
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    resolveBatch!({
      data: {
        message: 'Done',
        results: { processed: 1, succeeded: 1, failed: 0, successIds: ['1'], failedIds: [] },
      },
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
