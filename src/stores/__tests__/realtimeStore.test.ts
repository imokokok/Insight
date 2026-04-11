import { act } from '@testing-library/react';

import type { RealtimePrice, RealtimeSubscription, RealtimeState } from '@/types/realtime';

import { useRealtimeStore } from '../realtimeStore';

const mockPrice: RealtimePrice = {
  symbol: 'BTC',
  provider: 'chainlink',
  price: 50000,
  change24h: 2.5,
  timestamp: Date.now(),
  source: 'ethereum',
};

const mockSubscription: RealtimeSubscription = {
  id: 'sub-1',
  symbol: 'BTC',
  provider: 'chainlink',
  chain: 'ethereum',
  status: 'active',
  createdAt: Date.now(),
};

const mockState: RealtimeState = {
  prices: {},
  subscriptions: [],
  isConnected: false,
  connectionStatus: 'disconnected',
  error: null,
  lastUpdate: null,
  reconnectAttempts: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  useRealtimeStore.setState(mockState);
});

describe('realtimeStore - 初始状态', () => {
  it('应该有正确的初始状态', () => {
    const state = useRealtimeStore.getState();
    expect(state.prices).toEqual({});
    expect(state.subscriptions).toEqual([]);
    expect(state.isConnected).toBe(false);
    expect(state.connectionStatus).toBe('disconnected');
    expect(state.error).toBeNull();
    expect(state.lastUpdate).toBeNull();
    expect(state.reconnectAttempts).toBe(0);
  });
});

describe('realtimeStore - setPrice', () => {
  it('setPrice 应该更新价格数据', () => {
    act(() => {
      useRealtimeStore.getState().setPrice('BTC-chainlink', mockPrice);
    });
    expect(useRealtimeStore.getState().prices['BTC-chainlink']).toEqual(mockPrice);
  });

  it('setPrice 应该保留其他价格数据', () => {
    const existingPrice = { ...mockPrice, symbol: 'ETH', price: 3000 };
    useRealtimeStore.setState({ prices: { 'ETH-chainlink': existingPrice } });

    act(() => {
      useRealtimeStore.getState().setPrice('BTC-chainlink', mockPrice);
    });

    expect(Object.keys(useRealtimeStore.getState().prices)).toHaveLength(2);
  });
});

describe('realtimeStore - setPrices', () => {
  it('setPrices 应该批量更新价格数据', () => {
    const prices = {
      'BTC-chainlink': mockPrice,
      'ETH-chainlink': { ...mockPrice, symbol: 'ETH', price: 3000 },
    };

    act(() => {
      useRealtimeStore.getState().setPrices(prices);
    });

    expect(Object.keys(useRealtimeStore.getState().prices)).toHaveLength(2);
  });

  it('setPrices 应该替换现有价格数据', () => {
    useRealtimeStore.setState({ prices: { 'OLD-key': mockPrice } });

    const newPrices = {
      'BTC-chainlink': mockPrice,
    };

    act(() => {
      useRealtimeStore.getState().setPrices(newPrices);
    });

    expect(useRealtimeStore.getState().prices['OLD-key']).toBeUndefined();
    expect(useRealtimeStore.getState().prices['BTC-chainlink']).toBeDefined();
  });
});

describe('realtimeStore - removePrice', () => {
  it('removePrice 应该删除价格数据', () => {
    useRealtimeStore.setState({ prices: { 'BTC-chainlink': mockPrice } });

    act(() => {
      useRealtimeStore.getState().removePrice('BTC-chainlink');
    });

    expect(useRealtimeStore.getState().prices['BTC-chainlink']).toBeUndefined();
  });

  it('removePrice 不应该影响其他价格数据', () => {
    const ethPrice = { ...mockPrice, symbol: 'ETH' };
    useRealtimeStore.setState({
      prices: { 'BTC-chainlink': mockPrice, 'ETH-chainlink': ethPrice },
    });

    act(() => {
      useRealtimeStore.getState().removePrice('BTC-chainlink');
    });

    expect(useRealtimeStore.getState().prices['ETH-chainlink']).toBeDefined();
  });
});

