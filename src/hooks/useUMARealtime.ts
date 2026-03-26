'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { type DisputeData, type DisputeType } from '@/lib/oracles/uma';
import { useWebSocket, type WebSocketMessage } from '@/lib/realtime/websocket';
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

export interface UseUMARealtimePriceOptions {
  symbol?: string;
  enabled?: boolean;
  onPriceUpdate?: (data: UMAPriceData) => void;
}

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

export interface UseUMARealtimePriceReturn {
  priceData: UMAPriceData | null;
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
  error: Error | null;
}

export interface UseUMARealtimeDisputesOptions {
  enabled?: boolean;
  onDisputeUpdate?: (data: UMADisputeUpdate) => void;
  filterStatus?: ('active' | 'resolved' | 'rejected')[];
  filterType?: DisputeType[];
}

export interface UseUMARealtimeDisputesReturn {
  disputes: UMADisputeUpdate[];
  latestDispute: UMADisputeUpdate | null;
  connectionStatus: ConnectionStatus;
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
}

export interface UseUMARealtimeValidatorsReturn {
  validators: Map<string, UMAValidatorUpdate>;
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
  error: Error | null;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.example.com/ws';

export function useUMARealtimePrice(
  options: UseUMARealtimePriceOptions = {}
): UseUMARealtimePriceReturn {
  const { symbol, enabled = true, onPriceUpdate } = options;
  const [priceData, setPriceData] = useState<UMAPriceData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleMessage = useCallback(
    (message: WebSocketMessage<UMAPriceData>) => {
      try {
        const data = message.data;

        if (symbol && data.symbol !== symbol) {
          return;
        }

        setPriceData(data);
        setLastUpdate(new Date());
        setError(null);

        if (onPriceUpdate) {
          onPriceUpdate(data);
        }
      } catch (err) {
        logger.error('Error handling UMA price message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [symbol, onPriceUpdate]
  );

  const { status: connectionStatus, subscribe } = useWebSocket({
    url: WS_URL,
    channels: enabled ? ['uma:prices'] : [],
    autoConnect: enabled,
    useMock: true,
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe<UMAPriceData>('uma:prices', handleMessage);
    return () => {
      unsubscribe?.();
    };
  }, [enabled, subscribe, handleMessage]);

  return {
    priceData,
    connectionStatus,
    lastUpdate,
    error,
  };
}

export function useUMARealtimeDisputes(
  options: UseUMARealtimeDisputesOptions = {}
): UseUMARealtimeDisputesReturn {
  const { enabled = true, onDisputeUpdate, filterStatus, filterType } = options;
  const [disputes, setDisputes] = useState<UMADisputeUpdate[]>([]);
  const [latestDispute, setLatestDispute] = useState<UMADisputeUpdate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const disputesMapRef = useRef<Map<string, UMADisputeUpdate>>(new Map());

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
        setLatestDispute(disputeUpdate);
        setDisputes(
          Array.from(disputesMapRef.current.values()).sort((a, b) => b.timestamp - a.timestamp)
        );
        setLastUpdate(new Date());
        setError(null);

        if (onDisputeUpdate) {
          onDisputeUpdate(disputeUpdate);
        }
      } catch (err) {
        logger.error('Error handling UMA dispute message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [filterStatus, filterType, onDisputeUpdate]
  );

  const { status: connectionStatus, subscribe } = useWebSocket({
    url: WS_URL,
    channels: enabled ? ['uma:disputes'] : [],
    autoConnect: enabled,
    useMock: true,
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe<DisputeData>('uma:disputes', handleMessage);
    return () => {
      unsubscribe?.();
    };
  }, [enabled, subscribe, handleMessage]);

  const stats = disputes.reduce(
    (acc, dispute) => {
      if (dispute.status === 'active') acc.activeCount++;
      else if (dispute.status === 'resolved') acc.resolvedCount++;
      else if (dispute.status === 'rejected') acc.rejectedCount++;
      return acc;
    },
    { activeCount: 0, resolvedCount: 0, rejectedCount: 0 }
  );

  return {
    disputes,
    latestDispute,
    connectionStatus,
    lastUpdate,
    error,
    ...stats,
  };
}

export function useUMARealtimeValidators(
  options: UseUMARealtimeValidatorsOptions = {}
): UseUMARealtimeValidatorsReturn {
  const { enabled = true, onValidatorUpdate, validatorIds } = options;
  const [validators, setValidators] = useState<Map<string, UMAValidatorUpdate>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleMessage = useCallback(
    (message: WebSocketMessage<UMAValidatorUpdate>) => {
      try {
        const data = message.data;

        if (validatorIds && !validatorIds.includes(data.validatorId)) {
          return;
        }

        setValidators((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.validatorId, data);
          return newMap;
        });
        setLastUpdate(new Date());
        setError(null);

        if (onValidatorUpdate) {
          onValidatorUpdate(data);
        }
      } catch (err) {
        logger.error('Error handling UMA validator message', err as Error);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [validatorIds, onValidatorUpdate]
  );

  const { status: connectionStatus, subscribe } = useWebSocket({
    url: WS_URL,
    channels: enabled ? ['uma:validators'] : [],
    autoConnect: enabled,
    useMock: true,
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe<UMAValidatorUpdate>('uma:validators', handleMessage);
    return () => {
      unsubscribe?.();
    };
  }, [enabled, subscribe, handleMessage]);

  return {
    validators,
    connectionStatus,
    lastUpdate,
    error,
  };
}

export interface UseUMARealtimeOptions {
  priceSymbol?: string;
  enablePrices?: boolean;
  enableDisputes?: boolean;
  enableValidators?: boolean;
  disputeFilterStatus?: ('active' | 'resolved' | 'rejected')[];
  disputeFilterType?: DisputeType[];
  validatorIds?: string[];
  onPriceUpdate?: (data: UMAPriceData) => void;
  onDisputeUpdate?: (data: UMADisputeUpdate) => void;
  onValidatorUpdate?: (data: UMAValidatorUpdate) => void;
}

export interface UseUMARealtimeReturn {
  price: UseUMARealtimePriceReturn;
  disputes: UseUMARealtimeDisputesReturn;
  validators: UseUMARealtimeValidatorsReturn;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
}

export function useUMARealtime(options: UseUMARealtimeOptions = {}): UseUMARealtimeReturn {
  const {
    priceSymbol,
    enablePrices = true,
    enableDisputes = true,
    enableValidators = false,
    disputeFilterStatus,
    disputeFilterType,
    validatorIds,
    onPriceUpdate,
    onDisputeUpdate,
    onValidatorUpdate,
  } = options;

  const price = useUMARealtimePrice({
    symbol: priceSymbol,
    enabled: enablePrices,
    onPriceUpdate,
  });

  const disputes = useUMARealtimeDisputes({
    enabled: enableDisputes,
    onDisputeUpdate,
    filterStatus: disputeFilterStatus,
    filterType: disputeFilterType,
  });

  const validators = useUMARealtimeValidators({
    enabled: enableValidators,
    onValidatorUpdate,
    validatorIds,
  });

  const isConnected =
    (enablePrices && price.connectionStatus === 'connected') ||
    (enableDisputes && disputes.connectionStatus === 'connected') ||
    (enableValidators && validators.connectionStatus === 'connected');

  const isConnecting =
    (enablePrices && price.connectionStatus === 'connecting') ||
    (enableDisputes && disputes.connectionStatus === 'connecting') ||
    (enableValidators && validators.connectionStatus === 'connecting');

  const isReconnecting =
    (enablePrices && price.connectionStatus === 'reconnecting') ||
    (enableDisputes && disputes.connectionStatus === 'reconnecting') ||
    (enableValidators && validators.connectionStatus === 'reconnecting');

  return {
    price,
    disputes,
    validators,
    isConnected,
    isConnecting,
    isReconnecting,
  };
}

export default useUMARealtime;
