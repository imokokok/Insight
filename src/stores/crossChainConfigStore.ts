import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type RefreshInterval } from '@/app/cross-chain/constants';
import { type ThresholdConfig, defaultThresholdConfig } from '@/app/cross-chain/utils';
import { type Blockchain } from '@/lib/oracles';

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
  refreshInterval: 0,
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
        setUpdateIntervals: (intervals) => set({ updateIntervals: intervals }),
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

export const useRefreshInterval = () => useCrossChainConfigStore((state) => state.refreshInterval);
export const useThresholdConfig = () => useCrossChainConfigStore((state) => state.thresholdConfig);
export const useColorblindMode = () => useCrossChainConfigStore((state) => state.colorblindMode);
export const useSetColorblindMode = () =>
  useCrossChainConfigStore((state) => state.setColorblindMode);
