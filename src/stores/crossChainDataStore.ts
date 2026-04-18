import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type AnomalousPricePoint } from '@/app/cross-chain/utils/anomalyDetection';
import { type Blockchain, type PriceData } from '@/types/oracle';

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
  anomalies: AnomalousPricePoint[];
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
  setAnomalies: (anomalies: AnomalousPricePoint[]) => void;
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
  anomalies: [],
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
        setAnomalies: (anomalies) => set({ anomalies }),
      }),
      {
        name: 'cross-chain-data-store',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (_state) => ({}),
      }
    ),
    { name: 'CrossChainDataStore' }
  )
);

const useCurrentPrices = () => useCrossChainDataStore((state) => state.currentPrices);
const useHistoricalPrices = () => useCrossChainDataStore((state) => state.historicalPrices);
const useLoading = () => useCrossChainDataStore((state) => state.loading);
const useRefreshStatus = () => useCrossChainDataStore((state) => state.refreshStatus);
const useShowRefreshSuccess = () => useCrossChainDataStore((state) => state.showRefreshSuccess);
const useLastUpdated = () => useCrossChainDataStore((state) => state.lastUpdated);
const usePrevStats = () => useCrossChainDataStore((state) => state.prevStats);
const useRecommendedBaseChain = () => useCrossChainDataStore((state) => state.recommendedBaseChain);

const useDataState = () =>
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
