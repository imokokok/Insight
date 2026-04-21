import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { type CrossChainComparisonResult } from '@/lib/oracles/crossChainComparison';
import { type AnomalousPricePoint } from '@/lib/types/crossChain';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

interface DataState {
  currentPrices: PriceData[];
  crossChainComparison: CrossChainComparisonResult[];
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
  setDataLoaded: (data: {
    prices: PriceData[];
    prevStats: DataState['prevStats'];
    anomalies: AnomalousPricePoint[];
    recommendedBaseChain: Blockchain | null;
  }) => void;
  registerFetchData: (fn: () => Promise<void>) => void;
  registerClearCache: (fn: () => void) => void;
  registerClearCacheForProvider: (fn: (provider: OracleProvider) => void) => void;
}

interface CrossChainDataStore extends DataState, DataActions {}

const noOpAsync = () => Promise.resolve();
const noOp = () => {};
const noOpProvider = (_provider: OracleProvider) => {};

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
  fetchData: noOpAsync,
  clearCache: noOp,
  clearCacheForProvider: noOpProvider,
};

export const useCrossChainDataStore = create<CrossChainDataStore>()(
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
      setDataLoaded: (data) =>
        set({
          currentPrices: data.prices,
          prevStats: data.prevStats,
          anomalies: data.anomalies,
          recommendedBaseChain: data.recommendedBaseChain,
          loading: false,
          lastUpdated: new Date(),
        }),
      registerFetchData: (fn) => set({ fetchData: fn }),
      registerClearCache: (fn) => set({ clearCache: fn }),
      registerClearCacheForProvider: (fn) => set({ clearCacheForProvider: fn }),
    }),
    { name: 'CrossChainDataStore' }
  )
);
