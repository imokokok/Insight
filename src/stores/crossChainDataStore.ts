import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { type CrossChainComparisonResult } from '@/lib/oracles/crossChainComparison';
import { type AnomalousPricePoint } from '@/lib/types/crossChain';
import { type PriceStats } from '@/types/analytics';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

interface DataState {
  currentPrices: PriceData[];
  crossChainComparison: CrossChainComparisonResult[];
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: Date | null;
  prevStats: PriceStats | null;
  recommendedBaseChain: Blockchain | null;
  anomalies: AnomalousPricePoint[];
  fetchData: () => Promise<void>;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

interface DataActions {
  setCurrentPrices: (prices: PriceData[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLastUpdated: (date: Date | null) => void;
  setPrevStats: (stats: DataState['prevStats']) => void;
  setRecommendedBaseChain: (chain: Blockchain | null) => void;
  setAnomalies: (anomalies: AnomalousPricePoint[]) => void;
  setCrossChainComparison: (results: CrossChainComparisonResult[]) => void;
  setFetchData: (fn: () => Promise<void>) => void;
  setClearCache: (fn: () => void) => void;
  setClearCacheForProvider: (fn: (provider: OracleProvider) => void) => void;
  resetDataState: () => void;
}

const initialState: DataState = {
  currentPrices: [],
  crossChainComparison: [],
  loading: true,
  refreshStatus: 'idle',
  showRefreshSuccess: false,
  lastUpdated: null,
  prevStats: null,
  recommendedBaseChain: null,
  anomalies: [],
  fetchData: async () => {},
  clearCache: () => {},
  clearCacheForProvider: () => {},
};

export const useCrossChainDataStore = create<DataState & DataActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setCurrentPrices: (prices) => set({ currentPrices: prices }),
      setLoading: (loading) => set({ loading }),
      setRefreshStatus: (status) => set({ refreshStatus: status }),
      setShowRefreshSuccess: (show) => set({ showRefreshSuccess: show }),
      setLastUpdated: (date) => set({ lastUpdated: date }),
      setPrevStats: (stats) => set({ prevStats: stats }),
      setRecommendedBaseChain: (chain) => set({ recommendedBaseChain: chain }),
      setAnomalies: (anomalies) => set({ anomalies }),
      setCrossChainComparison: (results) => set({ crossChainComparison: results }),
      setFetchData: (fn) => set({ fetchData: fn }),
      setClearCache: (fn) => set({ clearCache: fn }),
      setClearCacheForProvider: (fn) => set({ clearCacheForProvider: fn }),
      resetDataState: () => set(initialState),
    }),
    { name: 'CrossChainDataStore' }
  )
);
