import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import {
  type RefreshInterval,
  type ThresholdConfig,
  defaultThresholdConfig,
} from '@/lib/types/crossChain';
import { type Blockchain } from '@/types/oracle';

interface ConfigState {
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
  updateIntervals: Partial<Record<Blockchain, number>>;
}

interface CrossChainConfigStore extends ConfigState {
  setRefreshInterval: (interval: RefreshInterval) => void;
  setThresholdConfig: (config: ThresholdConfig) => void;
  setColorblindMode: (enabled: boolean) => void;
  setUpdateIntervals: (intervals: Partial<Record<Blockchain, number>>) => void;
}

const initialState: ConfigState = {
  refreshInterval: 30000,
  thresholdConfig: defaultThresholdConfig,
  colorblindMode: false,
  updateIntervals: {},
};

export const useCrossChainConfigStore = create<CrossChainConfigStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setRefreshInterval: (interval) => set({ refreshInterval: interval }),
        setThresholdConfig: (config) => set({ thresholdConfig: config }),
        setColorblindMode: (enabled) => set({ colorblindMode: enabled }),
        setUpdateIntervals: (intervals) =>
          set((state) => ({ updateIntervals: { ...state.updateIntervals, ...intervals } })),
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
