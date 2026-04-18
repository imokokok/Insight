import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { type AnomalousPricePoint } from '@/app/cross-chain/utils/anomalyDetection';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

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

interface DataActions {
  fetchData: (() => Promise<void>) | null;
  clearCache: (() => void) | null;
  clearCacheForProvider: ((provider: OracleProvider) => void) | null;
  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (prices: Partial<Record<Blockchain, PriceData[]>>) => void;
  setLoading: (loading: boolean) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLastUpdated: (date: Date | null) => void;
  setPrevStats: (stats: DataState['prevStats']) => void;
  setRecommendedBaseChain: (chain: Blockchain | null) => void;
  setAnomalies: (anomalies: AnomalousPricePoint[]) => void;
  setFetchData: (fn: (() => Promise<void>) | null) => void;
  setClearCache: (fn: (() => void) | null) => void;
  setClearCacheForProvider: (fn: ((provider: OracleProvider) => void) | null) => void;
}

interface CrossChainDataStore extends DataState, DataActions {}

const initialState: DataState &
  Pick<DataActions, 'fetchData' | 'clearCache' | 'clearCacheForProvider'> = {
  currentPrices: [],
  historicalPrices: {},
  loading: true,
  refreshStatus: 'idle',
  showRefreshSuccess: false,
  lastUpdated: null,
  prevStats: null,
  recommendedBaseChain: null,
  anomalies: [],
  fetchData: null,
  clearCache: null,
  clearCacheForProvider: null,
};

export const useCrossChainDataStore = create<CrossChainDataStore>()(
  devtools(
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
      setFetchData: (fn) => set({ fetchData: fn }),
      setClearCache: (fn) => set({ clearCache: fn }),
      setClearCacheForProvider: (fn) => set({ clearCacheForProvider: fn }),
    }),
    { name: 'CrossChainDataStore' }
  )
);