describe('realtimeStore - clearPrices', () => {
  it('clearPrices 应该清除所有价格数据', () => {
    useRealtimeStore.setState({ prices: { 'BTC-chainlink': mockPrice } });

    act(() => {
      useRealtimeStore.getState().clearPrices();
    });

    expect(Object.keys(useRealtimeStore.getState().prices)).toHaveLength(0);
  });
});

describe('realtimeStore - addSubscription', () => {
  it('addSubscription 应该添加订阅', () => {
    act(() => {
      useRealtimeStore.getState().addSubscription(mockSubscription);
    });

    expect(useRealtimeStore.getState().subscriptions).toHaveLength(1);
    expect(useRealtimeStore.getState().subscriptions[0]).toEqual(mockSubscription);
  });

  it('addSubscription 应该添加到现有列表', () => {
    const existingSub = { ...mockSubscription, id: 'sub-0' };
    useRealtimeStore.setState({ subscriptions: [existingSub] });

    act(() => {
      useRealtimeStore.getState().addSubscription(mockSubscription);
    });

    expect(useRealtimeStore.getState().subscriptions).toHaveLength(2);
  });
});

describe('realtimeStore - removeSubscription', () => {
  it('removeSubscription 应该删除订阅', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    act(() => {
      useRealtimeStore.getState().removeSubscription('sub-1');
    });

    expect(useRealtimeStore.getState().subscriptions).toHaveLength(0);
  });

  it('removeSubscription 不应该影响不存在的订阅', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    act(() => {
      useRealtimeStore.getState().removeSubscription('non-existent');
    });

    expect(useRealtimeStore.getState().subscriptions).toHaveLength(1);
  });
});

describe('realtimeStore - updateSubscription', () => {
  it('updateSubscription 应该更新订阅状态', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    act(() => {
      useRealtimeStore.getState().updateSubscription('sub-1', { status: 'paused' });
    });

    expect(useRealtimeStore.getState().subscriptions[0].status).toBe('paused');
  });

  it('updateSubscription 不应该影响不存在的订阅', () => {
    act(() => {
      useRealtimeStore.getState().updateSubscription('non-existent', { status: 'paused' });
    });

    expect(useRealtimeStore.getState().subscriptions).toHaveLength(0);
  });
});

describe('realtimeStore - clearSubscriptions', () => {
  it('clearSubscriptions 应该清除所有订阅', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    act(() => {
      useRealtimeStore.getState().clearSubscriptions();
    });

    expect(useRealtimeStore.getState().subscriptions).toHaveLength(0);
  });
});

describe('realtimeStore - setConnected', () => {
  it('setConnected 应该更新连接状态', () => {
    act(() => {
      useRealtimeStore.getState().setConnected(true);
    });
    expect(useRealtimeStore.getState().isConnected).toBe(true);
    expect(useRealtimeStore.getState().connectionStatus).toBe('connected');

    act(() => {
      useRealtimeStore.getState().setConnected(false);
    });
    expect(useRealtimeStore.getState().isConnected).toBe(false);
    expect(useRealtimeStore.getState().connectionStatus).toBe('disconnected');
  });
});

describe('realtimeStore - setConnectionStatus', () => {
  it('setConnectionStatus 应该更新连接状态字符串', () => {
    act(() => {
      useRealtimeStore.getState().setConnectionStatus('connecting');
    });
    expect(useRealtimeStore.getState().connectionStatus).toBe('connecting');

    act(() => {
      useRealtimeStore.getState().setConnectionStatus('reconnecting');
    });
    expect(useRealtimeStore.getState().connectionStatus).toBe('reconnecting');
  });
});

