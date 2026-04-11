import { act, renderHook } from '@testing-library/react';

import { useRealtimeStore } from '../realtimeStore';

import type {
  PriceUpdatePayload,
  AlertEventPayload,
  SnapshotChangePayload,
  FavoriteChangePayload,
} from '@/lib/supabase/realtime';

const mockPricePayload: PriceUpdatePayload = {
  eventType: 'UPDATE',
  new: {
    id: '1',
    provider: 'chainlink',
    symbol: 'BTC',
    chain: 'ethereum',
    price: 68000,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.98,
  },
  old: {},
  schema: 'public',
  table: 'price_records',
  commit_timestamp: new Date().toISOString(),
};

const mockAlertPayload: AlertEventPayload = {
  eventType: 'INSERT',
  new: {
    id: '1',
    user_id: 'user-123',
    alert_type: 'price_threshold',
    message: 'BTC price alert',
    created_at: new Date().toISOString(),
  },
  old: {},
  schema: 'public',
  table: 'alert_events',
  commit_timestamp: new Date().toISOString(),
};

const mockSnapshotPayload: SnapshotChangePayload = {
  eventType: 'UPDATE',
  new: {
    id: '1',
    user_id: 'user-123',
    name: 'My Snapshot',
    created_at: new Date().toISOString(),
  },
  old: {},
  schema: 'public',
  table: 'user_snapshots',
  commit_timestamp: new Date().toISOString(),
};

const mockFavoritePayload: FavoriteChangePayload = {
  eventType: 'INSERT',
  new: {
    id: '1',
    user_id: 'user-123',
    symbol: 'BTC',
    created_at: new Date().toISOString(),
  },
  old: {},
  schema: 'public',
  table: 'user_favorites',
  commit_timestamp: new Date().toISOString(),
};

jest.mock('@/lib/supabase/realtime', () => ({
  realtimeManager: {
    getConnectionStatus: jest.fn(() => 'disconnected'),
    subscribeToPriceUpdates: jest.fn(() => jest.fn()),
    subscribeToAlertEvents: jest.fn(() => jest.fn()),
    subscribeToSnapshotChanges: jest.fn(() => jest.fn()),
    subscribeToFavoriteChanges: jest.fn(() => jest.fn()),
    reconnect: jest.fn(),
  },
}));

import { realtimeManager } from '@/lib/supabase/realtime';

