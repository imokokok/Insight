import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type ThresholdConfig, defaultThresholdConfig } from '@/lib/types/crossChain';
import { type RefreshInterval } from '@/types/common';

const CONFIG_STORE_VERSION = 1;

interface ConfigState {
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
  _version: number;
}

interface CrossChainConfigStore extends ConfigState {
  setRefreshInterval: (interval: RefreshInterval) => void;
  setColorblindMode: (enabled: boolean) => void;
}

const initialState: ConfigState = {
  refreshInterval: 60000,
  thresholdConfig: defaultThresholdConfig,
  colorblindMode: false,
  _version: CONFIG_STORE_VERSION,
};

export const useCrossChainConfigStore = create<CrossChainConfigStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setRefreshInterval: (interval) => set({ refreshInterval: interval }),
        setColorblindMode: (enabled) => set({ colorblindMode: enabled }),
      }),
      {
        name: 'cross-chain-config-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          refreshInterval: state.refreshInterval,
          thresholdConfig: state.thresholdConfig,
          colorblindMode: state.colorblindMode,
          _version: state._version,
        }),
        version: CONFIG_STORE_VERSION,
        migrate: (persistedState: unknown, version: number) => {
          if (version < CONFIG_STORE_VERSION) {
            return {
              ...initialState,
              ...((persistedState as Record<string, unknown>) || {}),
              _version: CONFIG_STORE_VERSION,
              thresholdConfig: defaultThresholdConfig,
            };
          }
          return persistedState;
        },
      }
    ),
    { name: 'CrossChainConfigStore' }
  )
);

export const useColorblindMode = () => useCrossChainConfigStore((state) => state.colorblindMode);
