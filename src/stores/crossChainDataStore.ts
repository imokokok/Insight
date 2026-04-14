import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type Blockchain, type PriceData } from '@/lib/oracles';

interface DataState {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: Date | null;
  prevStats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null;
  recommendedBaseChain: Blockchain | null;
}

interface CrossChainDataStore extends DataState {
  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (prices: Partial<Record<Blockchain, PriceData[]>>) => void;
  setLoading: (loading: boolean) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLastUpdated: (date: Date | null) => void;
  setPrevStats: (stats: DataState['prevStats']) => void;
  setRecommendedBaseChain: (chain: Blockchain | null) => void;
}

const initialState: DataState = {
  currentPrices: [],
  historicalPrices: {},
  loading: true,
  refreshStatus: 'idle',
  showRefreshSuccess: false,
  lastUpdated: null,
  prevStats: null,
  recommendedBaseChain: null,
};

export const useCrossChainDataStore = create<CrossChainDataStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCurrentPrices: (prices) => set({ currentPrices: prices }),
        setHistoricalPrices: (prices) => set({ historicalPrices: prices }),
        setLoading: (loading) => set({ loading }),
        setRefreshStatus: (status) => set({ refreshStatus: status }),
        setShowRefreshSuccess: (show) => set({ showRefreshSuccess: show }),
        setLastUpdated: (date) => set({ lastUpdated: date }),
        setPrevStats: (stats) => set({ prevStats: stats }),
        setRecommendedBaseChain: (chain) => set({ recommendedBaseChain: chain }),
      }),
      {
        name: 'cross-chain-data-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          lastUpdated: state.lastUpdated?.toISOString(),
        }),
        onRehydrateStorage: () => (state) => {
          if (state && state.lastUpdated) {
            (state as { lastUpdated: Date | null }).lastUpdated = new Date(
              String(state.lastUpdated)
            );
          }
        },
      }
    ),
    { name: 'CrossChainDataStore' }
  )
);

export const useCurrentPrices = () => useCrossChainDataStore((state) => state.currentPrices);
export const useHistoricalPrices = () => useCrossChainDataStore((state) => state.historicalPrices);
export const useLoading = () => useCrossChainDataStore((state) => state.loading);
export const useRefreshStatus = () => useCrossChainDataStore((state) => state.refreshStatus);
export const useShowRefreshSuccess = () =>
  useCrossChainDataStore((state) => state.showRefreshSuccess);
export const useLastUpdated = () => useCrossChainDataStore((state) => state.lastUpdated);
export const usePrevStats = () => useCrossChainDataStore((state) => state.prevStats);
export const useRecommendedBaseChain = () =>
  useCrossChainDataStore((state) => state.recommendedBaseChain);

export const useDataState = () =>
  useCrossChainDataStore((state) => ({
    currentPrices: state.currentPrices,
    historicalPrices: state.historicalPrices,
    loading: state.loading,
    refreshStatus: state.refreshStatus,
    showRefreshSuccess: state.showRefreshSuccess,
    lastUpdated: state.lastUpdated,
    prevStats: state.prevStats,
    recommendedBaseChain: state.recommendedBaseChain,
  }));
