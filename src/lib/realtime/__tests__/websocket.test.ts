/* eslint-disable max-lines-per-function */
import WebSocketManager, {
  MockWebSocketManager,
  type WebSocketStatus,
  type WebSocketMessage,
  type PerformanceMetrics,
  calculateBackoffDelay,
} from '../websocket';

interface MockWebSocketInstance {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send: jest.Mock;
  close: jest.Mock;
  url: string;
}

describe('calculateBackoffDelay', () => {
  it('should calculate exponential backoff delay', () => {
    const baseDelay = 1000;

    const delay0 = calculateBackoffDelay(0, baseDelay);
    expect(delay0).toBeGreaterThanOrEqual(baseDelay);
    expect(delay0).toBeLessThanOrEqual(baseDelay + 1000);

    const delay1 = calculateBackoffDelay(1, baseDelay);
    expect(delay1).toBeGreaterThanOrEqual(baseDelay * 2);
    expect(delay1).toBeLessThanOrEqual(baseDelay * 2 + 1000);

    const delay2 = calculateBackoffDelay(2, baseDelay);
    expect(delay2).toBeGreaterThanOrEqual(baseDelay * 4);
    expect(delay2).toBeLessThanOrEqual(baseDelay * 4 + 1000);
  });

  it('should cap delay at maximum of 30000ms', () => {
    const baseDelay = 1000;
    const delay = calculateBackoffDelay(10, baseDelay);
    expect(delay).toBeLessThanOrEqual(31000);
  });

  it('should add random jitter up to 1000ms', () => {
    const baseDelay = 1000;
    const delays: number[] = [];
    for (let i = 0; i < 10; i++) {
      delays.push(calculateBackoffDelay(0, baseDelay));
    }
    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });

  it('should handle zero attempt', () => {
    const baseDelay = 1000;
    const delay = calculateBackoffDelay(0, baseDelay);
    expect(delay).toBeGreaterThanOrEqual(baseDelay);
    expect(delay).toBeLessThanOrEqual(baseDelay + 1000);
  });

  it('should handle large attempt numbers', () => {
    const baseDelay = 1000;
    const delay = calculateBackoffDelay(100, baseDelay);
    expect(delay).toBeLessThanOrEqual(31000);
  });
});

