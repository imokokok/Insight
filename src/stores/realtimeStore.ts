import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { realtimeManager, type ConnectionStatus } from '@/lib/supabase/realtime';

interface RealtimeState {
  connectionStatus: ConnectionStatus;
  reconnectAttempts: number;
  _initialized: boolean;
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  reconnect: () => void;
  reset: () => void;
  _initialize: () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

const initialState: RealtimeState = {
  connectionStatus: realtimeManager.getConnectionStatus(),
  reconnectAttempts: 0,
  _initialized: false,
};

export const useRealtimeStore = create<RealtimeStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setConnectionStatus: (status) => {
        const prevStatus = get().connectionStatus;
        if (status === 'connected' && prevStatus !== 'connected') {
          set({ reconnectAttempts: 0, connectionStatus: status });
        } else {
          set({ connectionStatus: status });
        }
      },

      reconnect: () => {
        set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
        realtimeManager.reconnect();
      },

      reset: () =>
        set({
          connectionStatus: realtimeManager.getConnectionStatus(),
          reconnectAttempts: 0,
          _initialized: false,
        }),

      _initialize: () => {
        const { _initialized } = get();
        if (_initialized) return;
        set({ _initialized: true });
      },
    }),
    { name: 'RealtimeStore' }
  )
);

export const useConnectionStatus = () => useRealtimeStore((state) => state.connectionStatus);