describe('realtimeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useRealtimeStore.setState({
      connectionStatus: 'disconnected',
      activeSubscriptions: [],
      lastPriceUpdate: null,
      lastAlertEvent: null,
      lastSnapshotChange: null,
      lastFavoriteChange: null,
      priceUpdateCount: 0,
      alertEventCount: 0,
      reconnectAttempts: 0,
      userId: null,
      _initialized: false,
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useRealtimeStore.getState();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.activeSubscriptions).toEqual([]);
      expect(state.lastPriceUpdate).toBeNull();
      expect(state.lastAlertEvent).toBeNull();
      expect(state.lastSnapshotChange).toBeNull();
      expect(state.lastFavoriteChange).toBeNull();
      expect(state.priceUpdateCount).toBe(0);
      expect(state.alertEventCount).toBe(0);
      expect(state.reconnectAttempts).toBe(0);
      expect(state.userId).toBeNull();
      expect(state._initialized).toBe(false);
    });
  });

  describe('WebSocket 连接状态', () => {
    it('应该能够设置连接状态为 connecting', () => {
      act(() => {
        useRealtimeStore.getState().setConnectionStatus('connecting');
      });

      expect(useRealtimeStore.getState().connectionStatus).toBe('connecting');
    });

    it('应该能够设置连接状态为 connected', () => {
      act(() => {
        useRealtimeStore.getState().setConnectionStatus('connected');
      });

      expect(useRealtimeStore.getState().connectionStatus).toBe('connected');
    });

    it('应该能够设置连接状态为 disconnected', () => {
      act(() => {
        useRealtimeStore.getState().setConnectionStatus('connected');
      });

      act(() => {
        useRealtimeStore.getState().setConnectionStatus('disconnected');
      });

      expect(useRealtimeStore.getState().connectionStatus).toBe('disconnected');
    });

    it('应该能够设置连接状态为 error', () => {
      act(() => {
        useRealtimeStore.getState().setConnectionStatus('error');
      });

      expect(useRealtimeStore.getState().connectionStatus).toBe('error');
    });

    it('连接成功后应该重置重连尝试次数', () => {
      useRealtimeStore.setState({ reconnectAttempts: 3 });

      act(() => {
        useRealtimeStore.getState().setConnectionStatus('connected');
      });

      expect(useRealtimeStore.getState().reconnectAttempts).toBe(0);
    });

    it('从非连接状态变为连接状态时应该重置重连次数', () => {
      useRealtimeStore.setState({
        connectionStatus: 'connecting',
        reconnectAttempts: 5,
      });

      act(() => {
        useRealtimeStore.getState().setConnectionStatus('connected');
      });

      expect(useRealtimeStore.getState().reconnectAttempts).toBe(0);
    });

    it('连接状态不变时不应该重置重连次数', () => {
      useRealtimeStore.setState({
        connectionStatus: 'connected',
        reconnectAttempts: 3,
      });

      act(() => {
        useRealtimeStore.getState().setConnectionStatus('connected');
      });

      expect(useRealtimeStore.getState().reconnectAttempts).toBe(3);
    });
  });

  describe('数据订阅管理', () => {
    it('setActiveSubscriptions 应该更新活动订阅列表', () => {
      const subscriptions = ['price_updates', 'alert_events'];

      act(() => {
        useRealtimeStore.getState().setActiveSubscriptions(subscriptions);
      });

      expect(useRealtimeStore.getState().activeSubscriptions).toEqual(subscriptions);
    });

    it('setUserId 应该更新用户 ID', () => {
      act(() => {
        useRealtimeStore.getState().setUserId('user-123');
      });

      expect(useRealtimeStore.getState().userId).toBe('user-123');
    });

    it('setUserId 应该能够设置为 null', () => {
      useRealtimeStore.setState({ userId: 'user-123' });

      act(() => {
        useRealtimeStore.getState().setUserId(null);
      });

      expect(useRealtimeStore.getState().userId).toBeNull();
    });
  });

  describe('价格更新订阅', () => {
    it('subscribeToPriceUpdates 应该调用 realtimeManager', () => {
      const unsubscribe = jest.fn();
      (realtimeManager.subscribeToPriceUpdates as jest.Mock).mockReturnValue(unsubscribe);

      const result = useRealtimeStore.getState().subscribeToPriceUpdates();

      expect(realtimeManager.subscribeToPriceUpdates).toHaveBeenCalled();
      expect(typeof result).toBe('function');
    });

    it('subscribeToPriceUpdates 应该传递过滤器参数', () => {
      const unsubscribe = jest.fn();
      (realtimeManager.subscribeToPriceUpdates as jest.Mock).mockReturnValue(unsubscribe);

      const filters = { provider: 'chainlink', symbol: 'BTC' };
      useRealtimeStore.getState().subscribeToPriceUpdates(undefined, filters);

      expect(realtimeManager.subscribeToPriceUpdates).toHaveBeenCalledWith(
        expect.any(Function),
        filters
      );
    });

    it('价格更新应该更新状态和计数', () => {
      let priceCallback: (payload: PriceUpdatePayload) => void = () => {};
      (realtimeManager.subscribeToPriceUpdates as jest.Mock).mockImplementation(
        (callback: (payload: PriceUpdatePayload) => void) => {
          priceCallback = callback;
          return jest.fn();
        }
      );

      useRealtimeStore.getState().subscribeToPriceUpdates();

      act(() => {
        priceCallback(mockPricePayload);
      });

      const state = useRealtimeStore.getState();
      expect(state.lastPriceUpdate).toEqual(mockPricePayload);
      expect(state.priceUpdateCount).toBe(1);
    });

    it('价格更新应该调用自定义回调', () => {
      let priceCallback: (payload: PriceUpdatePayload) => void = () => {};
      (realtimeManager.subscribeToPriceUpdates as jest.Mock).mockImplementation(
        (callback: (payload: PriceUpdatePayload) => void) => {
          priceCallback = callback;
          return jest.fn();
        }
      );

      const customCallback = jest.fn();
      useRealtimeStore.getState().subscribeToPriceUpdates(customCallback);

      act(() => {
        priceCallback(mockPricePayload);
      });

      expect(customCallback).toHaveBeenCalledWith(mockPricePayload);
    });

    it('取消订阅应该返回清理函数', () => {
      const unsubscribe = jest.fn();
      (realtimeManager.subscribeToPriceUpdates as jest.Mock).mockReturnValue(unsubscribe);

      const cleanup = useRealtimeStore.getState().subscribeToPriceUpdates();

      cleanup();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('告警事件订阅', () => {
    it('subscribeToAlertEvents 应该调用 realtimeManager', () => {
      const unsubscribe = jest.fn();
      (realtimeManager.subscribeToAlertEvents as jest.Mock).mockReturnValue(unsubscribe);

      const result = useRealtimeStore.getState().subscribeToAlertEvents('user-123');

      expect(realtimeManager.subscribeToAlertEvents).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(typeof result).toBe('function');
    });

    it('告警事件应该更新状态和计数', () => {
      let alertCallback: (payload: AlertEventPayload) => void = () => {};
      (realtimeManager.subscribeToAlertEvents as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: AlertEventPayload) => void) => {
          alertCallback = callback;
          return jest.fn();
        }
      );

      useRealtimeStore.getState().subscribeToAlertEvents('user-123');

      act(() => {
        alertCallback(mockAlertPayload);
      });

      const state = useRealtimeStore.getState();
      expect(state.lastAlertEvent).toEqual(mockAlertPayload);
      expect(state.alertEventCount).toBe(1);
    });

    it('告警事件应该调用自定义回调', () => {
      let alertCallback: (payload: AlertEventPayload) => void = () => {};
      (realtimeManager.subscribeToAlertEvents as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: AlertEventPayload) => void) => {
          alertCallback = callback;
          return jest.fn();
        }
      );

      const customCallback = jest.fn();
      useRealtimeStore.getState().subscribeToAlertEvents('user-123', customCallback);

      act(() => {
        alertCallback(mockAlertPayload);
      });

      expect(customCallback).toHaveBeenCalledWith(mockAlertPayload);
    });
  });

  describe('快照变更订阅', () => {
    it('subscribeToSnapshotChanges 应该调用 realtimeManager', () => {
      const unsubscribe = jest.fn();
      (realtimeManager.subscribeToSnapshotChanges as jest.Mock).mockReturnValue(unsubscribe);

      const result = useRealtimeStore.getState().subscribeToSnapshotChanges('user-123');

      expect(realtimeManager.subscribeToSnapshotChanges).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(typeof result).toBe('function');
    });

    it('快照变更应该更新状态', () => {
      let snapshotCallback: (payload: SnapshotChangePayload) => void = () => {};
      (realtimeManager.subscribeToSnapshotChanges as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: SnapshotChangePayload) => void) => {
          snapshotCallback = callback;
          return jest.fn();
        }
      );

      useRealtimeStore.getState().subscribeToSnapshotChanges('user-123');

      act(() => {
        snapshotCallback(mockSnapshotPayload);
      });

      expect(useRealtimeStore.getState().lastSnapshotChange).toEqual(mockSnapshotPayload);
    });

    it('快照变更应该调用自定义回调', () => {
      let snapshotCallback: (payload: SnapshotChangePayload) => void = () => {};
      (realtimeManager.subscribeToSnapshotChanges as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: SnapshotChangePayload) => void) => {
          snapshotCallback = callback;
          return jest.fn();
        }
      );

      const customCallback = jest.fn();
      useRealtimeStore.getState().subscribeToSnapshotChanges('user-123', customCallback);

      act(() => {
        snapshotCallback(mockSnapshotPayload);
      });

      expect(customCallback).toHaveBeenCalledWith(mockSnapshotPayload);
    });
  });

  describe('收藏变更订阅', () => {
    it('subscribeToFavoriteChanges 应该调用 realtimeManager', () => {
      const unsubscribe = jest.fn();
      (realtimeManager.subscribeToFavoriteChanges as jest.Mock).mockReturnValue(unsubscribe);

      const result = useRealtimeStore.getState().subscribeToFavoriteChanges('user-123');

      expect(realtimeManager.subscribeToFavoriteChanges).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(typeof result).toBe('function');
    });

    it('收藏变更应该更新状态', () => {
      let favoriteCallback: (payload: FavoriteChangePayload) => void = () => {};
      (realtimeManager.subscribeToFavoriteChanges as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: FavoriteChangePayload) => void) => {
          favoriteCallback = callback;
          return jest.fn();
        }
      );

      useRealtimeStore.getState().subscribeToFavoriteChanges('user-123');

      act(() => {
        favoriteCallback(mockFavoritePayload);
      });

      expect(useRealtimeStore.getState().lastFavoriteChange).toEqual(mockFavoritePayload);
    });

    it('收藏变更应该调用自定义回调', () => {
      let favoriteCallback: (payload: FavoriteChangePayload) => void = () => {};
      (realtimeManager.subscribeToFavoriteChanges as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: FavoriteChangePayload) => void) => {
          favoriteCallback = callback;
          return jest.fn();
        }
      );

      const customCallback = jest.fn();
      useRealtimeStore.getState().subscribeToFavoriteChanges('user-123', customCallback);

      act(() => {
        favoriteCallback(mockFavoritePayload);
      });

      expect(customCallback).toHaveBeenCalledWith(mockFavoritePayload);
    });
  });

  describe('重连功能', () => {
    it('reconnect 应该调用 realtimeManager.reconnect', () => {
      act(() => {
        useRealtimeStore.getState().reconnect();
      });

      expect(realtimeManager.reconnect).toHaveBeenCalled();
    });

    it('reconnect 应该增加重连尝试次数', () => {
      expect(useRealtimeStore.getState().reconnectAttempts).toBe(0);

      act(() => {
        useRealtimeStore.getState().reconnect();
      });

      expect(useRealtimeStore.getState().reconnectAttempts).toBe(1);

      act(() => {
        useRealtimeStore.getState().reconnect();
      });

      expect(useRealtimeStore.getState().reconnectAttempts).toBe(2);
    });
  });

  describe('重置功能', () => {
    it('reset 应该重置所有状态到初始值', () => {
      useRealtimeStore.setState({
        connectionStatus: 'connected',
        activeSubscriptions: ['price_updates'],
        lastPriceUpdate: mockPricePayload,
        lastAlertEvent: mockAlertPayload,
        lastSnapshotChange: mockSnapshotPayload,
        lastFavoriteChange: mockFavoritePayload,
        priceUpdateCount: 10,
        alertEventCount: 5,
        reconnectAttempts: 3,
        userId: 'user-123',
        _initialized: true,
      });

      act(() => {
        useRealtimeStore.getState().reset();
      });

      const state = useRealtimeStore.getState();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.activeSubscriptions).toEqual([]);
      expect(state.lastPriceUpdate).toBeNull();
      expect(state.lastAlertEvent).toBeNull();
      expect(state.lastSnapshotChange).toBeNull();
      expect(state.lastFavoriteChange).toBeNull();
      expect(state.priceUpdateCount).toBe(0);
      expect(state.alertEventCount).toBe(0);
      expect(state.reconnectAttempts).toBe(0);
      expect(state.userId).toBeNull();
      expect(state._initialized).toBe(false);
    });
  });

  describe('初始化功能', () => {
    it('_initialize 应该设置 _initialized 为 true', () => {
      expect(useRealtimeStore.getState()._initialized).toBe(false);

      act(() => {
        useRealtimeStore.getState()._initialize();
      });

      expect(useRealtimeStore.getState()._initialized).toBe(true);
    });

    it('_initialize 不应该重复初始化', () => {
      act(() => {
        useRealtimeStore.getState()._initialize();
      });

      const firstState = useRealtimeStore.getState()._initialized;

      act(() => {
        useRealtimeStore.getState()._initialize();
      });

      expect(useRealtimeStore.getState()._initialized).toBe(firstState);
    });
  });

  describe('多次更新测试', () => {
    it('应该正确累加价格更新计数', () => {
      let priceCallback: (payload: PriceUpdatePayload) => void = () => {};
      (realtimeManager.subscribeToPriceUpdates as jest.Mock).mockImplementation(
        (callback: (payload: PriceUpdatePayload) => void) => {
          priceCallback = callback;
          return jest.fn();
        }
      );

      useRealtimeStore.getState().subscribeToPriceUpdates();

      for (let i = 0; i < 5; i++) {
        act(() => {
          priceCallback(mockPricePayload);
        });
      }

      expect(useRealtimeStore.getState().priceUpdateCount).toBe(5);
    });

    it('应该正确累加告警事件计数', () => {
      let alertCallback: (payload: AlertEventPayload) => void = () => {};
      (realtimeManager.subscribeToAlertEvents as jest.Mock).mockImplementation(
        (_userId: string, callback: (payload: AlertEventPayload) => void) => {
          alertCallback = callback;
          return jest.fn();
        }
      );

      useRealtimeStore.getState().subscribeToAlertEvents('user-123');

      for (let i = 0; i < 3; i++) {
        act(() => {
          alertCallback(mockAlertPayload);
        });
      }

      expect(useRealtimeStore.getState().alertEventCount).toBe(3);
    });
  });

  describe('Hooks 测试', () => {
    it('useConnectionStatus hook 应该返回连接状态', () => {
      const { result } = renderHook(() => useRealtimeStore((state) => state.connectionStatus));
      expect(result.current).toBe('disconnected');
    });

    it('useActiveSubscriptions hook 应该返回活动订阅列表', () => {
      const { result } = renderHook(() => useRealtimeStore((state) => state.activeSubscriptions));
      expect(result.current).toEqual([]);
    });

    it('useLastPriceUpdate hook 应该返回最后的价格更新', () => {
      const { result } = renderHook(() => useRealtimeStore((state) => state.lastPriceUpdate));
      expect(result.current).toBeNull();
    });

    it('useLastAlertEvent hook 应该返回最后的告警事件', () => {
      const { result } = renderHook(() => useRealtimeStore((state) => state.lastAlertEvent));
      expect(result.current).toBeNull();
    });

    it('usePriceUpdateCount hook 应该返回价格更新计数', () => {
      const { result } = renderHook(() => useRealtimeStore((state) => state.priceUpdateCount));
      expect(result.current).toBe(0);
    });

    it('useReconnectAttempts hook 应该返回重连尝试次数', () => {
      const { result } = renderHook(() => useRealtimeStore((state) => state.reconnectAttempts));
      expect(result.current).toBe(0);
    });

    it('useIsConnected hook 应该在未连接时返回 false', () => {
      const { result } = renderHook(() =>
        useRealtimeStore((state) => state.connectionStatus === 'connected')
      );
      expect(result.current).toBe(false);
    });

    it('useIsConnected hook 应该在已连接时返回 true', () => {
      useRealtimeStore.setState({ connectionStatus: 'connected' });

      const { result } = renderHook(() =>
        useRealtimeStore((state) => state.connectionStatus === 'connected')
      );
      expect(result.current).toBe(true);
    });
  });
});