describe('realtimeStore - setError', () => {
  it('setError 应该更新错误状态', () => {
    const error = new Error('Connection error');
    act(() => {
      useRealtimeStore.getState().setError(error);
    });
    expect(useRealtimeStore.getState().error).toEqual(error);
  });

  it('setError 应该能够设置为 null', () => {
    useRealtimeStore.setState({ error: new Error('Test') });

    act(() => {
      useRealtimeStore.getState().setError(null);
    });
    expect(useRealtimeStore.getState().error).toBeNull();
  });
});

describe('realtimeStore - clearError', () => {
  it('clearError 应该清除错误状态', () => {
    useRealtimeStore.setState({ error: new Error('Test') });

    act(() => {
      useRealtimeStore.getState().clearError();
    });
    expect(useRealtimeStore.getState().error).toBeNull();
  });
});

describe('realtimeStore - setLastUpdate', () => {
  it('setLastUpdate 应该更新最后更新时间', () => {
    const timestamp = Date.now();
    act(() => {
      useRealtimeStore.getState().setLastUpdate(timestamp);
    });
    expect(useRealtimeStore.getState().lastUpdate).toBe(timestamp);
  });
});

describe('realtimeStore - setReconnectAttempts', () => {
  it('setReconnectAttempts 应该更新重连次数', () => {
    act(() => {
      useRealtimeStore.getState().setReconnectAttempts(3);
    });
    expect(useRealtimeStore.getState().reconnectAttempts).toBe(3);
  });

  it('incrementReconnectAttempts 应该增加重连次数', () => {
    useRealtimeStore.setState({ reconnectAttempts: 2 });

    act(() => {
      useRealtimeStore.getState().incrementReconnectAttempts();
    });
    expect(useRealtimeStore.getState().reconnectAttempts).toBe(3);
  });
});

describe('realtimeStore - resetReconnectAttempts', () => {
  it('resetReconnectAttempts 应该重置重连次数', () => {
    useRealtimeStore.setState({ reconnectAttempts: 5 });

    act(() => {
      useRealtimeStore.getState().resetReconnectAttempts();
    });
    expect(useRealtimeStore.getState().reconnectAttempts).toBe(0);
  });
});

describe('realtimeStore - reset', () => {
  it('reset 应该重置所有状态', () => {
    useRealtimeStore.setState({
      prices: { 'BTC-chainlink': mockPrice },
      subscriptions: [mockSubscription],
      isConnected: true,
      connectionStatus: 'connected',
      error: new Error('Test'),
      lastUpdate: Date.now(),
      reconnectAttempts: 5,
    });

    act(() => {
      useRealtimeStore.getState().reset();
    });

    const state = useRealtimeStore.getState();
    expect(state.prices).toEqual({});
    expect(state.subscriptions).toEqual([]);
    expect(state.isConnected).toBe(false);
    expect(state.connectionStatus).toBe('disconnected');
    expect(state.error).toBeNull();
    expect(state.lastUpdate).toBeNull();
    expect(state.reconnectAttempts).toBe(0);
  });
});

describe('realtimeStore - getPrice', () => {
  it('getPrice 应该返回指定价格', () => {
    useRealtimeStore.setState({ prices: { 'BTC-chainlink': mockPrice } });

    const result = useRealtimeStore.getState().getPrice('BTC-chainlink');
    expect(result).toEqual(mockPrice);
  });

  it('getPrice 应该返回 undefined 当价格不存在时', () => {
    const result = useRealtimeStore.getState().getPrice('non-existent');
    expect(result).toBeUndefined();
  });
});

