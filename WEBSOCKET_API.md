# WebSocket API Documentation

## Insight Oracle Data Analytics Platform

This document provides comprehensive documentation for the WebSocket real-time data streaming functionality in the Insight Oracle Data Analytics Platform.

---

## Table of Contents

1. [Connection](#connection)
2. [Configuration Options](#configuration-options)
3. [Message Types](#message-types)
4. [Available Channels](#available-channels)
5. [Message Format](#message-format)
6. [Data Payloads](#data-payloads)
7. [Reconnection Strategy](#reconnection-strategy)
8. [Heartbeat Mechanism](#heartbeat-mechanism)
9. [React Hook Usage](#react-hook-usage)
10. [Error Handling](#error-handling)

---

## Connection

### WebSocket URL Configuration

The WebSocket server URL is configured via the `NEXT_PUBLIC_WS_URL` environment variable:

```bash
NEXT_PUBLIC_WS_URL=wss://api.example.com/ws
```

If this environment variable is not configured, a warning will be logged and real-time features will be disabled.

### Connection States

The WebSocket connection can be in one of the following states:

| State          | Description                              |
| -------------- | ---------------------------------------- |
| `connecting`   | Connection is being established          |
| `connected`    | Connection is active and ready           |
| `disconnected` | Connection is closed                     |
| `reconnecting` | Attempting to reconnect after disconnect |
| `error`        | Connection encountered an error          |

### Auto-Connect Behavior

By default, the WebSocket connection is established automatically when using the `useWebSocket` hook. This can be disabled by setting `autoConnect: false` in the hook options.

### Mock WebSocket for Development

For development and testing purposes, a mock WebSocket implementation is available. It simulates real-time data streaming without requiring an actual WebSocket server.

```typescript
const { status, lastMessage } = useWebSocket({
  useMock: true,
  channels: ['prices', 'tvs'],
});
```

---

## Configuration Options

The WebSocket manager accepts the following configuration options:

| Option                  | Type      | Default | Description                                      |
| ----------------------- | --------- | ------- | ------------------------------------------------ |
| `url`                   | `string`  | -       | WebSocket server URL (required)                  |
| `reconnectInterval`     | `number`  | `3000`  | Base interval between reconnection attempts (ms) |
| `maxReconnectAttempts`  | `number`  | `5`     | Maximum number of reconnection attempts          |
| `heartbeatInterval`     | `number`  | `30000` | Interval for sending heartbeat pings (ms)        |
| `heartbeatTimeout`      | `number`  | `10000` | Timeout for heartbeat response (ms)              |
| `useExponentialBackoff` | `boolean` | `false` | Enable exponential backoff for reconnection      |

### Configuration Example

```typescript
import WebSocketManager from '@/lib/realtime/websocket';

const wsManager = new WebSocketManager({
  url: 'wss://api.example.com/ws',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  useExponentialBackoff: false,
  onConnect: () => console.log('Connected!'),
  onDisconnect: () => console.log('Disconnected!'),
  onError: (error) => console.error('Error:', error),
});
```

---

## Message Types

The WebSocket protocol supports the following message types:

| Type          | Direction       | Description                |
| ------------- | --------------- | -------------------------- |
| `subscribe`   | Client → Server | Subscribe to a channel     |
| `unsubscribe` | Client → Server | Unsubscribe from a channel |
| `ping`        | Client → Server | Heartbeat ping             |
| `pong`        | Server → Client | Heartbeat response         |
| `update`      | Server → Client | Data update message        |

### Subscribe Message

```json
{
  "type": "subscribe",
  "channel": "prices",
  "timestamp": 1699999999999
}
```

### Unsubscribe Message

```json
{
  "type": "unsubscribe",
  "channel": "prices",
  "timestamp": 1699999999999
}
```

### Ping Message

```json
{
  "type": "ping",
  "timestamp": 1699999999999
}
```

---

## Available Channels

The following channels are available for subscription:

| Channel          | Description                               | Update Frequency |
| ---------------- | ----------------------------------------- | ---------------- |
| `prices`         | Real-time price updates for oracle assets | ~2s (mock)       |
| `tvs`            | Total Value Secured updates by oracle     | ~2s (mock)       |
| `marketStats`    | Market statistics updates                 | ~2s (mock)       |
| `uma:prices`     | UMA-specific price updates                | ~2s (mock)       |
| `uma:disputes`   | UMA dispute status updates                | ~2s (mock)       |
| `uma:validators` | UMA validator activity updates            | ~2s (mock)       |

---

## Message Format

All WebSocket messages follow a consistent TypeScript interface:

```typescript
interface WebSocketMessage<T = unknown> {
  type: string;
  channel: string;
  data: T;
  timestamp: number;
}
```

### Example Message

```json
{
  "type": "update",
  "channel": "prices",
  "data": {
    "symbol": "BTC",
    "price": 45000.0,
    "change24h": 2.5,
    "timestamp": 1699999999999
  },
  "timestamp": 1699999999999
}
```

---

## Data Payloads

### Price Data (`prices` channel)

```typescript
interface PriceData {
  symbol: string; // Asset symbol (e.g., 'BTC', 'ETH', 'LINK', 'PYTH', 'BAND')
  price: number; // Current price in USD
  change24h: number; // 24-hour price change percentage
  timestamp: number; // Unix timestamp in milliseconds
}
```

**Example:**

```json
{
  "symbol": "BTC",
  "price": 45000.0,
  "change24h": 2.5,
  "timestamp": 1699999999999
}
```

### TVS Data (`tvs` channel)

```typescript
interface TVSData {
  oracle: string; // Oracle name (e.g., 'Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'UMA')
  tvs: number; // Total Value Secured in billions USD
  change24h: number; // 24-hour TVS change percentage
  timestamp: number; // Unix timestamp in milliseconds
}
```

**Example:**

```json
{
  "oracle": "Chainlink",
  "tvs": 8.5,
  "change24h": 1.2,
  "timestamp": 1699999999999
}
```

### Market Stats (`marketStats` channel)

```typescript
interface MarketStats {
  totalTVS: number; // Total Value Secured across all oracles (billions USD)
  totalChains: number; // Number of supported chains
  totalProtocols: number; // Number of integrated protocols
  marketDominance: number; // Market dominance percentage
  avgUpdateLatency: number; // Average update latency in milliseconds
  timestamp: number; // Unix timestamp in milliseconds
}
```

**Example:**

```json
{
  "totalTVS": 18.5,
  "totalChains": 12,
  "totalProtocols": 135,
  "marketDominance": 48.5,
  "avgUpdateLatency": 250,
  "timestamp": 1699999999999
}
```

### UMA Price Data (`uma:prices` channel)

```typescript
interface UMAPriceData {
  symbol: string; // Asset symbol (e.g., 'BTC', 'ETH', 'UMA', 'USDC', 'DAI')
  price: number; // Current price in USD
  change24h: number; // 24-hour price change percentage
  timestamp: number; // Unix timestamp in milliseconds
  confidence: number; // Confidence level (0-1)
  source: string; // Data source identifier
}
```

**Example:**

```json
{
  "symbol": "UMA",
  "price": 5.25,
  "change24h": -1.5,
  "timestamp": 1699999999999,
  "confidence": 0.98,
  "source": "UMA Optimistic Oracle"
}
```

### UMA Dispute Data (`uma:disputes` channel)

```typescript
interface UMADisputeData {
  id: string; // Dispute identifier
  timestamp: number; // Unix timestamp in milliseconds
  status: 'active' | 'resolved' | 'rejected';
  type: 'price' | 'state' | 'liquidation' | 'other';
  reward: number; // Reward amount in tokens
  resolutionTime?: number; // Resolution time in hours (if resolved)
  transactionHash: string; // Transaction hash (0x-prefixed)
}
```

**Example:**

```json
{
  "id": "dispute-123",
  "timestamp": 1699999999999,
  "status": "resolved",
  "type": "price",
  "reward": 3500,
  "resolutionTime": 24,
  "transactionHash": "0x1234567890abcdef..."
}
```

### UMA Validator Data (`uma:validators` channel)

```typescript
interface UMAValidatorData {
  validatorId: string; // Validator identifier
  timestamp: number; // Unix timestamp in milliseconds
  responseTime: number; // Response time in milliseconds
  successRate: number; // Success rate percentage (0-100)
  staked: number; // Staked amount in tokens
  earnings: number; // Total earnings in tokens
}
```

**Example:**

```json
{
  "validatorId": "validator-5",
  "timestamp": 1699999999999,
  "responseTime": 150,
  "successRate": 98.5,
  "staked": 350000,
  "earnings": 5500
}
```

---

## Reconnection Strategy

### Automatic Reconnection

The WebSocket manager automatically attempts to reconnect when the connection is closed or encounters an error.

### Reconnection Flow

```
Disconnect → Reconnecting → Connect → Connected
                  ↓ (max attempts reached)
                Error
```

### Exponential Backoff

When `useExponentialBackoff` is enabled, the reconnection delay increases exponentially:

```typescript
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000; // Add jitter
}
```

**Backoff Example (baseDelay: 3000ms):**

| Attempt | Delay             |
| ------- | ----------------- |
| 1       | ~3000ms           |
| 2       | ~6000ms           |
| 3       | ~12000ms          |
| 4       | ~24000ms          |
| 5       | ~30000ms (capped) |

### Channel Resubscription

Upon successful reconnection, all previously subscribed channels are automatically resubscribed:

```typescript
protected resubscribeChannels(): void {
  this.subscribedChannels.forEach((channel) => {
    this.send({
      type: 'subscribe',
      channel,
      timestamp: Date.now(),
    });
  });
}
```

---

## Heartbeat Mechanism

The heartbeat mechanism ensures the connection remains active and detects stale connections.

### Heartbeat Flow

```
Client                          Server
   |                               |
   |--- ping (every 30s) --------->|
   |                               |
   |<---------- pong --------------|
   |                               |
   |  (reset timeout timer)        |
   |                               |
```

### Configuration

| Parameter           | Default | Description                    |
| ------------------- | ------- | ------------------------------ |
| `heartbeatInterval` | 30000ms | Interval between ping messages |
| `heartbeatTimeout`  | 10000ms | Time to wait for pong response |

### Timeout Handling

If no `pong` response is received within the timeout period, the connection is closed and reconnection is attempted:

```typescript
this.heartbeatTimeoutTimer = setTimeout(() => {
  logger.warn('Heartbeat timeout, reconnecting...');
  this.ws?.close();
}, this.config.heartbeatTimeout);
```

---

## React Hook Usage

### Basic Usage

```typescript
import { useWebSocket } from '@/lib/realtime/websocket';

function PriceDisplay() {
  const { status, lastMessage, lastUpdated } = useWebSocket<{
    symbol: string;
    price: number;
  }>({
    channels: ['prices'],
    autoConnect: true,
  });

  if (status !== 'connected') {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      <p>Symbol: {lastMessage?.data.symbol}</p>
      <p>Price: ${lastMessage?.data.price}</p>
      <p>Last Updated: {lastUpdated?.toLocaleTimeString()}</p>
    </div>
  );
}
```

### Hook Options

```typescript
interface UseWebSocketOptions {
  url?: string; // Override default WebSocket URL
  channels?: string[]; // Channels to subscribe to
  autoConnect?: boolean; // Auto-connect on mount (default: true)
  useMock?: boolean; // Use mock WebSocket (default: false)
}
```

### Return Values

```typescript
interface UseWebSocketReturn<T> {
  status: WebSocketStatus; // Current connection status
  lastMessage: WebSocketMessage<T> | null; // Last received message
  lastUpdated: Date | null; // Timestamp of last update
  connect: () => void; // Connect to server
  disconnect: () => void; // Disconnect from server
  reconnect: () => void; // Reconnect to server
  send: (message: Record<string, unknown>) => void; // Send message
  subscribe: <U>(channel: string, handler: MessageHandler<U>) => void; // Subscribe to channel
  isConnected: boolean; // true if status === 'connected'
  isConnecting: boolean; // true if status === 'connecting'
  isReconnecting: boolean; // true if status === 'reconnecting'
}
```

### Manual Connection Control

```typescript
function ManualConnection() {
  const { status, connect, disconnect, reconnect } = useWebSocket({
    autoConnect: false,
    channels: ['marketStats'],
  });

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <button onClick={reconnect}>Reconnect</button>
    </div>
  );
}
```

### Dynamic Channel Subscription

```typescript
function DynamicSubscription() {
  const { subscribe, status } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (status === 'connected') {
      const unsubscribe = subscribe('prices', (message) => {
        console.log('Price update:', message.data);
      });

      return () => unsubscribe?.();
    }
  }, [status, subscribe]);
}
```

### Multiple Channels

```typescript
function MultiChannelDashboard() {
  const { lastMessage, status } = useWebSocket({
    channels: ['prices', 'tvs', 'marketStats'],
  });

  return (
    <div>
      <p>Channel: {lastMessage?.channel}</p>
      <p>Data: {JSON.stringify(lastMessage?.data)}</p>
    </div>
  );
}
```

### Using Mock WebSocket

```typescript
function DevelopmentMode() {
  const { status, lastMessage } = useWebSocket({
    useMock: true,
    channels: ['prices', 'uma:disputes'],
  });

  return (
    <div>
      <p>Using mock data for development</p>
      <p>Status: {status}</p>
      <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
    </div>
  );
}
```

---

## Error Handling

### Connection Errors

Connection errors are handled through the `onError` callback and status updates:

```typescript
const wsManager = new WebSocketManager({
  url: 'wss://api.example.com/ws',
  onError: (error: Error) => {
    console.error('WebSocket error:', error.message);
  },
});

// Or via status handler
wsManager.onStatusChange((status) => {
  if (status === 'error') {
    console.error('Connection failed');
  }
});
```

### Message Parsing Errors

Invalid JSON messages are caught and logged:

```typescript
protected handleMessage(data: string): void {
  try {
    const message: WebSocketMessage = JSON.parse(data);
    // Process message...
  } catch (error) {
    logger.error('Failed to parse WebSocket message', error as Error);
  }
}
```

### Handler Errors

Errors in message handlers are isolated to prevent cascading failures:

```typescript
handlers.forEach((handler) => {
  try {
    handler(message);
  } catch (error) {
    logger.error('Error in message handler', error as Error);
  }
});
```

### Error Recovery Pattern

```typescript
function ErrorRecoveryExample() {
  const { status, reconnect, lastMessage } = useWebSocket({
    channels: ['prices'],
  });

  useEffect(() => {
    if (status === 'error') {
      const timer = setTimeout(() => {
        reconnect();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, reconnect]);

  if (status === 'error') {
    return (
      <div>
        <p>Connection error. Retrying in 5 seconds...</p>
        <button onClick={reconnect}>Retry Now</button>
      </div>
    );
  }

  return <div>{/* Normal rendering */}</div>;
}
```

---

## Message Queue

Messages sent while disconnected are queued and sent upon reconnection:

```typescript
send(message: Record<string, unknown>): void {
  const messageStr = JSON.stringify(message);

  if (this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
    this.ws.send(messageStr);
  } else {
    this.messageQueue.push(messageStr);
    logger.warn('WebSocket not connected, message queued');
  }
}
```

Queued messages are flushed when the connection is established:

```typescript
protected flushMessageQueue(): void {
  while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
    const message = this.messageQueue.shift();
    if (message) {
      this.ws.send(message);
    }
  }
}
```

---

## TypeScript Types

All TypeScript interfaces are exported for use in your application:

```typescript
import {
  WebSocketStatus,
  WebSocketMessage,
  WebSocketConfig,
  MessageHandler,
  StatusHandler,
  UseWebSocketOptions,
} from '@/lib/realtime/websocket';
```

---

## Best Practices

1. **Always handle connection states**: Show appropriate UI feedback for connecting, disconnected, and error states.

2. **Use TypeScript generics**: Type your message data for better type safety.

3. **Clean up subscriptions**: The hook handles cleanup automatically, but if using the manager directly, ensure you call the unsubscribe function.

4. **Use mock mode in development**: Enable `useMock: true` for development without a backend server.

5. **Implement error boundaries**: Wrap WebSocket-dependent components in error boundaries for graceful degradation.

6. **Monitor connection health**: Use the heartbeat mechanism to detect and recover from stale connections.

---

## Environment Variables

| Variable             | Required | Description                                                        |
| -------------------- | -------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_WS_URL` | No       | WebSocket server URL. If not set, real-time features are disabled. |

---

## Related Files

- [src/lib/realtime/websocket.ts](src/lib/realtime/websocket.ts) - WebSocket manager implementation
