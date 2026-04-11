import { renderHook, act } from '@testing-library/react';

import {
  useWebSocket,
  usePriceWebSocket,
  useAlertWebSocket,
  useNetworkStatsWebSocket,
  createWebSocketUrl,
  isWebSocketSupported,
  getWebSocketStatusText,
  getWebSocketStatusColor,
} from '../realtime/useWebSocket';

jest.mock('@/lib/realtime/WebSocketManager', () => ({
  createWebSocketManager: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    send: jest.fn(),
    onStatusChange: jest.fn((callback) => {
      callback('connected');
      return jest.fn();
    }),
    getStats: jest.fn(() => ({
      connectionCount: 1,
      reconnectionCount: 0,
      messageCount: 0,
      errorCount: 0,
      lastConnectedAt: new Date(),
      lastDisconnectedAt: null,
      totalUptime: 1000,
      averageLatency: 50,
    })),
  })),
  releaseWebSocketManager: jest.fn(),
}));

describe('useWebSocket', () => {
  const defaultOptions = {
    url: 'wss://test.example.com',
    autoConnect: false,
  };

  it('should initialize with correct status', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should return connection status flags', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(typeof result.current.isConnected).toBe('boolean');
    expect(typeof result.current.isConnecting).toBe('boolean');
    expect(typeof result.current.isReconnecting).toBe('boolean');
  });

  it('should provide connect method', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(typeof result.current.connect).toBe('function');

    act(() => {
      result.current.connect();
    });
  });

  it('should provide disconnect method', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(typeof result.current.disconnect).toBe('function');

    act(() => {
      result.current.disconnect();
    });
  });

  it('should provide reconnect method', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(typeof result.current.reconnect).toBe('function');

    act(() => {
      result.current.reconnect();
    });
  });

  it('should provide subscribe method', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(typeof result.current.subscribe).toBe('function');
  });

  it('should provide send method', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(typeof result.current.send).toBe('function');

    act(() => {
      result.current.send({ type: 'test' });
    });
  });

  it('should return stats', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.connectionCount).toBe(1);
  });

  it('should return lastMessage and lastUpdated', () => {
    const { result } = renderHook(() => useWebSocket(defaultOptions));

    expect(result.current.lastMessage).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });
});

describe('usePriceWebSocket', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://test.example.com';
  });

  it('should initialize with empty prices map', () => {
    const { result } = renderHook(() =>
      usePriceWebSocket({ symbols: ['BTC', 'ETH'], autoConnect: false })
    );

    expect(result.current.prices.size).toBe(0);
  });

  it('should provide getPrice method', () => {
    const { result } = renderHook(() =>
      usePriceWebSocket({ symbols: ['BTC', 'ETH'], autoConnect: false })
    );

    expect(typeof result.current.getPrice).toBe('function');
    expect(result.current.getPrice('BTC')).toBeUndefined();
  });

  it('should inherit base WebSocket properties', () => {
    const { result } = renderHook(() =>
      usePriceWebSocket({ symbols: ['BTC'], autoConnect: false })
    );

    expect(result.current.status).toBeDefined();
    expect(result.current.connect).toBeDefined();
    expect(result.current.disconnect).toBeDefined();
  });
});

describe('useAlertWebSocket', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://test.example.com';
  });

  it('should initialize with empty alerts array', () => {
    const { result } = renderHook(() => useAlertWebSocket({ autoConnect: false }));

    expect(result.current.alerts).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should provide markAsRead method', () => {
    const { result } = renderHook(() => useAlertWebSocket({ autoConnect: false }));

    expect(typeof result.current.markAsRead).toBe('function');

    act(() => {
      result.current.markAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it('should provide clearAlerts method', () => {
    const { result } = renderHook(() => useAlertWebSocket({ autoConnect: false }));

    expect(typeof result.current.clearAlerts).toBe('function');

    act(() => {
      result.current.clearAlerts();
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should inherit base WebSocket properties', () => {
    const { result } = renderHook(() => useAlertWebSocket({ autoConnect: false }));

    expect(result.current.status).toBeDefined();
    expect(result.current.connect).toBeDefined();
    expect(result.current.disconnect).toBeDefined();
  });
});

describe('useNetworkStatsWebSocket', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://test.example.com';
  });

  it('should initialize with null stats', () => {
    const { result } = renderHook(() => useNetworkStatsWebSocket({ autoConnect: false }));

    expect(result.current.networkStats).toBeNull();
  });

  it('should inherit base WebSocket properties', () => {
    const { result } = renderHook(() => useNetworkStatsWebSocket({ autoConnect: false }));

    expect(result.current.status).toBeDefined();
    expect(result.current.connect).toBeDefined();
    expect(result.current.disconnect).toBeDefined();
  });
});

describe('createWebSocketUrl', () => {
  it('should create URL without params', () => {
    const url = createWebSocketUrl('wss://test.example.com');

    expect(url).toBe('wss://test.example.com/');
  });

  it('should create URL with params', () => {
    const url = createWebSocketUrl('wss://test.example.com', {
      token: 'abc123',
      userId: 'user1',
    });

    expect(url).toContain('token=abc123');
    expect(url).toContain('userId=user1');
  });
});

describe('isWebSocketSupported', () => {
  it('should return true when WebSocket is available', () => {
    expect(isWebSocketSupported()).toBe(true);
  });
});

describe('getWebSocketStatusText', () => {
  it('should return correct text for connecting', () => {
    expect(getWebSocketStatusText('connecting')).toBe('Connecting');
  });

  it('should return correct text for connected', () => {
    expect(getWebSocketStatusText('connected')).toBe('Connected');
  });

  it('should return correct text for disconnected', () => {
    expect(getWebSocketStatusText('disconnected')).toBe('Disconnected');
  });

  it('should return correct text for reconnecting', () => {
    expect(getWebSocketStatusText('reconnecting')).toBe('Reconnecting');
  });

  it('should return correct text for error', () => {
    expect(getWebSocketStatusText('error')).toBe('Error');
  });
});

describe('getWebSocketStatusColor', () => {
  it('should return yellow for connecting', () => {
    expect(getWebSocketStatusColor('connecting')).toBe('yellow');
  });

  it('should return green for connected', () => {
    expect(getWebSocketStatusColor('connected')).toBe('green');
  });

  it('should return gray for disconnected', () => {
    expect(getWebSocketStatusColor('disconnected')).toBe('gray');
  });

  it('should return orange for reconnecting', () => {
    expect(getWebSocketStatusColor('reconnecting')).toBe('orange');
  });

  it('should return red for error', () => {
    expect(getWebSocketStatusColor('error')).toBe('red');
  });
});
