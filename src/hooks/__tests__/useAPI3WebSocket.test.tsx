import { renderHook, act, waitFor } from '@testing-library/react';

import { getAPI3WebSocketService, type API3PriceData } from '@/lib/services/api3WebSocket';

import { useAPI3Price, type API3ConnectionStatus } from '../api3/useAPI3WebSocket';

jest.mock('@/lib/services/api3WebSocket', () => ({
  getAPI3WebSocketService: jest.fn(),
}));

const mockPriceData: API3PriceData = {
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  confidence: 0.98,
  source: 'api3',
};

function createMockService() {
  const statusListeners: Array<(status: API3ConnectionStatus) => void> = [];
  const priceListeners: Map<string, Array<(data: API3PriceData) => void>> = new Map();

  return {
    getStatus: jest.fn(() => 'disconnected'),
    connect: jest.fn(),
    reconnect: jest.fn(),
    onStatusChange: jest.fn((callback) => {
      statusListeners.push(callback);
      return () => {
        const index = statusListeners.indexOf(callback);
        if (index > -1) statusListeners.splice(index, 1);
      };
    }),
    subscribePrice: jest.fn((symbol, callback) => {
      if (!priceListeners.has(symbol)) {
        priceListeners.set(symbol, []);
      }
      priceListeners.get(symbol)!.push(callback);
      return () => {
        const listeners = priceListeners.get(symbol);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index > -1) listeners.splice(index, 1);
        }
      };
    }),
    _simulateStatusChange: (status: API3ConnectionStatus) => {
      statusListeners.forEach((cb) => cb(status));
    },
    _simulatePriceUpdate: (symbol: string, data: API3PriceData) => {
      const listeners = priceListeners.get(symbol);
      if (listeners) {
        listeners.forEach((cb) => cb(data));
      }
    },
  };
}

describe('useAPI3Price', () => {
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    (getAPI3WebSocketService as jest.Mock).mockReturnValue(mockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    expect(result.current.status).toBe('disconnected');
    expect(result.current.priceData).toBeNull();
    expect(result.current.lastUpdate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should connect when enabled', () => {
    renderHook(() => useAPI3Price({ symbol: 'BTC', enabled: true }));

    expect(mockService.connect).toHaveBeenCalled();
    expect(mockService.subscribePrice).toHaveBeenCalledWith('BTC', expect.any(Function));
  });

  it('should not connect when disabled', () => {
    renderHook(() => useAPI3Price({ symbol: 'BTC', enabled: false }));

    expect(mockService.connect).not.toHaveBeenCalled();
    expect(mockService.subscribePrice).not.toHaveBeenCalled();
  });

  it('should update price data on price update', async () => {
    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    act(() => {
      mockService._simulatePriceUpdate('BTC', mockPriceData);
    });

    expect(result.current.priceData).toEqual(mockPriceData);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
    expect(result.current.error).toBeNull();
  });

  it('should update connection status', async () => {
    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    act(() => {
      mockService._simulateStatusChange('connecting');
    });

    expect(result.current.status).toBe('connecting');

    act(() => {
      mockService._simulateStatusChange('connected');
    });

    expect(result.current.status).toBe('connected');
  });

  it('should call onPriceUpdate callback', async () => {
    const onPriceUpdate = jest.fn();

    renderHook(() =>
      useAPI3Price({
        symbol: 'BTC',
        onPriceUpdate,
      })
    );

    act(() => {
      mockService._simulatePriceUpdate('BTC', mockPriceData);
    });

    expect(onPriceUpdate).toHaveBeenCalledWith(mockPriceData);
  });

  it('should reconnect when reconnect is called', () => {
    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    act(() => {
      result.current.reconnect();
    });

    expect(mockService.reconnect).toHaveBeenCalled();
  });

  it('should handle updateInterval throttling', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useAPI3Price({
        symbol: 'BTC',
        updateInterval: 1000,
      })
    );

    act(() => {
      mockService._simulatePriceUpdate('BTC', mockPriceData);
    });

    expect(result.current.priceData).toEqual(mockPriceData);

    const secondPriceData = { ...mockPriceData, price: 69000 };

    act(() => {
      mockService._simulatePriceUpdate('BTC', secondPriceData);
    });

    expect(result.current.priceData).toEqual(mockPriceData);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.priceData).toEqual(secondPriceData);

    jest.useRealTimers();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    unmount();

    expect(mockService.subscribePrice).toHaveBeenCalled();
  });

  it('should not subscribe without symbol', () => {
    renderHook(() => useAPI3Price({ symbol: '', enabled: true }));

    expect(mockService.subscribePrice).not.toHaveBeenCalled();
  });

  it('should handle status changes through all states', async () => {
    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    const statuses: API3ConnectionStatus[] = [
      'connecting',
      'connected',
      'disconnected',
      'reconnecting',
      'error',
    ];

    for (const status of statuses) {
      act(() => {
        mockService._simulateStatusChange(status);
      });

      expect(result.current.status).toBe(status);
    }
  });

  it('should handle multiple price updates', async () => {
    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }));

    for (let i = 0; i < 5; i++) {
      const priceData = { ...mockPriceData, price: 68000 + i * 100 };

      act(() => {
        mockService._simulatePriceUpdate('BTC', priceData);
      });

      expect(result.current.priceData).toEqual(priceData);
    }
  });
});
