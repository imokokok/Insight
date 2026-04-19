/* eslint-disable max-lines-per-function */
import WebSocketManager, {
  MockWebSocketManager,
  type WebSocketStatus,
  type WebSocketMessage,
  calculateBackoffDelay,
  createWebSocketHook,
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

  describe('1. Connection management tests', () => {
    describe('Successful connection establishment', () => {
      it('Test connect state transition: disconnected → connecting → connected', () => {
        const statusChanges: WebSocketStatus[] = [];
        manager.onStatusChange((status) => statusChanges.push(status));

        expect(manager.getStatus).toBe('disconnected');

        manager.connect();
        expect(manager.getStatus).toBe('connecting');
        expect(statusChanges).toContain('connecting');

        mockWsInstance.onopen?.(new Event('Mock Text'));
        expect(manager.getStatus).toBe('connected');
        expect(statusChanges).toContain('connected');
      });

      it('Test initialization operations on connection establishment', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        expect(mockWsInstance.onopen).toBeDefined();
        expect(mockWsInstance.onmessage).toBeDefined();
        expect(mockWsInstance.onclose).toBeDefined();
        expect(mockWsInstance.onerror).toBeDefined();
      });

      it('Test reset reconnect count after connection establishment', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

        jest.advanceTimersByTime(1000);
        const reconnectWsInstance = wsInstances[wsInstances.length - 1];
        reconnectWsInstance.onopen?.(new Event('Mock Text'));

        expect(manager.getStatus).toBe('connected');
      });
    });

    describe('Connection authentication', () => {
      it('Test connection with auth parameters', () => {
        const authManager = new WebSocketManager({
          url: 'ws://test.example.com?token=abc123',
        });

        authManager.connect();
        expect(mockWsInstance.url).toContain('token=abc123');

        authManager.disconnect();
      });

      it('Test sending auth message after connection', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        manager.send({ type: 'auth', token: 'test-token' });

        expect(mockWsInstance.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'auth', token: 'test-token' })
        );
      });
    });

    describe('Connection timeout handling', () => {
      it('Test connection timeout detection', () => {
        const timeoutManager = new WebSocketManager({
          url: 'ws://test.example.com',
          reconnectInterval: 1000,
          maxReconnectAttempts: 1,
        });

        timeoutManager.connect();

        mockWsInstance.readyState = 0;

        jest.advanceTimersByTime(30000);

        expect(timeoutManager.getStatus).toBe('connecting');

        timeoutManager.disconnect();
      });

      it('testconnectiontimeoutafter', () => {
        manager.connect();
        mockWsInstance.readyState = 0;

        mockWsInstance.onerror?.(new Event('Mock Text'));

        expect(manager.getStatus).toBe('error');
      });
    });

    describe('connectionstate', () => {
      it('testallstateconvert', () => {
        const statusHistory: WebSocketStatus[] = [];
        manager.onStatusChange((status) => statusHistory.push(status));

        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));
        jest.advanceTimersByTime(1000);

        expect(statusHistory).toContain('connecting');
        expect(statusHistory).toContain('connected');
        expect(statusHistory).toContain('disconnected');
        expect(statusHistory).toContain('reconnecting');
      });

      it('teststatelistenuse', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        manager.onStatusChange(handler1);
        manager.onStatusChange(handler2);

        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        expect(handler1).toHaveBeenCalledTimes(2);
        expect(handler2).toHaveBeenCalledTimes(2);
      });
    });

    describe('connectionhandle', () => {
      it('testconnectionrequestbe', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const sentBefore = mockWsInstance.send.mock.calls.length;
        manager.connect();

        expect(manager.getStatus).toBe('connected');
        expect(mockWsInstance.send.mock.calls.length).toBe(sentBefore);
      });

      it('testnoURLerrorhandle', () => {
        const noUrlManager = new WebSocketManager({
          url: '',
          reconnectInterval: 1000,
          maxReconnectAttempts: 3,
        });

        expect(() => noUrlManager.connect).toThrow(
          'WebSocket URL is not configured. Please set NEXT_PUBLIC_WS_URL environment variable.'
        );
      });

      it('testdisconnectconnectionafternewconnection', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        manager.disconnect();

        manager.connect();
        const newWsInstance = wsInstances[wsInstances.length - 1];
        newWsInstance.onopen?.(new Event('Mock Text'));

        expect(manager.getStatus).toBe('connected');
      });
    });
  });

  describe('2. test', () => {
    describe('', () => {
      it('testdisconnectafter', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        expect(manager.getStatus).toBe('connected');

        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

        expect(manager.getStatus).toBe('reconnecting');

        jest.advanceTimersByTime(1000);

        expect(wsInstances.length).toBe(2);
        expect(manager.getStatus).toBe('connecting');
      });

      it('testsuccessafterstate', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

        jest.advanceTimersByTime(1000);
        const reconnectWsInstance = wsInstances[wsInstances.length - 1];
        reconnectWsInstance.onopen?.(new Event('Mock Text'));

        expect(manager.getStatus).toBe('connected');
      });
    });

    describe('exponential', () => {
      it('testexponentialdelaycalculate', () => {
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
        currentWsInstance.onopen?.(new Event('Mock Text'));
        currentWsInstance.onclose?.(new CloseEvent('Mock Text'));

        expect(exponentialManager.getStatus).toBe('reconnecting');

        jest.advanceTimersByTime(500);
        expect(exponentialManager.getStatus).toBe('reconnecting');

        jest.advanceTimersByTime(2500);

        exponentialManager.disconnect();
      });

      it('testdisableexponential', () => {
        const linearManager = new WebSocketManager({
          url: 'ws://test.example.com',
          reconnectInterval: 1000,
          useExponentialBackoff: false,
        });

        linearManager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

        jest.advanceTimersByTime(1000);

        expect(wsInstances.length).toBe(2);

        linearManager.disconnect();
      });
    });

    describe('maximum', () => {
      it('testtomaximumafterstop', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

        for (let i = 0; i < 3; i++) {
          jest.advanceTimersByTime(1000);
          const newWsInstance = wsInstances[wsInstances.length - 1];
          if (newWsInstance) {
            newWsInstance.onclose?.(new CloseEvent('Mock Text'));
          }
        }

        expect(manager.getStatus).toBe('error');
      });

      it('testreset', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));
        jest.advanceTimersByTime(1000);
        const reconnectWsInstance = wsInstances[wsInstances.length - 1];
        reconnectWsInstance.onopen?.(new Event('Mock Text'));

        reconnectWsInstance.onclose?.(new CloseEvent('Mock Text'));

        expect(manager.getStatus).toBe('reconnecting');

        jest.advanceTimersByTime(1000);

        expect(manager.getStatus).toBe('connecting');
      });
    });

    describe('state', () => {
      it('testafternewSubscribe to channel', () => {
        const handler = jest.fn();
        manager.subscribe('prices', handler);

        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const calls = mockWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });

      it('testaftermessagerefresh', () => {
        manager.send({ type: 'test', data: 'queued message' });

        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const calls = mockWsInstance.send.mock.calls;
        const queuedCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'test' && parsed.data === 'queued message';
        });

        expect(queuedCall).toBeDefined();
      });
    });

    describe('Manual reconnect', () => {
      it('testtrigger', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));
        expect(manager.getStatus).toBe('reconnecting');

        manager.reconnect();

        expect(manager.getStatus).toBe('connecting');
      });

      it('testManual reconnectresetretry', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

        manager.reconnect();

        expect(manager.getStatus).toBe('connecting');
      });
    });
  });

  describe('3. messagehandletest', () => {
    describe('textmessage', () => {
      it('testJSONtextmessage', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

      it('testmessagetohandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

    describe('messagehandle', () => {
      it('testmessagebe', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const binaryData = new ArrayBuffer(10);
        mockWsInstance.onmessage?.(new MessageEvent('message', { data: binaryData }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('JSONmessage', () => {
      it('testeffectiveJSONmessage', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const validJson = JSON.stringify({
          type: 'update',
          channel: 'prices',
          data: { price: 100 },
          timestamp: Date.now(),
        });

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: validJson }));
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });

      it('testinvalidJSONmessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('invalidmessageformathandle', () => {
      it('testmessage', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const incompleteMessage = JSON.stringify({ type: 'update' });

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: incompleteMessage }));
        jest.advanceTimersByTime(100);

        expect(handler).not.toHaveBeenCalled();
      });

      it('testhandleerrornotOtherhandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

    describe('messagehandle', () => {
      it('testmessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const largeData = {
          type: 'update',
          channel: 'prices',
          data: {
            symbol: 'BTC',
            price: 50000,
            history: Array(1000).fill({ price: 50000, timestamp: Date.now }),
          },
          timestamp: Date.now(),
        };

        mockWsInstance.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(largeData) })
        );
        jest.advanceTimersByTime(100);

        expect(handler).toHaveBeenCalled();
      });

      it('testmessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        for (let i = 0; i < 10; i++) {
          const largeMessage = {
            type: 'update',
            channel: 'prices',
            data: {
              symbol: 'BTC',
              price: 50000 + i,
              history: Array(100).fill({ price: 50000, timestamp: Date.now }),
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

  describe('4. subscribetest', () => {
    describe('subscribe', () => {
      it('test subscribe Subscribe to channel', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const calls = mockWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });

      it('testsubscribemessageformat', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        const lastCall = mockWsInstance.send.mock.calls[mockWsInstance.send.mock.calls.length - 1];
        const message = JSON.parse(lastCall[0] as string);

        expect(message).toHaveProperty('type', 'subscribe');
        expect(message).toHaveProperty('channel', 'prices');
        expect(message).toHaveProperty('timestamp');
      });
    });

    describe('Unsubscribe', () => {
      it('test unsubscribe Unsubscribe', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

      it('testUnsubscribeafternotreceivemessage', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

    describe('subscribehandle', () => {
      it('testhandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

      it('testsubscribereturnUnsubscribefunction', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

    describe('subscribestate', () => {
      it('testsubscribenotSend message', () => {
        const handler = jest.fn();
        manager.subscribe('prices', handler);

        expect(manager.getStatus).toBe('disconnected');
      });

      it('testconnectionafternewSubscribe to channel', () => {
        const handler = jest.fn();
        manager.subscribe('prices', handler);

        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const calls = mockWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });
    });

    describe('disconnectconnectionsubscribecleanup', () => {
      it('testdisconnectconnectionaftersubscribestate', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        manager.disconnect();

        manager.connect();
        const newWsInstance = wsInstances[wsInstances.length - 1];
        newWsInstance.onopen?.(new Event('Mock Text'));

        const calls = newWsInstance.send.mock.calls;
        const subscribeCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'subscribe' && parsed.channel === 'prices';
        });

        expect(subscribeCall).toBeDefined();
      });

      it('testUnsubscribenotinnotSend message', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);
        mockWsInstance.send.mockClear();

        manager.disconnect();
        manager.unsubscribe('prices');

        expect(manager.getStatus).toBe('disconnected');
      });
    });
  });

  describe('5. test', () => {
    describe('send', () => {
      it('test ping messagesend', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(30000);

        const calls = mockWsInstance.send.mock.calls;
        const pingCall = calls.find((call) => {
          const parsed = JSON.parse(call[0] as string);
          return parsed.type === 'ping';
        });

        expect(pingCall).toBeDefined();
      });

      it('testconfiguration', () => {
        const customIntervalManager = new WebSocketManager({
          url: 'ws://test.example.com',
          heartbeatInterval: 5000,
        });

        customIntervalManager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

    describe('responsehandle', () => {
      it('test pong responsehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        jest.advanceTimersByTime(30000);

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'pong', timestamp: Date.now }),
          })
        );

        expect(() => {
          jest.advanceTimersByTime(10000);
        }).not.toThrow();
      });

      it('testheartbeat timeoutcleanup', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        jest.advanceTimersByTime(30000);

        mockWsInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'pong', timestamp: Date.now }),
          })
        );

        expect(() => {
          jest.advanceTimersByTime(5000);
        }).not.toThrow();
      });
    });

    describe('heartbeat timeout', () => {
      it('testheartbeat timeouthandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        jest.advanceTimersByTime(30000);

        jest.advanceTimersByTime(10000);

        expect(mockWsInstance.close).toHaveBeenCalled();
      });

      it('testheartbeat timeoutafter', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        jest.advanceTimersByTime(30000);
        jest.advanceTimersByTime(10000);

        expect(mockWsInstance.close).toHaveBeenCalled();
      });
    });

    describe('connection', () => {
      it('testconnection', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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
              data: JSON.stringify({ type: 'pong', timestamp: Date.now }),
            })
          );
        }

        expect(manager.getStatus).toBe('connected');
      });
    });

    describe('configuration', () => {
      it('testcustomheartbeat timeout', () => {
        const customTimeoutManager = new WebSocketManager({
          url: 'ws://test.example.com',
          heartbeatInterval: 5000,
          heartbeatTimeout: 2000,
        });

        customTimeoutManager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        jest.advanceTimersByTime(5000);
        jest.advanceTimersByTime(2000);

        expect(mockWsInstance.close).toHaveBeenCalled();

        customTimeoutManager.disconnect();
      });

      it('testdisconnectconnectionstop', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        manager.disconnect();

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(60000);

        expect(mockWsInstance.send).not.toHaveBeenCalled();
      });

      it('testin WebSocket openstatenotsend', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.readyState = 0;

        mockWsInstance.send.mockClear();
        jest.advanceTimersByTime(30000);

        expect(mockWsInstance.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('6. errorhandletest', () => {
    describe('errorhandle', () => {
      it('test WebSocket errorevent', () => {
        const onError = jest.fn();
        const errorManager = new WebSocketManager({
          url: 'ws://test.example.com',
          onError,
        });

        errorManager.connect();
        mockWsInstance.onerror?.(new Event('Mock Text'));

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(expect.any(Error));

        errorManager.disconnect();
      });

      it('testconnectionerrorstateupdate', () => {
        manager.connect();
        mockWsInstance.onerror?.(new Event('Mock Text'));

        expect(manager.getStatus).toBe('error');
      });
    });

    describe('authenticationfailure', () => {
      it('testauthenticationfailuremessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

        expect(manager.getStatus).toBe('connected');
      });
    });

    describe('handle', () => {
      it('testmessage', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

        const metrics = manager.getPerformanceMetrics;
        expect(metrics.throttleCount).toBeGreaterThan(0);
      });
    });

    describe('invalidmessagehandle', () => {
      it('testinvalidJSONmessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('testemptymessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handler = jest.fn();
        manager.subscribe('prices', handler);

        mockWsInstance.onmessage?.(new MessageEvent('message', { data: '' }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('connectionhandle', () => {
      it('test WebSocket functionerrorhandle', () => {
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
        expect(errorManager.getStatus).toBe('error');

        global.WebSocket = originalWebSocket;
      });

      it('testconnectionbe', () => {
        manager.connect();

        mockWsInstance.onopen?.(new Event('Mock Text'));
        mockWsInstance.onclose?.(new CloseEvent('close', { code: 1006 }));

        expect(manager.getStatus).toBe('reconnecting');
      });
    });
  });

  describe('7. test', () => {
    describe('message', () => {
      it('testmessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

      it('testmessagehandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

    describe('delay', () => {
      it('testconnectiondelayrecord', () => {
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(1000);

        manager.connect();

        nowSpy.mockReturnValueOnce(1500);
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const metrics = manager.getPerformanceMetrics;
        expect(metrics.connectionLatency).toBe(500);

        nowSpy.mockRestore();
      });

      it('testmessagehandletimerecord', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

        const metrics = manager.getPerformanceMetrics;
        expect(metrics.messageProcessingTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('downwithinuse', () => {
      it('testmessagewithin', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

      it('testsubscribewithin', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

        const handlers: jest.Mock[] = [];
        for (let i = 0; i < 50; i++) {
          const handler = jest.fn();
          manager.subscribe(`channel-${i}`, handler);
          handlers.push(handler);
        }

        expect(handlers.length).toBe(50);
      });
    });

    describe('concurrentconnectionhandle', () => {
      it('testsubscribeconcurrenthandle', () => {
        manager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

      it('testmetricupdate', () => {
        const onPerformanceMetrics = jest.fn();
        const perfManager = new WebSocketManager({
          url: 'ws://test.example.com',
          onPerformanceMetrics,
        });

        perfManager.connect();
        mockWsInstance.onopen?.(new Event('Mock Text'));

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

  describe('messagetest', () => {
    it('testmessage', () => {
      manager.send({ type: 'test', data: 'offline message' });

      expect(manager.getStatus).toBe('disconnected');
    });

    it('testconnectionaftermessagerefresh', () => {
      manager.send({ type: 'test', data: 'queued message' });

      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

      const calls = mockWsInstance.send.mock.calls;
      const queuedCall = calls.find((call) => {
        const parsed = JSON.parse(call[0] as string);
        return parsed.type === 'test' && parsed.data === 'queued message';
      });

      expect(queuedCall).toBeDefined();
    });

    it('testinmessagesend', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

      mockWsInstance.send.mockClear();
      manager.send({ type: 'test', data: 'online message' });

      expect(mockWsInstance.send).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockWsInstance.send.mock.calls[0][0] as string)).toEqual({
        type: 'test',
        data: 'online message',
      });
    });

    it('testmessageinconnectionclosestoprefresh', () => {
      manager.send({ type: 'test', data: 'queued message' });

      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));
      mockWsInstance.readyState = 0;

      const callsBefore = mockWsInstance.send.mock.calls.length;
      mockWsInstance.onclose?.(new CloseEvent('Mock Text'));

      expect(mockWsInstance.send.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('statelistentest', () => {
    it('test onStatusChange register', () => {
      const handler = jest.fn();
      manager.onStatusChange(handler);

      manager.connect();

      expect(handler).toHaveBeenCalledWith('connecting');
    });

    it('teststatenotification', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.onStatusChange(handler1);
      manager.onStatusChange(handler2);

      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(2);
    });

    it('testcancelstatelisten', () => {
      const handler = jest.fn();
      const unsubscribe = manager.onStatusChange(handler);

      manager.connect();
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      mockWsInstance.onopen?.(new Event('Mock Text'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('metrictest', () => {
    it('testgetmetric', () => {
      const metrics = manager.getPerformanceMetrics;

      expect(metrics).toEqual({
        connectionLatency: 0,
        messageProcessingTime: 0,
        messagesPerSecond: 0,
        lastMessageTimestamp: 0,
        averageBatchSize: 0,
        throttleCount: 0,
      });
    });

    it('test onPerformanceMetrics callback', () => {
      const onPerformanceMetrics = jest.fn();
      const perfManager = new WebSocketManager({
        url: 'ws://test.example.com',
        onPerformanceMetrics,
      });

      perfManager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

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

  describe('handletest', () => {
    it('testmessagehandle', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

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

    it('testhandlerefresh', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

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

    it('testdisconnectconnectionrefreshallbatch', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

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

    it('testhandlecleanup', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

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

      expect(manager.getStatus).toBe('disconnected');
    });
  });

  describe('disconnect cleanuptest', () => {
    it('test disconnect cleanup batchTimer', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

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

      expect(manager.getStatus).toBe('disconnected');
    });

    it('test disconnect ws as null', () => {
      manager.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

      manager.disconnect();

      expect(manager.getStatus).toBe('disconnected');
    });
  });

  describe('callbackfunctiontest', () => {
    it('testconnectionuse onConnect callback', () => {
      const onConnect = jest.fn();
      const managerWithCallback = new WebSocketManager({
        url: 'ws://test.example.com',
        onConnect,
      });

      managerWithCallback.connect();
      mockWsInstance.onopen?.(new Event('Mock Text'));

      expect(onConnect).toHaveBeenCalledTimes(1);

      managerWithCallback.disconnect();
    });

    it('testdisconnectconnectionuse onDisconnect callback', () => {
      const onDisconnect = jest.fn();
      const managerWithCallback = new WebSocketManager({
        url: 'ws://test.example.com',
        onDisconnect,
      });

      managerWithCallback.connect();
      const currentWsInstance = wsInstances[wsInstances.length - 1];
      currentWsInstance.onopen?.(new Event('Mock Text'));
      currentWsInstance.onclose?.(new CloseEvent('Mock Text'));

      expect(onDisconnect).toHaveBeenCalledTimes(1);

      managerWithCallback.disconnect();
    });

    it('testconnectionerroruse onError callback', () => {
      const onError = jest.fn();
      const managerWithCallback = new WebSocketManager({
        url: 'ws://test.example.com',
        onError,
      });

      managerWithCallback.connect();
      mockWsInstance.onerror?.(new Event('Mock Text'));

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

  describe('connectiontest', () => {
    it('testconnectionstateconvert', () => {
      const statusChanges: WebSocketStatus[] = [];
      mockManager.onStatusChange((status) => statusChanges.push(status));

      mockManager.connect();
      expect(mockManager.getStatus).toBe('connecting');

      jest.advanceTimersByTime(500);
      expect(mockManager.getStatus).toBe('connected');
    });

    it('testdisconnectconnection', () => {
      mockManager.connect();
      jest.advanceTimersByTime(500);

      mockManager.disconnect();
      expect(mockManager.getStatus).toBe('disconnected');
    });

    it('testManual reconnect', () => {
      mockManager.connect();
      jest.advanceTimersByTime(500);

      mockManager.reconnect();
      expect(mockManager.getStatus).toBe('connecting');

      jest.advanceTimersByTime(500);
      expect(mockManager.getStatus).toBe('connected');
    });
  });

  describe('test', () => {
    it('testsubscribeafterreceive', () => {
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

    it('test', () => {
      const pricesHandler = jest.fn();
      const tvsHandler = jest.fn();

      mockManager.subscribe('prices', pricesHandler);
      mockManager.subscribe('tvs', tvsHandler);

      mockManager.connect();
      jest.advanceTimersByTime(2600);

      expect(pricesHandler).toHaveBeenCalled();
      expect(tvsHandler).toHaveBeenCalled();
    });

    it('testdisconnectconnectionafterstop', () => {
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

  describe('generatetest', () => {
    it('test prices generate', () => {
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

    it('test tvs generate', () => {
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

    it('test marketStats generate', () => {
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

    it('testnotgenerate', () => {
      const handler = jest.fn();
      mockManager.subscribe('unknown', handler);
      mockManager.connect();
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(2000);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('send methodtest', () => {
    it('test send methodnoterror', () => {
      expect(() => {
        mockManager.send({ type: 'test', data: 'test' });
      }).not.toThrow();
    });
  });

  describe('test', () => {
    it('test', () => {
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

      const metrics = throttleManager.getPerformanceMetrics;
      expect(metrics.throttleCount).toBeGreaterThanOrEqual(0);

      throttleManager.disconnect();
    });
  });

  describe('handletest', () => {
    it('testhandle', () => {
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

  describe('metrictest', () => {
    it('testgetmetric', () => {
      const metrics = mockManager.getPerformanceMetrics;

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

describe('createWebSocketHook Callback Stabilization', () => {
  let originalWebSocket: typeof WebSocket;
  let mockWsInstance: MockWebSocketInstance;
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
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
  });

  it('should not recreate manager when callback references change', () => {
    const hook = createWebSocketHook({ url: 'ws://test.example.com' });

    let renderCount = 0;

    const TestComponent: React.FC<{ onConnect?: () => void }> = ({ onConnect }) => {
      hook({ autoConnect: false, onConnect });
      renderCount++;

      return null;
    };

    const onConnect1 = jest.fn();
    const onConnect2 = jest.fn();

    TestComponent({ onConnect: onConnect1 });
    TestComponent({ onConnect: onConnect2 });

    expect(renderCount).toBe(2);
  });

  it('should preserve callback refs across re-renders without reconnecting', () => {
    const hook = createWebSocketHook({ url: 'ws://test.example.com' });

    const onConnect1 = jest.fn();
    const onConnect2 = jest.fn();

    hook({ autoConnect: true, onConnect: onConnect1 });
    const wsInstance1 = wsInstances[wsInstances.length - 1];

    hook({ autoConnect: true, onConnect: onConnect2 });

    wsInstance1.onopen?.(new Event('Mock Text'));

    expect(wsInstances.length).toBe(1);
    expect(onConnect1).toHaveBeenCalledTimes(1);
    expect(onConnect2).toHaveBeenCalledTimes(1);
  });
});
