'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

import {
  useWebSocket,
  type WebSocketMessage,
  type PerformanceMetrics,
  type WebSocketStatus,
} from './websocket';

export type { WebSocketMessage, PerformanceMetrics, WebSocketStatus };

interface UMAWebSocketContextValue {
  subscribe: <T>(
    channel: string,
    handler: (message: WebSocketMessage<T>) => void
  ) => (() => void) | undefined;
  status: WebSocketStatus;
  performanceMetrics: PerformanceMetrics | null;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
}

const UMAWebSocketContext = createContext<UMAWebSocketContextValue | null>(null);

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.example.com/ws';

const UMA_CHANNELS = [
  'uma:prices',
  'uma:disputes',
  'uma:validators',
  'uma:network',
  'uma:requests',
] as const;

export type UMAChannel = (typeof UMA_CHANNELS)[number];

interface SubscriptionEntry {
  handler: (message: WebSocketMessage<unknown>) => void;
  id: number;
}

interface ChannelSubscriptionManager {
  subscribe<T>(channel: string, handler: (message: WebSocketMessage<T>) => void): () => void;
  getActiveChannels(): string[];
}

function useChannelSubscriptionManager(
  subscribeFn: <T>(
    channel: string,
    handler: (message: WebSocketMessage<T>) => void
  ) => (() => void) | undefined
): ChannelSubscriptionManager {
  const subscriptionsRef = useRef<Map<string, Map<number, SubscriptionEntry>>>(new Map());
  const subscriptionIdRef = useRef(0);

  const subscribe = useCallback(
    <T,>(channel: string, handler: (message: WebSocketMessage<T>) => void) => {
      const id = subscriptionIdRef.current++;

      if (!subscriptionsRef.current.has(channel)) {
        subscriptionsRef.current.set(channel, new Map());
      }

      const channelSubs = subscriptionsRef.current.get(channel)!;
      const typedHandler = handler as (message: WebSocketMessage<unknown>) => void;
      channelSubs.set(id, { handler: typedHandler, id });

      const unsubscribe = subscribeFn(channel, (message) => {
        const subs = subscriptionsRef.current.get(channel);
        if (subs) {
          subs.forEach((entry) => {
            entry.handler(message as WebSocketMessage<unknown>);
          });
        }
      });

      return () => {
        const subs = subscriptionsRef.current.get(channel);
        if (subs) {
          subs.delete(id);
          if (subs.size === 0) {
            subscriptionsRef.current.delete(channel);
            unsubscribe?.();
          }
        }
      };
    },
    [subscribeFn]
  );

  const getActiveChannels = useCallback(() => {
    return Array.from(subscriptionsRef.current.keys());
  }, []);

  return { subscribe, getActiveChannels };
}

export function UMAWebSocketProvider({ children }: { children: ReactNode }) {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  const {
    status,
    subscribe: wsSubscribe,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useWebSocket({
    url: WS_URL,
    channels: [...UMA_CHANNELS],
    autoConnect: true,
    useMock: true,
    onPerformanceMetrics: setPerformanceMetrics,
  });

  const { subscribe } = useChannelSubscriptionManager(wsSubscribe);

  const contextValue: UMAWebSocketContextValue = {
    subscribe,
    status,
    performanceMetrics,
    isConnected,
    isConnecting,
    isReconnecting,
  };

  return (
    <UMAWebSocketContext.Provider value={contextValue}>{children}</UMAWebSocketContext.Provider>
  );
}

export function useUMAWebSocket(): UMAWebSocketContextValue {
  const context = useContext(UMAWebSocketContext);
  if (!context) {
    throw new Error('useUMAWebSocket must be used within UMAWebSocketProvider');
  }
  return context;
}

export function useUMAWebSocketOptional(): UMAWebSocketContextValue | null {
  return useContext(UMAWebSocketContext);
}
