import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';

import type { AlertEventPayload } from '@/lib/supabase/realtime';
import { useUser } from '@/stores/authStore';
import { useConnectionStatus, useRealtimeActions } from '@/stores/realtimeStore';

import { useRealtimeAlerts, useAlertNotifications, type RealtimeAlertNotification } from '../data/useRealtimeAlerts';

jest.mock('@/stores/realtimeStore', () => ({
  useConnectionStatus: jest.fn(),
  useRealtimeActions: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
}));

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
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

describe('useRealtimeAlerts', () => {
  let mockSubscribeToAlertEvents: jest.Mock;
  let alertCallback: ((payload: AlertEventPayload) => void) | null = null;

  beforeEach(() => {
    mockSubscribeToAlertEvents = jest.fn((userId, callback) => {
      alertCallback = callback;
      return jest.fn();
    });

    (useConnectionStatus as jest.Mock).mockReturnValue('connected');
    (useRealtimeActions as jest.Mock).mockReturnValue({
      subscribeToAlertEvents: mockSubscribeToAlertEvents,
    });
    (useUser as jest.Mock).mockReturnValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
    alertCallback = null;
  });

  it('should initialize with empty alerts', () => {
    const { result } = renderHook(() => useRealtimeAlerts(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.lastUpdate).toBeNull();
  });

  it('should subscribe to alert events when enabled', () => {
    renderHook(() => useRealtimeAlerts({ enabled: true }), {
      wrapper: createTestWrapper(),
    });

    expect(mockSubscribeToAlertEvents).toHaveBeenCalledWith(mockUser.id, expect.any(Function));
  });

  it('should not subscribe when disabled', () => {
    renderHook(() => useRealtimeAlerts({ enabled: false }), {
      wrapper: createTestWrapper(),
    });

    expect(mockSubscribeToAlertEvents).not.toHaveBeenCalled();
  });

  it('should not subscribe when user is not logged in', () => {
    (useUser as jest.Mock).mockReturnValue(null);

    renderHook(() => useRealtimeAlerts({ enabled: true }), {
      wrapper: createTestWrapper(),
    });

    expect(mockSubscribeToAlertEvents).not.toHaveBeenCalled();
  });

  it('should add new alert on INSERT event', async () => {
    const { result } = renderHook(() => useRealtimeAlerts(), {
      wrapper: createTestWrapper(),
    });

    const mockPayload: AlertEventPayload = {
      eventType: 'INSERT',
      new: {
        id: 'alert-1',
        alert_id: 'alert-config-1',
        user_id: mockUser.id,
        price: 68000,
        triggered_at: new Date().toISOString(),
        acknowledged: false,
      },
    };

    act(() => {
      alertCallback!(mockPayload);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].price).toBe(68000);
    expect(result.current.alerts[0].isNew).toBe(true);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });

  it('should ignore non-INSERT events', async () => {
    const { result } = renderHook(() => useRealtimeAlerts(), {
      wrapper: createTestWrapper(),
    });

    const mockPayload: AlertEventPayload = {
      eventType: 'UPDATE',
      new: {
        id: 'alert-1',
        alert_id: 'alert-config-1',
        user_id: mockUser.id,
        price: 68000,
        triggered_at: new Date().toISOString(),
        acknowledged: true,
      },
    };

    act(() => {
      alertCallback!(mockPayload);
    });

    expect(result.current.alerts).toHaveLength(0);
  });

  it('should acknowledge alert', async () => {
    const { result } = renderHook(() => useRealtimeAlerts(), {
      wrapper: createTestWrapper(),
    });

    const mockPayload: AlertEventPayload = {
      eventType: 'INSERT',
      new: {
        id: 'alert-1',
        alert_id: 'alert-config-1',
        user_id: mockUser.id,
        price: 68000,
        triggered_at: new Date().toISOString(),
        acknowledged: false,
      },
    };

    act(() => {
      alertCallback!(mockPayload);
    });

    expect(result.current.alerts[0].acknowledged).toBe(false);

    act(() => {
      result.current.acknowledgeAlert('alert-1');
    });

    expect(result.current.alerts[0].acknowledged).toBe(true);
    expect(result.current.alerts[0].isNew).toBe(false);
  });

  it('should clear all alerts', async () => {
    const { result } = renderHook(() => useRealtimeAlerts(), {
      wrapper: createTestWrapper(),
    });

    const mockPayload: AlertEventPayload = {
      eventType: 'INSERT',
      new: {
        id: 'alert-1',
        alert_id: 'alert-config-1',
        user_id: mockUser.id,
        price: 68000,
        triggered_at: new Date().toISOString(),
        acknowledged: false,
      },
    };

    act(() => {
      alertCallback!(mockPayload);
    });

    expect(result.current.alerts).toHaveLength(1);

    act(() => {
      result.current.clearAlerts();
    });

    expect(result.current.alerts).toHaveLength(0);
  });

  it('should call onAlertTriggered callback', async () => {
    const onAlertTriggered = jest.fn();

    renderHook(
      () =>
        useRealtimeAlerts({
          onAlertTriggered,
        }),
      { wrapper: createTestWrapper() }
    );

    const mockPayload: AlertEventPayload = {
      eventType: 'INSERT',
      new: {
        id: 'alert-1',
        alert_id: 'alert-config-1',
        user_id: mockUser.id,
        price: 68000,
        triggered_at: new Date().toISOString(),
        acknowledged: false,
      },
    };

    act(() => {
      alertCallback!(mockPayload);
    });

    expect(onAlertTriggered).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 68000,
      })
    );
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToAlertEvents.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useRealtimeAlerts(), {
      wrapper: createTestWrapper(),
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('useAlertNotifications', () => {
  it('should return correct unread count', () => {
    const alerts = [
      { id: '1', acknowledged: false },
      { id: '2', acknowledged: true },
      { id: '3', acknowledged: false },
    ];

    const { result } = renderHook(() => useAlertNotifications(alerts as unknown as RealtimeAlertNotification[]));

    expect(result.current.unreadCount).toBe(2);
    expect(result.current.hasUnreadAlerts).toBe(true);
  });

  it('should return 0 for empty alerts', () => {
    const { result } = renderHook(() => useAlertNotifications([]));

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.hasUnreadAlerts).toBe(false);
  });

  it('should return 0 for undefined alerts', () => {
    const { result } = renderHook(() => useAlertNotifications(undefined));

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.hasUnreadAlerts).toBe(false);
  });
});
