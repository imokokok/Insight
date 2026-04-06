'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  type DisputeData,
  type DisputeCategory,
  type UMANetworkStats,
} from '@/lib/oracles/uma/types';
import {
  useUMAWebSocketOptional,
  type WebSocketMessage,
  type PerformanceMetrics,
} from '@/lib/realtime/UMAWebSocketContext';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useUMARealtime');

export interface UMAPriceData {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
  confidence: number;
  source: string;
}

export interface UMADisputeUpdate extends DisputeData {
  updateType: 'new' | 'status_change' | 'resolved';
  previousStatus?: 'active' | 'resolved' | 'rejected';
}

export interface UMAValidatorUpdate {
  validatorId: string;
  timestamp: number;
  responseTime: number;
  successRate: number;
  staked: number;
  earnings: number;
}

export interface UMANetworkUpdate extends UMANetworkStats {
  updateType: 'stats' | 'validator_change' | 'dispute_change';
}

export interface UMADataRequestUpdate {
  requestId: string;
  timestamp: number;
  status: 'pending' | 'verified' | 'disputed' | 'resolved';
  requester: string;
  proposer: string;
  proposedValue: string;
  challengePeriodEnd: number;
  reward: number;
  bond: number;
}

export interface RealtimeData {
  type: 'price' | 'network' | 'dispute' | 'validator' | 'request';
  data: unknown;
  timestamp: number;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  lastConnected?: Date;
  retryCount: number;
}

export interface UseUMARealtimePriceOptions {
  symbol?: string;
  enabled?: boolean;
  onPriceUpdate?: (data: UMAPriceData) => void;
  throttleMs?: number;
}

export interface UseUMARealtimePriceReturn {
  priceData: UMAPriceData | null;
  connectionStatus: ConnectionStatus['status'];
  lastUpdate: Date | null;
  error: Error | null;
  performanceMetrics: PerformanceMetrics | null;
}

export interface UseUMARealtimeDisputesOptions {
  enabled?: boolean;
  onDisputeUpdate?: (data: UMADisputeUpdate) => void;
  filterStatus?: ('active' | 'resolved' | 'rejected')[];
  filterType?: DisputeCategory[];
  throttleMs?: number;
}

export interface UseUMARealtimeDisputesReturn {
  disputes: UMADisputeUpdate[];
  latestDispute: UMADisputeUpdate | null;
  connectionStatus: ConnectionStatus['status'];
  lastUpdate: Date | null;
  error: Error | null;
  activeCount: number;
  resolvedCount: number;
  rejectedCount: number;
}

export interface UseUMARealtimeValidatorsOptions {
  enabled?: boolean;
  onValidatorUpdate?: (data: UMAValidatorUpdate) => void;
  validatorIds?: string[];
  throttleMs?: number;
}

export interface UseUMARealtimeValidatorsReturn {
  validators: Map<string, UMAValidatorUpdate>;
  connectionStatus: ConnectionStatus['status'];
  lastUpdate: Date | null;
  error: Error | null;
}

export interface UseUMARealtimeNetworkOptions {
  enabled?: boolean;
  onNetworkUpdate?: (data: UMANetworkUpdate) => void;
  throttleMs?: number;
}

export interface UseUMARealtimeNetworkReturn {
  networkData: UMANetworkUpdate | null;
  connectionStatus: ConnectionStatus['status'];
  lastUpdate: Date | null;
  error: Error | null;
}

export interface UseUMARealtimeRequestsOptions {
  enabled?: boolean;
  onRequestUpdate?: (data: UMADataRequestUpdate) => void;
  filterStatus?: ('pending' | 'verified' | 'disputed' | 'resolved')[];
  throttleMs?: number;
}

export interface UseUMARealtimeRequestsReturn {
  requests: UMADataRequestUpdate[];
  latestRequest: UMADataRequestUpdate | null;
  connectionStatus: ConnectionStatus['status'];
  lastUpdate: Date | null;
  error: Error | null;
  pendingCount: number;
  verifiedCount: number;
  disputedCount: number;
  resolvedCount: number;
}

const DEFAULT_THROTTLE_MS = 1000;

function useThrottledCallback<T extends (...args: never[]) => void>(
  callback: T,
  throttleMs: number
): T {
  const lastCallTimeRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;

      if (timeSinceLastCall >= throttleMs) {
        lastCallTimeRef.current = now;
        callback(...args);
      } else {
        pendingArgsRef.current = args;

        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (pendingArgsRef.current) {
              lastCallTimeRef.current = Date.now();
              callback(...pendingArgsRef.current);
              pendingArgsRef.current = null;
            }
            timeoutRef.current = null;
          }, throttleMs - timeSinceLastCall);
        }
      }
    },
    [callback, throttleMs]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

