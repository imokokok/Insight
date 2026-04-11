import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

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
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
      removeChannel: jest.fn(),
    })),
  },
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

import { useUser } from '@/stores/authStore';
import { queries } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

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

describe('useAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('should fetch alerts for logged in user', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.getAlerts as jest.Mock).mockResolvedValue([mockAlert]);

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].name).toBe('BTC Alert');
  });

  it('should handle fetch error', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.getAlerts as jest.Mock).mockRejectedValue(new Error('Fetch error'));

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch alerts', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.getAlerts as jest.Mock).mockResolvedValue([mockAlert]);

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createWrapper(),
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
  });

  it('should return error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createWrapper(),
    });

    let response: { alert: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.createAlert({
        name: 'Test Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    expect(response!.error).toBeTruthy();
    expect(response!.error?.message).toBe(alertErrorKeys.userNotLoggedIn);
  });

  it('should create alert successfully', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.createAlert as jest.Mock).mockResolvedValue(mockAlert);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createWrapper(),
    });

    let response: { alert: typeof mockAlert | null; error: Error | null };
    await act(async () => {
      response = await result.current.createAlert({
        name: 'BTC Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    expect(response!.alert).toEqual(mockAlert);
    expect(response!.error).toBeNull();
  });

  it('should handle create error', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.createAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createWrapper(),
    });

    let response: { alert: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.createAlert({
        name: 'Test Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    expect(response!.error).toBeTruthy();
    expect(response!.error?.message).toBe(alertErrorKeys.createFailed);
  });

  it('should track isCreating state', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.createAlert as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockAlert), 100))
    );

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isCreating).toBe(false);

    const createPromise = act(async () => {
      await result.current.createAlert({
        name: 'BTC Alert',
        symbol: 'BTC/USD',
        condition_type: 'above',
        target_value: 50000,
      });
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });

    await createPromise;

    expect(result.current.isCreating).toBe(false);
  });
});

describe('useUpdateAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update alert successfully', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    const updatedAlert = { ...mockAlert, target_value: 55000 };
    (queries.updateAlert as jest.Mock).mockResolvedValue(updatedAlert);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createWrapper(),
    });

    let response: { alert: typeof mockAlert | null; error: Error | null };
    await act(async () => {
      response = await result.current.updateAlert('alert-1', {
        target_value: 55000,
      });
    });

    expect(response!.alert?.target_value).toBe(55000);
    expect(response!.error).toBeNull();
  });

  it('should handle update error', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.updateAlert as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useUpdateAlert(), {
      wrapper: createWrapper(),
    });

    let response: { alert: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.updateAlert('alert-1', {
        target_value: 55000,
      });
    });

    expect(response!.error).toBeTruthy();
    expect(response!.error?.message).toBe(alertErrorKeys.updateFailed);
  });
});

describe('useDeleteAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete alert successfully', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.deleteAlert as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createWrapper(),
    });

    let response: { success: boolean; error: Error | null };
    await act(async () => {
      response = await result.current.deleteAlert('alert-1');
    });

    expect(response!.success).toBe(true);
    expect(response!.error).toBeNull();
  });

  it('should handle delete error', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.deleteAlert as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useDeleteAlert(), {
      wrapper: createWrapper(),
    });

    let response: { success: boolean; error: Error | null };
    await act(async () => {
      response = await result.current.deleteAlert('alert-1');
    });

    expect(response!.success).toBe(false);
    expect(response!.error?.message).toBe(alertErrorKeys.deleteFailed);
  });
});

describe('useAlertEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch alert events', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.getAlertEvents as jest.Mock).mockResolvedValue([mockAlertEvent]);

    const { result } = renderHook(() => useAlertEvents(), {
      wrapper: createWrapper(),
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
  });

  it('should acknowledge alert event', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    const acknowledgedEvent = { ...mockAlertEvent, acknowledged_at: new Date().toISOString() };
    (queries.acknowledgeAlertEvent as jest.Mock).mockResolvedValue(acknowledgedEvent);

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(),
    });

    let response: { event: typeof mockAlertEvent | null; error: Error | null };
    await act(async () => {
      response = await result.current.acknowledge('event-1');
    });

    expect(response!.event?.acknowledged_at).toBeDefined();
  });

  it('should handle acknowledge error', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (queries.acknowledgeAlertEvent as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(),
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
  });

  it('should perform batch operation', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
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
      wrapper: createWrapper(),
    });

    let response: { result: { succeeded: number } | null; error: Error | null };
    await act(async () => {
      response = await result.current.batchOperation('enable', ['1', '2', '3']);
    });

    expect(response!.result?.succeeded).toBe(3);
  });

  it('should return error for empty alert ids', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);

    const { result } = renderHook(() => useBatchAlerts(), {
      wrapper: createWrapper(),
    });

    let response: { result: unknown; error: Error | null };
    await act(async () => {
      response = await result.current.batchOperation('enable', []);
    });

    expect(response!.error).toBeTruthy();
    expect(response!.error?.message).toBe('No alerts selected');
  });

  it('should track isProcessing state', async () => {
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (apiClient.post as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { processed: 1, succeeded: 1, failed: 0, successIds: ['1'], failedIds: [] },
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useBatchAlerts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isProcessing).toBe(false);

    const promise = act(async () => {
      await result.current.batchOperation('enable', ['1']);
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    await promise;

    expect(result.current.isProcessing).toBe(false);
  });
});
