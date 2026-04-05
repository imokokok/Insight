import type { RetryConfig } from '../pythConstants';

export type { RetryConfig };

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface WebSocketConnectionState {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  lastUpdateLatency: number;
  reconnectAttempts: number;
  error: Error | null;
}

export type ConnectionStateListener = (state: WebSocketConnectionState) => void;

export interface PythPriceRaw {
  price: string | number;
  conf?: string | number;
  expo?: number;
  publish_time?: number;
}

export function isPythPriceRaw(data: unknown): data is PythPriceRaw {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.price === 'string' || typeof obj.price === 'number';
}