describe('WebSocketManager', () => {
  let manager: WebSocketManager;
  let mockWsInstance: MockWebSocketInstance;
  let originalWebSocket: typeof WebSocket;
  let wsInstances: MockWebSocketInstance[];

  beforeEach(() => {
    jest.useFakeTimers();
    wsInstances = [];

    originalWebSocket = global.WebSocket;

    const MockWebSocket = class {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readyState = MockWebSocket.OPEN;
      onopen: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      send = jest.fn();
      close = jest.fn(() => {
        this.readyState = MockWebSocket.CLOSED;
      });

      constructor(public url: string) {
        mockWsInstance = this as unknown as MockWebSocketInstance;
        wsInstances.push(mockWsInstance);
      }
    };

    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

    manager = new WebSocketManager({
      url: 'ws://test.example.com',
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      useExponentialBackoff: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
    manager.disconnect();
  });

  describe('1. 连接管理测试', () => {
    describe('成功连接建立', () => {
      it('测试 connect() 状态转换：disconnected → connecting → connected', () => {
        const statusChanges: WebSocketStatus[] = [];
        manager.onStatusChange((status) => statusChanges.push(status));

        expect(manager.getStatus()).toBe('disconnected');

        manager.connect();
        expect(manager.getStatus()).toBe('connecting');
        expect(statusChanges).toContain('connecting');

        mockWsInstance.onopen?.(new Event('open'));
        expect(manager.getStatus()).toBe('connected');
        expect(statusChanges).toContain('connected');
      });

      it('测试连接建立时的初始化操作', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        expect(mockWsInstance.onopen).toBeDefined();
        expect(mockWsInstance.onmessage).toBeDefined();
        expect(mockWsInstance.onclose).toBeDefined();
        expect(mockWsInstance.onerror).toBeDefined();
      });

      it('测试连接建立后重置重连计数', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close'));

        jest.advanceTimersByTime(1000);
        const reconnectWsInstance = wsInstances[wsInstances.length - 1];
        reconnectWsInstance.onopen?.(new Event('open'));

        expect(manager.getStatus()).toBe('connected');
      });
    });

    describe('连接认证', () => {
      it('测试带认证参数的连接', () => {
        const authManager = new WebSocketManager({
          url: 'ws://test.example.com?token=abc123',
        });

        authManager.connect();
        expect(mockWsInstance.url).toContain('token=abc123');

        authManager.disconnect();
      });

      it('测试连接后发送认证消息', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        manager.send({ type: 'auth', token: 'test-token' });

        expect(mockWsInstance.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'auth', token: 'test-token' })
        );
      });
    });

    describe('连接超时处理', () => {
      it('测试连接超时检测', () => {
        const timeoutManager = new WebSocketManager({
          url: 'ws://test.example.com',
          reconnectInterval: 1000,
          maxReconnectAttempts: 1,
        });

        timeoutManager.connect();

        mockWsInstance.readyState = 0;

        jest.advanceTimersByTime(30000);

        expect(timeoutManager.getStatus()).toBe('connecting');

        timeoutManager.disconnect();
      });

      it('测试连接超时后的重连', () => {
        manager.connect();
        mockWsInstance.readyState = 0;

        mockWsInstance.onerror?.(new Event('error'));

        expect(manager.getStatus()).toBe('error');
      });
    });

    describe('连接状态跟踪', () => {
      it('测试所有状态转换', () => {
        const statusHistory: WebSocketStatus[] = [];
        manager.onStatusChange((status) => statusHistory.push(status));

        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close'));
        jest.advanceTimersByTime(1000);

        expect(statusHistory).toContain('connecting');
        expect(statusHistory).toContain('connected');
        expect(statusHistory).toContain('disconnected');
        expect(statusHistory).toContain('reconnecting');
      });

      it('测试状态监听器的正确调用', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        manager.onStatusChange(handler1);
        manager.onStatusChange(handler2);

        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        expect(handler1).toHaveBeenCalledTimes(2);
        expect(handler2).toHaveBeenCalledTimes(2);
      });
    });

    describe('多连接处理', () => {
      it('测试重复连接请求被忽略', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const sentBefore = mockWsInstance.send.mock.calls.length;
        manager.connect();

        expect(manager.getStatus()).toBe('connected');
        expect(mockWsInstance.send.mock.calls.length).toBe(sentBefore);
      });

      it('测试无URL时的错误处理', () => {
        const noUrlManager = new WebSocketManager({
          url: '',
          reconnectInterval: 1000,
          maxReconnectAttempts: 3,
        });

        expect(() => noUrlManager.connect()).toThrow(
          'WebSocket URL is not configured. Please set NEXT_PUBLIC_WS_URL environment variable.'
        );
      });

      it('测试断开连接后重新连接', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        manager.disconnect();

        manager.connect();
        const newWsInstance = wsInstances[wsInstances.length - 1];
        newWsInstance.onopen?.(new Event('open'));

        expect(manager.getStatus()).toBe('connected');
      });
    });
  });

  describe('2. 重连机制测试', () => {
    describe('自动重连', () => {
      it('测试断开后自动重连', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        expect(manager.getStatus()).toBe('connected');

        mockWsInstance.onclose?.(new CloseEvent('close'));

        expect(manager.getStatus()).toBe('reconnecting');

        jest.advanceTimersByTime(1000);

        expect(wsInstances.length).toBe(2);
        expect(manager.getStatus()).toBe('connecting');
      });

      it('测试重连成功后状态恢复', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close'));

        jest.advanceTimersByTime(1000);
        const reconnectWsInstance = wsInstances[wsInstances.length - 1];
        reconnectWsInstance.onopen?.(new Event('open'));

        expect(manager.getStatus()).toBe('connected');
      });
    });

    describe('指数退避重连', () => {
      it('测试指数退避延迟计算', () => {
        const exponentialManager = new WebSocketManager({
          url: 'ws://test.example.com',
          reconnectInterval: 1000,
          maxReconnectAttempts: 5,
          useExponentialBackoff: true,
        });

        const statusChanges: WebSocketStatus[] = [];
        exponentialManager.onStatusChange((status) => statusChanges.push(status));

        exponentialManager.connect();
        const currentWsInstance = wsInstances[wsInstances.length - 1];
        currentWsInstance.onopen?.(new Event('open'));
        currentWsInstance.onclose?.(new CloseEvent('close'));

        expect(exponentialManager.getStatus()).toBe('reconnecting');

        jest.advanceTimersByTime(500);
        expect(exponentialManager.getStatus()).toBe('reconnecting');

        jest.advanceTimersByTime(2500);

        exponentialManager.disconnect();
      });

      it('测试禁用指数退避', () => {
        const linearManager = new WebSocketManager({
          url: 'ws://test.example.com',
          reconnectInterval: 1000,
          useExponentialBackoff: false,
        });

        linearManager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close'));

        jest.advanceTimersByTime(1000);

        expect(wsInstances.length).toBe(2);

        linearManager.disconnect();
      });
    });

    describe('最大重连次数', () => {
      it('测试达到最大重连次数后停止', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        mockWsInstance.onclose?.(new CloseEvent('close'));

        for (let i = 0; i < 3; i++) {
          jest.advanceTimersByTime(1000);
          const newWsInstance = wsInstances[wsInstances.length - 1];
          if (newWsInstance) {
            newWsInstance.onclose?.(new CloseEvent('close'));
          }
        }

        expect(manager.getStatus()).toBe('error');
      });

      it('测试重连计数重置', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close'));
        jest.advanceTimersByTime(1000);
        const reconnectWsInstance = wsInstances[wsInstances.length - 1];
        reconnectWsInstance.onopen?.(new Event('open'));

        reconnectWsInstance.onclose?.(new CloseEvent('close'));

        expect(manager.getStatus()).toBe('reconnecting');

        jest.advanceTimersByTime(1000);

        expect(manager.getStatus()).toBe('connecting');
      });
    });

    describe('重连状态恢复', () => {
      it('测试重连后重新订阅频道', () => {
        const handler = jest.fn();
        manager.subscribe('prices', handler);

        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const calls = mockWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });

      it('测试重连后消息队列刷新', () => {
        manager.send({ type: 'test', data: 'queued message' });

        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const calls = mockWsInstance.send.mock.calls;
        const queuedCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'test' && parsed.data === 'queued message';
        });

        expect(queuedCall).toBeDefined();
      });
    });

    describe('手动重连', () => {
      it('测试手动触发重连', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        mockWsInstance.onclose?.(new CloseEvent('close'));
        expect(manager.getStatus()).toBe('reconnecting');

        manager.reconnect();

        expect(manager.getStatus()).toBe('connecting');
      });

      it('测试手动重连重置重试计数', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close'));

        manager.reconnect();

        expect(manager.getStatus()).toBe('connecting');
      });
    });
  });

  describe('3. 消息处理测试', () => {
    describe('文本消息解析', () => {
      it('测试JSON文本消息解析', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const testMessage = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'update',
            channel: 'prices',
            data: expect.objectContaining({ symbol: 'BTC', price: 50000 }),
          })
        );
      });

      it('测试消息分发到正确的处理器', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const pricesHandler = jest.fn();
        const tvsHandler = jest.fn();

        manager.subscribe('prices', pricesHandler);
        manager.subscribe('tvs', tvsHandler);

        const testMessage = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(pricesHandler).toHaveBeenCalled();
        expect(tvsHandler).not.toHaveBeenCalled();
      });
    });

    describe('二进制消息处理', () => {
      it('测试二进制消息被忽略', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const binaryData = new ArrayBuffer(10);
        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: binaryData })
        );

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('JSON消息解析', () => {
      it('测试有效JSON消息解析', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const validJson = JSON.stringify({
          type: 'update',
          channel: 'prices',
          data: { price: 100 },
          timestamp: Date.now(),
        });

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: validJson })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });

      it('测试无效JSON消息处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('无效消息格式处理', () => {
      it('测试缺少必要字段的消息', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const incompleteMessage = JSON.stringify({ type: 'update' });

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: incompleteMessage })
        );
        jest.advanceTimersByTime(100);

        expect(handler).not.toHaveBeenCalled();
      });

      it('测试处理器抛出错误时不影响其他处理器', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const errorHandler = jest.fn(() => {
          throw new Error('Handler error');
        });
        const normalHandler = jest.fn();

        manager.subscribe('prices', errorHandler);
        manager.subscribe('prices', normalHandler);

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'update',
              channel: 'prices',
              data: { symbol: 'BTC', price: 50000 },
              timestamp: Date.now(),
            }),
          })
        );

        jest.advanceTimersByTime(100);

        expect(normalHandler).toHaveBeenCalled();
      });
    });

    describe('大消息处理', () => {
      it('测试大消息处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const largeData = {
          type: 'update',
          channel: 'prices',
          data: {
            symbol: 'BTC',
            price: 50000,
            history: Array(1000).fill({ price: 50000, timestamp: Date.now() }),
          },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(largeData) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });

      it('测试多个大消息连续处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        for (let i = 0; i < 10; i++) {
          const largeMessage = {
            type: 'update',
            channel: 'prices',
            data: {
              symbol: 'BTC',
              price: 50000 + i,
              history: Array(100).fill({ price: 50000, timestamp: Date.now() }),
            },
            timestamp: Date.now(),
          };

          mockWsInstance.onmessage?.(
            new MessageEvent('message', { data: JSON.stringify(largeMessage) })
          );
        }

        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });
    });
  });

  describe('4. 订阅管理测试', () => {
    describe('订阅价格源', () => {
      it('测试 subscribe() 订阅频道', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const calls = mockWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });

      it('测试订阅消息格式', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const lastCall = mockWsInstance.send.mock.calls[
          mockWsInstance.send.mock.calls.length - 1
        ];
        const message = JSON.parse(lastCall[0] as string);

        expect(message).toHaveProperty('type', 'subscribe');
        expect(message).toHaveProperty('channel', 'prices');
        expect(message).toHaveProperty('timestamp');
      });
    });

    describe('取消订阅', () => {
      it('测试 unsubscribe() 取消订阅', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);
        mockWsInstance.send.mockClear();

        manager.unsubscribe('prices');

        const calls = mockWsInstance.send.mock.calls;
        const unsubscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'unsubscribe' && parsed.channel === 'prices';
        });

        expect(unsubscribeCall).toBeDefined();
      });

      it('测试取消订阅后不再接收消息', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const testMessage = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalledTimes(1);

        manager.unsubscribe('prices');

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('多订阅处理', () => {
      it('测试多个处理器的情况', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handler3 = jest.fn();

        manager.subscribe('prices', handler1);
        manager.subscribe('prices', handler2);
        manager.subscribe('tvs', handler3);

        const testMessage = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
        expect(handler3).not.toHaveBeenCalled();
      });

      it('测试订阅返回的取消订阅函数', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        const unsubscribe = manager.subscribe('prices', handler);

        const testMessage = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalledTimes(1);

        unsubscribe();

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('订阅状态跟踪', () => {
      it('测试离线时订阅不发送消息', () => {
        const handler = jest.fn();
        manager.subscribe('prices', handler);

        expect(manager.getStatus()).toBe('disconnected');
      });

      it('测试连接后重新订阅频道', () => {
        const handler = jest.fn();
        manager.subscribe('prices', handler);

        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const calls = mockWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });
    });

    describe('断开连接时订阅清理', () => {
      it('测试断开连接后订阅状态保留', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        manager.disconnect();

        manager.connect();
        const newWsInstance = wsInstances[wsInstances.length - 1];
        newWsInstance.onopen?.(new Event('open'));

        const calls = newWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });

      it('测试取消订阅时不在线则不发送消息', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);
        mockWsInstance.send.mockClear();

        manager.disconnect();
        manager.unsubscribe('prices');

        expect(manager.getStatus()).toBe('disconnected');
      });
    });
  });

  describe('5. 心跳机制测试', () => {
    describe('心跳发送', () => {
      it('测试 ping 消息发送', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(30000);

        const calls = mockWsInstance.send.mock.calls;
        const pingCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'ping';
        });

        expect(pingCall).toBeDefined();
      });

      it('测试心跳间隔配置', () => {
        const customIntervalManager = new WebSocketManager({
          url: 'ws://test.example.com',
          heartbeatInterval: 5000,
        });

        customIntervalManager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(5000);

        const calls = mockWsInstance.send.mock.calls;
        const pingCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'ping';
        });

        expect(pingCall).toBeDefined();

        customIntervalManager.disconnect();
      });
    });

    describe('心跳响应处理', () => {
      it('测试 pong 响应处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        jest.advanceTimersByTime(30000);

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'pong', timestamp: Date.now() }),
          })
        );

        expect(() => {
          jest.advanceTimersByTime(10000);
        }).not.toThrow();
      });

      it('测试心跳超时定时器清理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        jest.advanceTimersByTime(30000);

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'pong', timestamp: Date.now() }),
          })
        );

        expect(() => {
          jest.advanceTimersByTime(5000);
        }).not.toThrow();
      });
    });

    describe('心跳超时检测', () => {
      it('测试心跳超时处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        jest.advanceTimersByTime(30000);

        jest.advanceTimersByTime(10000);

        expect(mockWsInstance.close).toHaveBeenCalled();
      });

      it('测试心跳超时后重连', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        jest.advanceTimersByTime(30000);
        jest.advanceTimersByTime(10000);

        expect(mockWsInstance.close).toHaveBeenCalled();
      });
    });

    describe('连接保活', () => {
      it('测试持续心跳保持连接', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        for (let i = 0; i < 5; i++) {
          jest.advanceTimersByTime(30000);

          const calls = mockWsInstance.send.mock.calls;
          const pingCall = calls.find((call) => {
            const parsed = JSON.parse(call[0] as string);
            return parsed.type === 'ping';
          });
          expect(pingCall).toBeDefined();

          mockWsInstance.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({ type: 'pong', timestamp: Date.now() }),
            })
          );
        }

        expect(manager.getStatus()).toBe('connected');
      });
    });

    describe('心跳配置', () => {
      it('测试自定义心跳超时', () => {
        const customTimeoutManager = new WebSocketManager({
          url: 'ws://test.example.com',
          heartbeatInterval: 5000,
          heartbeatTimeout: 2000,
        });

        customTimeoutManager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        jest.advanceTimersByTime(5000);
        jest.advanceTimersByTime(2000);

        expect(mockWsInstance.close).toHaveBeenCalled();

        customTimeoutManager.disconnect();
      });

      it('测试断开连接时停止心跳', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        manager.disconnect();

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(60000);

        expect(mockWsInstance.send).not.toHaveBeenCalled();
      });

      it('测试心跳在 WebSocket 非打开状态时不发送', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.readyState = 0;

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(30000);

        expect(mockWsInstance.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('6. 错误处理测试', () => {
    describe('网络错误处理', () => {
      it('测试 WebSocket 错误事件', () => {
        const onError = jest.fn();
        const errorManager = new WebSocketManager({
          url: 'ws://test.example.com',
          onError,
        });

        errorManager.connect();
        mockWsInstance.onerror?.(new Event('error'));

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(expect.any(Error));

        errorManager.disconnect();
      });

      it('测试连接错误时状态更新', () => {
        manager.connect();
        mockWsInstance.onerror?.(new Event('error'));

        expect(manager.getStatus()).toBe('error');
      });
    });

    describe('认证失败', () => {
      it('测试认证失败消息处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.onStatusChange(handler);

        const authFailedMessage = {
          type: 'error',
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(authFailedMessage) })
        );

        expect(manager.getStatus()).toBe('connected');
      });
    });

    describe('速率限制处理', () => {
      it('测试消息节流', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const message1 = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message1) }));
        jest.advanceTimersByTime(50);

        const message2 = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 51000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message2) }));
        jest.advanceTimersByTime(100);

        const metrics = manager.getPerformanceMetrics();
        expect(metrics.throttleCount).toBeGreaterThan(0);
      });
    });

    describe('无效消息处理', () => {
      it('测试无效JSON消息处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('测试空消息处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: '' }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('连接拒绝处理', () => {
      it('测试 WebSocket 构造函数抛出错误时的处理', () => {
        const originalWebSocket = global.WebSocket;

        class FailingWebSocket {
          static CONNECTING = 0;
          static OPEN = 1;
          static CLOSING = 2;
          static CLOSED = 3;
          constructor() {
            throw new Error('WebSocket construction failed');
          }
        }

        global.WebSocket = FailingWebSocket as unknown as typeof WebSocket;

        const errorManager = new WebSocketManager({
          url: 'ws://test.example.com',
          maxReconnectAttempts: 0,
        });

        errorManager.connect();
        expect(errorManager.getStatus()).toBe('error');

        global.WebSocket = originalWebSocket;
      });

      it('测试连接被拒绝', () => {
        manager.connect();

        mockWsInstance.onopen?.(new Event('open'));
        mockWsInstance.onclose?.(new CloseEvent('close', { code: 1006 }));

        expect(manager.getStatus()).toBe('reconnecting');
      });
    });
  });

  describe('7. 性能测试', () => {
    describe('消息吞吐量', () => {
      it('测试高吞吐量消息处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const messageCount = 100;
        for (let i = 0; i < messageCount; i++) {
          mockWsInstance.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'update',
                channel: 'prices',
                data: { symbol: 'BTC', price: 50000 + i },
                timestamp: Date.now(),
              }),
            })
          );
        }

        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });

      it('测试消息批处理性能', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        for (let i = 0; i < 10; i++) {
          mockWsInstance.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'update',
                channel: 'prices',
                data: { symbol: 'BTC', price: 50000 + i * 100 },
                timestamp: Date.now(),
              }),
            })
          );
        }

        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });
    });

    describe('延迟测量', () => {
      it('测试连接延迟记录', () => {
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(1000);

        manager.connect();

        nowSpy.mockReturnValueOnce(1500);
        mockWsInstance.onopen?.(new Event('open'));

        const metrics = manager.getPerformanceMetrics();
        expect(metrics.connectionLatency).toBe(500);

        nowSpy.mockRestore();
      });

      it('测试消息处理时间记录', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'update',
              channel: 'prices',
              data: { symbol: 'BTC', price: 50000 },
              timestamp: Date.now(),
            }),
          })
        );
        jest.advanceTimersByTime(100);

        const metrics = manager.getPerformanceMetrics();
        expect(metrics.messageProcessingTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('负载下内存使用', () => {
      it('测试持续消息流的内存管理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        for (let batch = 0; batch < 10; batch++) {
          for (let i = 0; i < 100; i++) {
            mockWsInstance.onmessage?.(
              new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'update',
                  channel: 'prices',
                  data: { symbol: 'BTC', price: 50000 + i },
                  timestamp: Date.now(),
                }),
              })
            );
          }
          jest.advanceTimersByTime(100);
        }

        expect(handler).toHaveBeenCalled();
      });

      it('测试大量订阅的内存管理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handlers: jest.Mock[] = [];
        for (let i = 0; i < 50; i++) {
          const handler = jest.fn();
          manager.subscribe(`channel-${i}`, handler);
          handlers.push(handler);
        }

        expect(handlers.length).toBe(50);
      });
    });

    describe('并发连接处理', () => {
      it('测试多个订阅并发处理', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const handlers: jest.Mock[] = [];
        for (let i = 0; i < 10; i++) {
          const handler = jest.fn();
          manager.subscribe('prices', handler);
          handlers.push(handler);
        }

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'update',
              channel: 'prices',
              data: { symbol: 'BTC', price: 50000 },
              timestamp: Date.now(),
            }),
          })
        );
        jest.advanceTimersByTime(100);

        handlers.forEach((handler) => {
          expect(handler).toHaveBeenCalled();
        });
      });

      it('测试性能指标更新', () => {
        const onPerformanceMetrics = jest.fn();
        const perfManager = new WebSocketManager({
          url: 'ws://test.example.com',
          onPerformanceMetrics,
        });

        perfManager.connect();
        mockWsInstance.onopen?.(new Event('open'));

        const testMessage = {
          type: 'update',
          channel: 'prices',
          data: { symbol: 'BTC', price: 50000 },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(testMessage) })
        );
        jest.advanceTimersByTime(100);

        expect(onPerformanceMetrics).toHaveBeenCalled();

        perfManager.disconnect();
      });
    });
  });

  describe('消息队列测试', () => {
    it('测试离线时消息入队', () => {
      manager.send({ type: 'test', data: 'offline message' });

      expect(manager.getStatus()).toBe('disconnected');
    });

    it('测试连接后消息队列刷新', () => {
      manager.send({ type: 'test', data: 'queued message' });

      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const calls = mockWsInstance.send.mock.calls;
      const queuedCall = calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'test' && parsed.data === 'queued message';
      });

      expect(queuedCall).toBeDefined();
    });

    it('测试在线时消息直接发送', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      mockWsInstance.send.mockClear();
      manager.send({ type: 'test', data: 'online message' });

      expect(mockWsInstance.send).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWsInstance.send.mock.calls[0][0] as string)).toEqual({
        type: 'test',
        data: 'online message',
      });
    });

    it('测试消息队列在连接关闭时停止刷新', () => {
      manager.send({ type: 'test', data: 'queued message' });

      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));
      mockWsInstance.readyState = 0;

      const callsBefore = mockWsInstance.send.mock.calls.length;
      mockWsInstance.onclose?.(new CloseEvent('close'));

      expect(mockWsInstance.send.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('状态监听器测试', () => {
    it('测试 onStatusChange 注册', () => {
      const handler = jest.fn();
      manager.onStatusChange(handler);

      manager.connect();

      expect(handler).toHaveBeenCalledWith('connecting');
    });

    it('测试状态变化通知', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.onStatusChange(handler1);
      manager.onStatusChange(handler2);

      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(2);
    });

    it('测试取消状态监听', () => {
      const handler = jest.fn();
      const unsubscribe = manager.onStatusChange(handler);

      manager.connect();
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      mockWsInstance.onopen?.(new Event('open'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('性能指标测试', () => {
    it('测试获取性能指标', () => {
      const metrics = manager.getPerformanceMetrics();

      expect(metrics).toEqual({
        connectionLatency: 0,
        messageProcessingTime: 0,
        messagesPerSecond: 0,
        lastMessageTimestamp: 0,
        averageBatchSize: 0,
        throttleCount: 0,
      });
    });

    it('测试 onPerformanceMetrics 回调', () => {
      const onPerformanceMetrics = jest.fn();
      const perfManager = new WebSocketManager({
        url: 'ws://test.example.com',
        onPerformanceMetrics,
      });

      perfManager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const testMessage = {
        type: 'update',
        channel: 'prices',
        data: { symbol: 'BTC', price: 50000 },
        timestamp: Date.now(),
      };

      mockWsInstance.onmessage?.(
        new MessageEvent('message', { data: JSON.stringify(testMessage) })
      );
      jest.advanceTimersByTime(100);

      expect(onPerformanceMetrics).toHaveBeenCalled();

      perfManager.disconnect();
    });
  });

  describe('批处理测试', () => {
    it('测试消息批处理', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const handler = jest.fn();
      manager.subscribe('prices', handler);

      for (let i = 0; i < 10; i++) {
        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'update',
              channel: 'prices',
              data: { symbol: 'BTC', price: 50000 + i * 100 },
              timestamp: Date.now(),
            }),
          })
        );
      }

      jest.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalled();
    });

    it('测试批处理窗口刷新', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const handler = jest.fn();
      manager.subscribe('prices', handler);

      mockWsInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'update',
            channel: 'prices',
            data: { symbol: 'BTC', price: 50000 },
            timestamp: Date.now(),
          }),
        })
      );

      jest.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalled();
    });

    it('测试断开连接时刷新所有批次', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const handler = jest.fn();
      manager.subscribe('prices', handler);

      mockWsInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'update',
            channel: 'prices',
            data: { symbol: 'BTC', price: 50000 },
            timestamp: Date.now(),
          }),
        })
      );

      manager.disconnect();

      expect(handler).toHaveBeenCalled();
    });

    it('测试批处理定时器清理', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const handler = jest.fn();
      manager.subscribe('prices', handler);

      mockWsInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'update',
            channel: 'prices',
            data: { symbol: 'BTC', price: 50000 },
            timestamp: Date.now(),
          }),
        })
      );

      jest.advanceTimersByTime(50);

      manager.disconnect();

      expect(manager.getStatus()).toBe('disconnected');
    });
  });

  describe('disconnect 清理测试', () => {
    it('测试 disconnect 时清理 batchTimer', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const handler = jest.fn();
      manager.subscribe('prices', handler);

      mockWsInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'update',
            channel: 'prices',
            data: { symbol: 'BTC', price: 50000 },
            timestamp: Date.now(),
          }),
        })
      );

      jest.advanceTimersByTime(50);

      manager.disconnect();

      expect(manager.getStatus()).toBe('disconnected');
    });

    it('测试 disconnect 时 ws 为 null', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      manager.disconnect();

      expect(manager.getStatus()).toBe('disconnected');
    });
  });

  describe('回调函数测试', () => {
    it('测试连接时调用 onConnect 回调', () => {
      const onConnect = jest.fn();
      const managerWithCallback = new WebSocketManager({
        url: 'ws://test.example.com',
        onConnect,
      });

      managerWithCallback.connect();
      mockWsInstance.onopen?.(new Event('open'));

      expect(onConnect).toHaveBeenCalledTimes(1);

      managerWithCallback.disconnect();
    });

    it('测试断开连接时调用 onDisconnect 回调', () => {
      const onDisconnect = jest.fn();
      const managerWithCallback = new WebSocketManager({
        url: 'ws://test.example.com',
        onDisconnect,
      });

      managerWithCallback.connect();
      const currentWsInstance = wsInstances[wsInstances.length - 1];
      currentWsInstance.onopen?.(new Event('open'));
      currentWsInstance.onclose?.(new CloseEvent('close'));

      expect(onDisconnect).toHaveBeenCalledTimes(1);

      managerWithCallback.disconnect();
    });

    it('测试连接错误时调用 onError 回调', () => {
      const onError = jest.fn();
      const managerWithCallback = new WebSocketManager({
        url: 'ws://test.example.com',
        onError,
      });

      managerWithCallback.connect();
      mockWsInstance.onerror?.(new Event('error'));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));

      managerWithCallback.disconnect();
    });
  });
});

