'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  realtimeManager,
  ConnectionStatus,
  PriceUpdatePayload,
  AlertEventPayload,
  SnapshotChangePayload,
  FavoriteChangePayload,
} from '@/lib/supabase/realtime';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('RealtimeContext');

export interface RealtimeContextValue {
  connectionStatus: ConnectionStatus;
  subscribeToPriceUpdates: (
    callback: (payload: PriceUpdatePayload) => void,
    filters?: { provider?: string; symbol?: string; chain?: string }
  ) => () => void;
  subscribeToAlertEvents: (callback: (payload: AlertEventPayload) => void) => () => void;
  subscribeToSnapshotChanges: (callback: (payload: SnapshotChangePayload) => void) => () => void;
  subscribeToFavoriteChanges: (callback: (payload: FavoriteChangePayload) => void) => () => void;
  reconnect: () => void;
  activeSubscriptions: string[];
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    realtimeManager.getConnectionStatus()
  );
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeManager.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
    });

    const updateSubscriptions = () => {
      setActiveSubscriptions(realtimeManager.getActiveSubscriptions());
    };

    const interval = setInterval(updateSubscriptions, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      realtimeManager.unsubscribeAll();
    }
  }, [user]);

  const subscribeToPriceUpdates = useCallback(
    (
      callback: (payload: PriceUpdatePayload) => void,
      filters?: { provider?: string; symbol?: string; chain?: string }
    ) => {
      return realtimeManager.subscribeToPriceUpdates(callback, filters);
    },
    []
  );

  const subscribeToAlertEvents = useCallback(
    (callback: (payload: AlertEventPayload) => void) => {
      if (!user) {
        logger.warn('Cannot subscribe to alert events: user not authenticated');
        return () => {};
      }
      return realtimeManager.subscribeToAlertEvents(user.id, callback);
    },
    [user]
  );

  const subscribeToSnapshotChanges = useCallback(
    (callback: (payload: SnapshotChangePayload) => void) => {
      if (!user) {
        logger.warn('Cannot subscribe to snapshot changes: user not authenticated');
        return () => {};
      }
      return realtimeManager.subscribeToSnapshotChanges(user.id, callback);
    },
    [user]
  );

  const subscribeToFavoriteChanges = useCallback(
    (callback: (payload: FavoriteChangePayload) => void) => {
      if (!user) {
        logger.warn('Cannot subscribe to favorite changes: user not authenticated');
        return () => {};
      }
      return realtimeManager.subscribeToFavoriteChanges(user.id, callback);
    },
    [user]
  );

  const reconnect = useCallback(() => {
    realtimeManager.reconnect();
  }, []);

  const value: RealtimeContextValue = {
    connectionStatus,
    subscribeToPriceUpdates,
    subscribeToAlertEvents,
    subscribeToSnapshotChanges,
    subscribeToFavoriteChanges,
    reconnect,
    activeSubscriptions,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

export function useOptionalRealtime(): RealtimeContextValue | null {
  const context = useContext(RealtimeContext);
  return context ?? null;
}

export { RealtimeContext };