describe('realtimeStore - getPricesBySymbol', () => {
  it('getPricesBySymbol 应该返回指定代币的所有价格', () => {
    const btcPrice2 = { ...mockPrice, provider: 'pyth', source: 'polygon' };
    const ethPrice = { ...mockPrice, symbol: 'ETH' };
    useRealtimeStore.setState({
      prices: {
        'BTC-chainlink': mockPrice,
        'BTC-pyth': btcPrice2,
        'ETH-chainlink': ethPrice,
      },
    });

    const result = useRealtimeStore.getState().getPricesBySymbol('BTC');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.symbol === 'BTC')).toBe(true);
  });

  it('getPricesBySymbol 应该返回空数组当没有匹配时', () => {
    const result = useRealtimeStore.getState().getPricesBySymbol('SOL');
    expect(result).toHaveLength(0);
  });
});

describe('realtimeStore - getPricesByProvider', () => {
  it('getPricesByProvider 应该返回指定提供商的所有价格', () => {
    const btcPrice = mockPrice;
    const ethPrice = { ...mockPrice, symbol: 'ETH' };
    const btcPyth = { ...mockPrice, provider: 'pyth' };
    useRealtimeStore.setState({
      prices: {
        'BTC-chainlink': btcPrice,
        'ETH-chainlink': ethPrice,
        'BTC-pyth': btcPyth,
      },
    });

    const result = useRealtimeStore.getState().getPricesByProvider('chainlink');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.provider === 'chainlink')).toBe(true);
  });
});

describe('realtimeStore - getSubscriptionById', () => {
  it('getSubscriptionById 应该返回指定订阅', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    const result = useRealtimeStore.getState().getSubscriptionById('sub-1');
    expect(result).toEqual(mockSubscription);
  });

  it('getSubscriptionById 应该返回 undefined 当订阅不存在时', () => {
    const result = useRealtimeStore.getState().getSubscriptionById('non-existent');
    expect(result).toBeUndefined();
  });
});

describe('realtimeStore - getActiveSubscriptions', () => {
  it('getActiveSubscriptions 应该返回所有活跃订阅', () => {
    const pausedSub = { ...mockSubscription, id: 'sub-2', status: 'paused' };
    useRealtimeStore.setState({ subscriptions: [mockSubscription, pausedSub] });

    const result = useRealtimeStore.getState().getActiveSubscriptions();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });
});

describe('realtimeStore - getSubscriptionCount', () => {
  it('getSubscriptionCount 应该返回订阅数量', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    const result = useRealtimeStore.getState().getSubscriptionCount();
    expect(result).toBe(1);
  });

  it('getSubscriptionCount 应该返回 0 当没有订阅时', () => {
    const result = useRealtimeStore.getState().getSubscriptionCount();
    expect(result).toBe(0);
  });
});

describe('realtimeStore - getPriceCount', () => {
  it('getPriceCount 应该返回价格数量', () => {
    useRealtimeStore.setState({ prices: { 'BTC-chainlink': mockPrice } });

    const result = useRealtimeStore.getState().getPriceCount();
    expect(result).toBe(1);
  });

  it('getPriceCount 应该返回 0 当没有价格时', () => {
    const result = useRealtimeStore.getState().getPriceCount();
    expect(result).toBe(0);
  });
});

describe('realtimeStore - hasPrice', () => {
  it('hasPrice 应该返回 true 当价格存在时', () => {
    useRealtimeStore.setState({ prices: { 'BTC-chainlink': mockPrice } });

    const result = useRealtimeStore.getState().hasPrice('BTC-chainlink');
    expect(result).toBe(true);
  });

  it('hasPrice 应该返回 false 当价格不存在时', () => {
    const result = useRealtimeStore.getState().hasPrice('non-existent');
    expect(result).toBe(false);
  });
});

describe('realtimeStore - isSubscribed', () => {
  it('isSubscribed 应该返回 true 当订阅存在时', () => {
    useRealtimeStore.setState({ subscriptions: [mockSubscription] });

    const result = useRealtimeStore.getState().isSubscribed('sub-1');
    expect(result).toBe(true);
  });

  it('isSubscribed 应该返回 false 当订阅不存在时', () => {
    const result = useRealtimeStore.getState().isSubscribed('non-existent');
    expect(result).toBe(false);
  });
});