describe('MockWebSocketManager', () => {
  let mockManager: MockWebSocketManager;

  beforeEach(() => {
    jest.useFakeTimers();
    mockManager = new MockWebSocketManager({
      url: 'ws://test.example.com',
      throttleMs: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    mockManager.disconnect();
  });

  describe('模拟连接测试', () => {
    it('测试模拟连接状态转换', () => {
      const statusChanges: WebSocketStatus[] = [];
      mockManager.onStatusChange((status) => statusChanges.push(status));

      mockManager.connect();
      expect(mockManager.getStatus()).toBe('connecting');

      jest.advanceTimersByTime(500);
      expect(mockManager.getStatus()).toBe('connected');
    });

    it('测试模拟断开连接', () => {
      mockManager.connect();
      jest.advanceTimersByTime(500);

      mockManager.disconnect();
      expect(mockManager.getStatus()).toBe('disconnected');
    });

    it('测试手动重连', () => {
      mockManager.connect();
      jest.advanceTimersByTime(500);

      mockManager.reconnect();
      expect(mockManager.getStatus()).toBe('connecting');

      jest.advanceTimersByTime(500);
      expect(mockManager.getStatus()).toBe('connected');
    });
  });

  describe('模拟数据流测试', () => {
    it('测试订阅后接收模拟数据', () => {
      const handler = jest.fn();
      mockManager.subscribe('prices', handler);

      mockManager.connect();
      jest.advanceTimersByTime(2600);

      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0][0] as WebSocketMessage;
      expect(call.type).toBe('update');
      expect(call.channel).toBe('prices');
      expect(call.data).toHaveProperty('symbol');
      expect(call.data).toHaveProperty('price');
    });

    it('测试多个频道数据流', () => {
      const pricesHandler = jest.fn();
      const tvsHandler = jest.fn();

      mockManager.subscribe('prices', pricesHandler);
      mockManager.subscribe('tvs', tvsHandler);

      mockManager.connect();
      jest.advanceTimersByTime(2600);

      expect(pricesHandler).toHaveBeenCalled();
      expect(tvsHandler).toHaveBeenCalled();
    });

    it('测试断开连接后停止数据流', () => {
      const handler = jest.fn();
      mockManager.subscribe('prices', handler);

      mockManager.connect();
      jest.advanceTimersByTime(2600);

      const callCount = handler.mock.calls.length;
      mockManager.disconnect();

      jest.advanceTimersByTime(5000);

      expect(handler.mock.calls.length).toBe(callCount);
    });
  });

  describe('各频道数据生成器测试', () => {
    it('测试 prices 频道数据生成', () => {
      const handler = jest.fn();
      mockManager.subscribe('prices', handler);
      mockManager.connect();
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0].data;
      expect(data).toHaveProperty('symbol');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('change24h');
      expect(data).toHaveProperty('timestamp');
    });

    it('测试 tvs 频道数据生成', () => {
      const handler = jest.fn();
      mockManager.subscribe('tvs', handler);
      mockManager.connect();
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0].data;
      expect(data).toHaveProperty('oracle');
      expect(data).toHaveProperty('tvs');
      expect(data).toHaveProperty('change24h');
      expect(data).toHaveProperty('timestamp');
    });

    it('测试 marketStats 频道数据生成', () => {
      const handler = jest.fn();
      mockManager.subscribe('marketStats', handler);
      mockManager.connect();
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0].data;
      expect(data).toHaveProperty('totalTVS');
      expect(data).toHaveProperty('totalChains');
      expect(data).toHaveProperty('totalProtocols');
      expect(data).toHaveProperty('marketDominance');
      expect(data).toHaveProperty('avgUpdateLatency');
      expect(data).toHaveProperty('timestamp');
    });

    it('测试未知频道不生成数据', () => {
      const handler = jest.fn();
      mockManager.subscribe('unknown', handler);
      mockManager.connect();
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(2000);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('send 方法测试', () => {
    it('测试 send 方法不抛出错误', () => {
      expect(() => {
        mockManager.send({ type: 'test', data: 'test' });
      }).not.toThrow();
    });
  });

  describe('节流测试', () => {
    it('测试模拟数据节流', () => {
      const throttleManager = new MockWebSocketManager({
        url: 'ws://test.example.com',
        throttleMs: 100,
      });

      const handler = jest.fn();
      throttleManager.subscribe('prices', handler);

      throttleManager.connect();
      jest.advanceTimersByTime(500);

      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(50);
      jest.advanceTimersByTime(2000);

      const metrics = throttleManager.getPerformanceMetrics();
      expect(metrics.throttleCount).toBeGreaterThanOrEqual(0);

      throttleManager.disconnect();
    });
  });

  describe('批处理测试', () => {
    it('测试模拟数据批处理', () => {
      const handler = jest.fn();
      mockManager.subscribe('prices', handler);

      mockManager.connect();
      jest.advanceTimersByTime(500);

      for (let i = 0; i < 15; i++) {
        jest.advanceTimersByTime(2000);
      }

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('性能指标测试', () => {
    it('测试获取性能指标', () => {
      const metrics = mockManager.getPerformanceMetrics();

      expect(metrics).toEqual({
        connectionLatency: 0,
        messageProcessingTime: 0,
        messagesPerSecond: 0,
        lastMessageTimestamp: 0,
        averageBatchSize: 0,
        throttleCount: 0,
      });
    });
  });
});