export function useUMARealtimePrice(
  options: UseUMARealtimePriceOptions = {}
): UseUMARealtimePriceReturn {
  const { symbol, enabled = true, onPriceUpdate, throttleMs = DEFAULT_THROTTLE_MS } = options;
  const [priceData, setPriceData] = useState<UMAPriceData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const sharedContext = useUMAWebSocketOptional();

  const handlePriceUpdate = useCallback(
    (data: UMAPriceData) => {
      setPriceData(data);
      setLastUpdate(new Date());
      setError(null);
      onPriceUpdate?.(data);
    },
    [onPriceUpdate]
  );

  const throttledHandlePriceUpdate = useThrottledCallback(handlePriceUpdate, throttleMs);

  const handleMessage = useCallback(
    (message: WebSocketMessage<UMAPriceData>) => {
      try {
        const data = message.data;

        if (symbol && data.symbol !== symbol) {
          return;
        }

        throttledHandlePriceUpdate(data);
      } catch (err) {
        logger.error('Error handling UMA price message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [symbol, throttledHandlePriceUpdate]
  );

  useEffect(() => {
    if (!enabled || !sharedContext) return;

    const unsubscribe = sharedContext.subscribe<UMAPriceData>('uma:prices', handleMessage);
    return () => {
      unsubscribe?.();
    };
  }, [enabled, sharedContext, handleMessage]);

  return {
    priceData,
    connectionStatus: sharedContext?.status ?? 'disconnected',
    lastUpdate,
    error,
    performanceMetrics: sharedContext?.performanceMetrics ?? null,
  };
}

export function useUMARealtimeDisputes(
  options: UseUMARealtimeDisputesOptions = {}
): UseUMARealtimeDisputesReturn {
  const {
    enabled = true,
    onDisputeUpdate,
    filterStatus,
    filterType,
    throttleMs = DEFAULT_THROTTLE_MS,
  } = options;
  const [disputes, setDisputes] = useState<UMADisputeUpdate[]>([]);
  const [latestDispute, setLatestDispute] = useState<UMADisputeUpdate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const disputesMapRef = useRef<Map<string, UMADisputeUpdate>>(new Map());

  const sharedContext = useUMAWebSocketOptional();

  const handleDisputeUpdate = useCallback(
    (disputeUpdate: UMADisputeUpdate) => {
      setLatestDispute(disputeUpdate);
      setDisputes(
        Array.from(disputesMapRef.current.values()).sort((a, b) => b.timestamp - a.timestamp)
      );
      setLastUpdate(new Date());
      setError(null);
      onDisputeUpdate?.(disputeUpdate);
    },
    [onDisputeUpdate]
  );

  const throttledHandleDisputeUpdate = useThrottledCallback(handleDisputeUpdate, throttleMs);

  const handleMessage = useCallback(
    (message: WebSocketMessage<DisputeData>) => {
      try {
        const data = message.data;

        if (filterStatus && !filterStatus.includes(data.status)) {
          return;
        }

        if (filterType && !filterType.includes(data.type)) {
          return;
        }

        const existingDispute = disputesMapRef.current.get(data.id);
        const updateType: UMADisputeUpdate['updateType'] = existingDispute
          ? existingDispute.status !== data.status
            ? 'status_change'
            : 'new'
          : 'new';

        const disputeUpdate: UMADisputeUpdate = {
          ...data,
          updateType,
          previousStatus: existingDispute?.status,
        };

        disputesMapRef.current.set(data.id, disputeUpdate);
        throttledHandleDisputeUpdate(disputeUpdate);
      } catch (err) {
        logger.error('Error handling UMA dispute message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [filterStatus, filterType, throttledHandleDisputeUpdate]
  );

  useEffect(() => {
    if (!enabled || !sharedContext) return;

    const unsubscribe = sharedContext.subscribe<DisputeData>('uma:disputes', handleMessage);
    return () => {
      unsubscribe?.();
    };
  }, [enabled, sharedContext, handleMessage]);

  const stats = useMemo(
    () =>
      disputes.reduce(
        (acc, dispute) => {
          if (dispute.status === 'active') acc.activeCount++;
          else if (dispute.status === 'resolved') acc.resolvedCount++;
          else if (dispute.status === 'rejected') acc.rejectedCount++;
          return acc;
        },
        { activeCount: 0, resolvedCount: 0, rejectedCount: 0 }
      ),
    [disputes]
  );

  return {
    disputes,
    latestDispute,
    connectionStatus: sharedContext?.status ?? 'disconnected',
    lastUpdate,
    error,
    ...stats,
  };
}

export function useUMARealtimeValidators(
  options: UseUMARealtimeValidatorsOptions = {}
): UseUMARealtimeValidatorsReturn {
  const {
    enabled = true,
    onValidatorUpdate,
    validatorIds,
    throttleMs = DEFAULT_THROTTLE_MS,
  } = options;
  const [validators, setValidators] = useState<Map<string, UMAValidatorUpdate>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const sharedContext = useUMAWebSocketOptional();

  const handleValidatorUpdate = useCallback(
    (data: UMAValidatorUpdate) => {
      setValidators((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.validatorId, data);
        return newMap;
      });
      setLastUpdate(new Date());
      setError(null);
      onValidatorUpdate?.(data);
    },
    [onValidatorUpdate]
  );

  const throttledHandleValidatorUpdate = useThrottledCallback(handleValidatorUpdate, throttleMs);

  const handleMessage = useCallback(
    (message: WebSocketMessage<UMAValidatorUpdate>) => {
      try {
        const data = message.data;

        if (validatorIds && !validatorIds.includes(data.validatorId)) {
          return;
        }

        throttledHandleValidatorUpdate(data);
      } catch (err) {
        logger.error('Error handling UMA validator message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [validatorIds, throttledHandleValidatorUpdate]
  );

  useEffect(() => {
    if (!enabled || !sharedContext) return;

    const unsubscribe = sharedContext.subscribe<UMAValidatorUpdate>(
      'uma:validators',
      handleMessage
    );
    return () => {
      unsubscribe?.();
    };
  }, [enabled, sharedContext, handleMessage]);

  return {
    validators,
    connectionStatus: sharedContext?.status ?? 'disconnected',
    lastUpdate,
    error,
  };
}

export function useUMARealtimeNetwork(
  options: UseUMARealtimeNetworkOptions = {}
): UseUMARealtimeNetworkReturn {
  const { enabled = true, onNetworkUpdate, throttleMs = DEFAULT_THROTTLE_MS } = options;
  const [networkData, setNetworkData] = useState<UMANetworkUpdate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const sharedContext = useUMAWebSocketOptional();

  const handleNetworkUpdate = useCallback(
    (data: UMANetworkUpdate) => {
      setNetworkData(data);
      setLastUpdate(new Date());
      setError(null);
      onNetworkUpdate?.(data);
    },
    [onNetworkUpdate]
  );

  const throttledHandleNetworkUpdate = useThrottledCallback(handleNetworkUpdate, throttleMs);

  const handleMessage = useCallback(
    (message: WebSocketMessage<UMANetworkUpdate>) => {
      try {
        throttledHandleNetworkUpdate(message.data);
      } catch (err) {
        logger.error('Error handling UMA network message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [throttledHandleNetworkUpdate]
  );

  useEffect(() => {
    if (!enabled || !sharedContext) return;

    const unsubscribe = sharedContext.subscribe<UMANetworkUpdate>('uma:network', handleMessage);
    return () => {
      unsubscribe?.();
    };
  }, [enabled, sharedContext, handleMessage]);

  return {
    networkData,
    connectionStatus: sharedContext?.status ?? 'disconnected',
    lastUpdate,
    error,
  };
}

export function useUMARealtimeRequests(
  options: UseUMARealtimeRequestsOptions = {}
): UseUMARealtimeRequestsReturn {
  const {
    enabled = true,
    onRequestUpdate,
    filterStatus,
    throttleMs = DEFAULT_THROTTLE_MS,
  } = options;
  const [requests, setRequests] = useState<UMADataRequestUpdate[]>([]);
  const [latestRequest, setLatestRequest] = useState<UMADataRequestUpdate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const requestsMapRef = useRef<Map<string, UMADataRequestUpdate>>(new Map());

  const sharedContext = useUMAWebSocketOptional();

  const handleRequestUpdate = useCallback(
    (requestUpdate: UMADataRequestUpdate) => {
      setLatestRequest(requestUpdate);
      setRequests(
        Array.from(requestsMapRef.current.values()).sort((a, b) => b.timestamp - a.timestamp)
      );
      setLastUpdate(new Date());
      setError(null);
      onRequestUpdate?.(requestUpdate);
    },
    [onRequestUpdate]
  );

  const throttledHandleRequestUpdate = useThrottledCallback(handleRequestUpdate, throttleMs);

  const handleMessage = useCallback(
    (message: WebSocketMessage<UMADataRequestUpdate>) => {
      try {
        const data = message.data;

        if (filterStatus && !filterStatus.includes(data.status)) {
          return;
        }

        requestsMapRef.current.set(data.requestId, data);
        throttledHandleRequestUpdate(data);
      } catch (err) {
        logger.error('Error handling UMA request message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [filterStatus, throttledHandleRequestUpdate]
  );

  useEffect(() => {
    if (!enabled || !sharedContext) return;

    const unsubscribe = sharedContext.subscribe<UMADataRequestUpdate>(
      'uma:requests',
      handleMessage
    );
    return () => {
      unsubscribe?.();
    };
  }, [enabled, sharedContext, handleMessage]);

  const stats = useMemo(
    () =>
      requests.reduce(
        (acc, request) => {
          if (request.status === 'pending') acc.pendingCount++;
          else if (request.status === 'verified') acc.verifiedCount++;
          else if (request.status === 'disputed') acc.disputedCount++;
          else if (request.status === 'resolved') acc.resolvedCount++;
          return acc;
        },
        { pendingCount: 0, verifiedCount: 0, disputedCount: 0, resolvedCount: 0 }
      ),
    [requests]
  );

  return {
    requests,
    latestRequest,
    connectionStatus: sharedContext?.status ?? 'disconnected',
    lastUpdate,
    error,
    ...stats,
  };
}

export interface UseUMARealtimeOptions {
  priceSymbol?: string;
  enablePrices?: boolean;
  enableDisputes?: boolean;
  enableValidators?: boolean;
  enableNetwork?: boolean;
  enableRequests?: boolean;
  disputeFilterStatus?: ('active' | 'resolved' | 'rejected')[];
  disputeFilterType?: DisputeCategory[];
  validatorIds?: string[];
  requestFilterStatus?: ('pending' | 'verified' | 'disputed' | 'resolved')[];
  throttleMs?: number;
  onPriceUpdate?: (data: UMAPriceData) => void;
  onDisputeUpdate?: (data: UMADisputeUpdate) => void;
  onValidatorUpdate?: (data: UMAValidatorUpdate) => void;
  onNetworkUpdate?: (data: UMANetworkUpdate) => void;
  onRequestUpdate?: (data: UMADataRequestUpdate) => void;
}

export interface UseUMARealtimeReturn {
  price: UseUMARealtimePriceReturn;
  disputes: UseUMARealtimeDisputesReturn;
  validators: UseUMARealtimeValidatorsReturn;
  network: UseUMARealtimeNetworkReturn;
  requests: UseUMARealtimeRequestsReturn;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionInfo: ConnectionStatus;
}

export function useUMARealtime(options: UseUMARealtimeOptions = {}): UseUMARealtimeReturn {
  const {
    priceSymbol,
    enablePrices = true,
    enableDisputes = true,
    enableValidators = false,
    enableNetwork = true,
    enableRequests = true,
    disputeFilterStatus,
    disputeFilterType,
    validatorIds,
    requestFilterStatus,
    throttleMs = DEFAULT_THROTTLE_MS,
    onPriceUpdate,
    onDisputeUpdate,
    onValidatorUpdate,
    onNetworkUpdate,
    onRequestUpdate,
  } = options;

  const sharedContext = useUMAWebSocketOptional();

  const price = useUMARealtimePrice({
    symbol: priceSymbol,
    enabled: enablePrices,
    onPriceUpdate,
    throttleMs,
  });

  const disputes = useUMARealtimeDisputes({
    enabled: enableDisputes,
    onDisputeUpdate,
    filterStatus: disputeFilterStatus,
    filterType: disputeFilterType,
    throttleMs,
  });

  const validators = useUMARealtimeValidators({
    enabled: enableValidators,
    onValidatorUpdate,
    validatorIds,
    throttleMs,
  });

  const network = useUMARealtimeNetwork({
    enabled: enableNetwork,
    onNetworkUpdate,
    throttleMs,
  });

  const requests = useUMARealtimeRequests({
    enabled: enableRequests,
    onRequestUpdate,
    filterStatus: requestFilterStatus,
    throttleMs,
  });

  const isConnected = sharedContext?.isConnected ?? false;
  const isConnecting = sharedContext?.isConnecting ?? false;
  const isReconnecting = sharedContext?.isReconnecting ?? false;

  const connectionInfo: ConnectionStatus = useMemo(() => {
    const status: ConnectionStatus['status'] = isReconnecting
      ? 'reconnecting'
      : isConnecting
        ? 'connecting'
        : isConnected
          ? 'connected'
          : 'disconnected';

    return {
      status,
      lastConnected: isConnected ? new Date() : undefined,
      retryCount: 0,
    };
  }, [isConnected, isConnecting, isReconnecting]);

  return {
    price,
    disputes,
    validators,
    network,
    requests,
    isConnected,
    isConnecting,
    isReconnecting,
    connectionInfo,
  };
}

export default useUMARealtime;
