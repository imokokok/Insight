import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import {
  realtimeManager,
  type ConnectionStatus,
  type PriceUpdatePayload,
  type AlertEventPayload,
  type SnapshotChangePayload,
  type FavoriteChangePayload,
} from '@/lib/supabase/realtime';

interface RealtimeState {
  connectionStatus: ConnectionStatus;
  activeSubscriptions: string[];
  lastPriceUpdate: PriceUpdatePayload | null;
  lastAlertEvent: AlertEventPayload | null;
  lastSnapshotChange: SnapshotChangePayload | null;
  lastFavoriteChange: FavoriteChangePayload | null;
  priceUpdateCount: number;
  alertEventCount: number;
  reconnectAttempts: number;
  userId: string | null;
  _initialized: boolean;
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSubscriptions: (subscriptions: string[]) => void;
  subscribeToPriceUpdates: (
    callback?: (payload: PriceUpdatePayload) => void,
    filters?: { provider?: string; symbol?: string; chain?: string }
  ) => () => void;
  subscribeToAlertEvents: (
    userId: string,
    callback?: (payload: AlertEventPayload) => void
  ) => () => void;
  subscribeToSnapshotChanges: (
    userId: string,
    callback?: (payload: SnapshotChangePayload) => void
  ) => () => void;
  subscribeToFavoriteChanges: (
    userId: string,
    callback?: (payload: FavoriteChangePayload) => void
  ) => () => void;
  reconnect: () => void;
  reset: () => void;
  _initialize: () => void;
  setUserId: (userId: string | null) => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

const initialState: RealtimeState = {
  connectionStatus: realtimeManager.getConnectionStatus(),
  activeSubscriptions: [],
  lastPriceUpdate: null,
  lastAlertEvent: null,
  lastSnapshotChange: null,
  lastFavoriteChange: null,
  priceUpdateCount: 0,
  alertEventCount: 0,
  reconnectAttempts: 0,
  userId: null,
  _initialized: false,
};

export const useRealtimeStore = create<RealtimeStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setConnectionStatus: (status) => {
        const prevStatus = get().connectionStatus;
        if (status === 'connected' && prevStatus !== 'connected') {
          set({ reconnectAttempts: 0 });
        }
        set({ connectionStatus: status });
      },

      setActiveSubscriptions: (subscriptions) => set({ activeSubscriptions: subscriptions }),

      subscribeToPriceUpdates: (callback, filters) => {
        const callbackRef = { current: callback };

        const unsubscribe = realtimeManager.subscribeToPriceUpdates((payload) => {
          set((state) => ({
            lastPriceUpdate: payload,
            priceUpdateCount: state.priceUpdateCount + 1,
          }));
          callbackRef.current?.(payload);
        }, filters);

        const result = () => {
          unsubscribe();
          callbackRef.current = undefined;
        };
        result.updateCallback = (cb: typeof callback) => {
          callbackRef.current = cb;
        };
        return result;
      },

      subscribeToAlertEvents: (userId, callback) => {
        const callbackRef = { current: callback };

        const unsubscribe = realtimeManager.subscribeToAlertEvents(userId, (payload) => {
          set((state) => ({
            lastAlertEvent: payload,
            alertEventCount: state.alertEventCount + 1,
          }));
          callbackRef.current?.(payload);
        });

        const result = () => {
          unsubscribe();
          callbackRef.current = undefined;
        };
        result.updateCallback = (cb: typeof callback) => {
          callbackRef.current = cb;
        };
        return result;
      },

      subscribeToSnapshotChanges: (userId, callback) => {
        const callbackRef = { current: callback };

        const unsubscribe = realtimeManager.subscribeToSnapshotChanges(userId, (payload) => {
          set({ lastSnapshotChange: payload });
          callbackRef.current?.(payload);
        });

        const result = () => {
          unsubscribe();
          callbackRef.current = undefined;
        };
        result.updateCallback = (cb: typeof callback) => {
          callbackRef.current = cb;
        };
        return result;
      },

      subscribeToFavoriteChanges: (userId, callback) => {
        const callbackRef = { current: callback };

        const unsubscribe = realtimeManager.subscribeToFavoriteChanges(userId, (payload) => {
          set({ lastFavoriteChange: payload });
          callbackRef.current?.(payload);
        });

        const result = () => {
          unsubscribe();
          callbackRef.current = undefined;
        };
        result.updateCallback = (cb: typeof callback) => {
          callbackRef.current = cb;
        };
        return result;
      },

      reconnect: () => {
        set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
        realtimeManager.reconnect();
      },

      reset: () =>
        set({
          connectionStatus: realtimeManager.getConnectionStatus(),
          activeSubscriptions: [],
          lastPriceUpdate: null,
          lastAlertEvent: null,
          lastSnapshotChange: null,
          lastFavoriteChange: null,
          reconnectAttempts: 0,
          userId: null,
          _initialized: false,
        }),

      _initialize: () => {
        const { _initialized } = get();
        if (_initialized) return;
        set({ _initialized: true });
      },

      setUserId: (userId) => set({ userId }),
    }),
    { name: 'RealtimeStore' }
  )
);

export const useConnectionStatus = () => useRealtimeStore((state) => state.connectionStatus);
const useActiveSubscriptions = () => useRealtimeStore((state) => state.activeSubscriptions);
const useLastPriceUpdate = () => useRealtimeStore((state) => state.lastPriceUpdate);
const useLastAlertEvent = () => useRealtimeStore((state) => state.lastAlertEvent);
const useLastSnapshotChange = () => useRealtimeStore((state) => state.lastSnapshotChange);
const useLastFavoriteChange = () => useRealtimeStore((state) => state.lastFavoriteChange);
const usePriceUpdateCount = () => useRealtimeStore((state) => state.priceUpdateCount);
const useAlertEventCount = () => useRealtimeStore((state) => state.alertEventCount);
const useReconnectAttempts = () => useRealtimeStore((state) => state.reconnectAttempts);
const useIsConnected = () => useRealtimeStore((state) => state.connectionStatus === 'connected');

export const useRealtimeActions = () =>
  useRealtimeStore(
    useShallow((state) => ({
      setConnectionStatus: state.setConnectionStatus,
      setActiveSubscriptions: state.setActiveSubscriptions,
      subscribeToPriceUpdates: state.subscribeToPriceUpdates,
      subscribeToAlertEvents: state.subscribeToAlertEvents,
      subscribeToSnapshotChanges: state.subscribeToSnapshotChanges,
      subscribeToFavoriteChanges: state.subscribeToFavoriteChanges,
      reconnect: state.reconnect,
      reset: state.reset,
      _initialize: state._initialize,
      setUserId: state.setUserId,
    }))
  );
