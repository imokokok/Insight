import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { realtimeManager, type ConnectionStatus } from '@/lib/supabase/realtime';

interface RealtimeState {
  connectionStatus: ConnectionStatus;
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  reconnect: () => void;
  reset: () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

const initialState: RealtimeState = {
  connectionStatus: realtimeManager.getConnectionStatus(),
};

export const useRealtimeStore = create<RealtimeStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setConnectionStatus: (status) => {
        set({ connectionStatus: status });
      },

      reconnect: () => {
        realtimeManager.reconnect();
      },

      reset: () =>
        set({
          connectionStatus: realtimeManager.getConnectionStatus(),
        }),
    }),
    { name: 'RealtimeStore' }
  )
);

export const useConnectionStatus = () => useRealtimeStore((state) => state.connectionStatus);
