import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import {
  type RefreshInterval,
  type ThresholdConfig,
  defaultThresholdConfig,
} from '@/lib/types/crossChain';

interface ConfigState {
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
}

interface CrossChainConfigStore extends ConfigState {
  setRefreshInterval: (interval: RefreshInterval) => void;
  setColorblindMode: (enabled: boolean) => void;
}

const initialState: ConfigState = {
  refreshInterval: 30000,
  thresholdConfig: defaultThresholdConfig,
  colorblindMode: false,
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
        }),
      }
    ),
    { name: 'CrossChainConfigStore' }
  )
);

export const useColorblindMode = () => useCrossChainConfigStore((state) => state.colorblindMode);
export const useSetColorblindMode = () =>
  useCrossChainConfigStore((state) => state.setColorblindMode);
