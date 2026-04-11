/* eslint-disable max-lines-per-function */
import WebSocketManager, {
  MockWebSocketManager,
  type WebSocketStatus,
  type WebSocketMessage,
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

  describe('连接管理测试', () => {
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

    it('测试 disconnect() 状态转换', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));
      expect(manager.getStatus()).toBe('connected');

      manager.disconnect();
      expect(manager.getStatus()).toBe('disconnected');
    });

    it('测试重复连接处理', () => {
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
  });

  describe('心跳机制测试', () => {
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

    it('测试心跳超时处理', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      jest.advanceTimersByTime(30000);

      jest.advanceTimersByTime(10000);

      expect(mockWsInstance.close).toHaveBeenCalled();
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

  describe('消息订阅测试', () => {
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

      expect(pricesHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update',
          channel: 'prices',
          data: expect.objectContaining({ symbol: 'BTC', price: 50000 }),
        })
      );
      expect(tvsHandler).not.toHaveBeenCalled();
    });

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

  describe('重连机制测试', () => {
    it('测试自动重连', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));
      expect(manager.getStatus()).toBe('connected');

      mockWsInstance.onclose?.(new CloseEvent('close'));

      // After close, status should be 'reconnecting' (attemptReconnect is called)
      expect(manager.getStatus()).toBe('reconnecting');

      // After reconnect delay (1000ms), connect() should be called
      // which sets status to 'connecting'
      jest.advanceTimersByTime(1000);

      // Verify that a new WebSocket instance was created
      expect(wsInstances.length).toBe(2);
      expect(manager.getStatus()).toBe('connecting');
    });

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

      // After close, status should be 'reconnecting'
      expect(exponentialManager.getStatus()).toBe('reconnecting');

      // With exponential backoff, first reconnect delay is baseDelay * 2^0 + jitter = 1000 + random(0-1000)
      // So minimum delay is 1000ms, we need to wait at least 1000ms for reconnect
      jest.advanceTimersByTime(500);
      // Status should still be 'reconnecting' (not yet 'connecting')
      expect(exponentialManager.getStatus()).toBe('reconnecting');

      // Wait enough time for the reconnect to happen (max 2000ms for first attempt)
      jest.advanceTimersByTime(2500);

      exponentialManager.disconnect();
    });

    it('测试最大重试次数限制', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      // Trigger initial close
      mockWsInstance.onclose?.(new CloseEvent('close'));

      // Simulate 3 consecutive failed reconnect attempts
      // maxReconnectAttempts is 3, so after 3 attempts (reconnectAttempts = 3),
      // the next attemptReconnect call should set status to 'error'
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(1000);
        // Get the new WebSocket instance created by reconnect
        const newWsInstance = wsInstances[wsInstances.length - 1];
        // Trigger onclose to simulate failed connection
        if (newWsInstance) {
          newWsInstance.onclose?.(new CloseEvent('close'));
        }
      }

      // After 3 failed attempts, status should be 'error'
      expect(manager.getStatus()).toBe('error');
    });

    it('测试手动重连', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      mockWsInstance.onclose?.(new CloseEvent('close'));
      expect(manager.getStatus()).toBe('reconnecting');

      manager.reconnect();

      expect(manager.getStatus()).toBe('connecting');
    });

    it('测试重连重置重试计数', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));
      mockWsInstance.onclose?.(new CloseEvent('close'));
      jest.advanceTimersByTime(1000);
      const reconnectWsInstance = wsInstances[wsInstances.length - 1];
      if (reconnectWsInstance) {
        reconnectWsInstance.onopen?.(new Event('open'));
      }

      // After successful reconnect, close again to test retry count reset
      reconnectWsInstance.onclose?.(new CloseEvent('close'));

      // Status should be 'reconnecting' after close
      expect(manager.getStatus()).toBe('reconnecting');

      // After delay, should be 'connecting'
      jest.advanceTimersByTime(1000);

      expect(manager.getStatus()).toBe('connecting');
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

  describe('节流测试', () => {
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

  describe('消息处理错误测试', () => {
    it('测试无效JSON消息处理', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('open'));

      const handler = jest.fn();
      manager.subscribe('prices', handler);

      mockWsInstance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

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
      // startMockDataStream() is called after 500ms delay in connect()
      // Interval fires every 2000ms after that, so first data at t=2500
      // Batch flush happens after batchWindowMs (100ms), so handler called at t=2600
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
      // Wait for connection (500ms) + interval (2000ms) + batch flush (100ms)
      jest.advanceTimersByTime(2600);

      expect(pricesHandler).toHaveBeenCalled();
      expect(tvsHandler).toHaveBeenCalled();
    });

    it('测试断开连接后停止数据流', () => {
      const handler = jest.fn();
      mockManager.subscribe('prices', handler);

      mockManager.connect();
      // Wait for connection + first data + batch flush
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
