import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { OracleProvider, type Blockchain } from '@/types/oracle';

interface SelectorState {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
}

interface CrossChainSelectorStore extends SelectorState {
  setSelectedProvider: (provider: OracleProvider) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (range: number) => void;
  setSelectedBaseChain: (chain: Blockchain | null) => void;
}

const initialState: SelectorState = {
  selectedProvider: OracleProvider.CHAINLINK,
  selectedSymbol: 'BTC',
  selectedTimeRange: 24,
  selectedBaseChain: null,
};

export const useCrossChainSelectorStore = create<CrossChainSelectorStore>()(
  devtools(
    persist(
      (set, _get) => ({
        ...initialState,

        setSelectedProvider: (provider) => set({ selectedProvider: provider }),
        setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
        setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
        setSelectedBaseChain: (chain) => set({ selectedBaseChain: chain }),
      }),
      {
        name: 'cross-chain-selector-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          selectedProvider: state.selectedProvider,
          selectedSymbol: state.selectedSymbol,
          selectedTimeRange: state.selectedTimeRange,
        }),
      }
    ),
    { name: 'CrossChainSelectorStore' }
  )
);

const useSelectedProvider = () => useCrossChainSelectorStore((state) => state.selectedProvider);
const useSelectedSymbol = () => useCrossChainSelectorStore((state) => state.selectedSymbol);
const useCrossChainTimeRange = () => useCrossChainSelectorStore((state) => state.selectedTimeRange);
const useSelectedBaseChain = () => useCrossChainSelectorStore((state) => state.selectedBaseChain);

const useSelectorState = () =>
  useCrossChainSelectorStore((state) => ({
    selectedProvider: state.selectedProvider,
    selectedSymbol: state.selectedSymbol,
    selectedTimeRange: state.selectedTimeRange,
    selectedBaseChain: state.selectedBaseChain,
  }));
