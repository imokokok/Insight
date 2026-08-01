import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { type CrossChainComparisonResult } from '@/lib/oracles/crossChainComparison';
import { type Blockchain, type PriceData } from '@/types/oracle';

interface DataState {
  currentPrices: PriceData[];
  crossChainComparison: CrossChainComparisonResult[];
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: Date | null;
  recommendedBaseChain: Blockchain | null;
  fetchData: (() => Promise<void>) | null;
}

interface DataActions {
  setCurrentPrices: (prices: PriceData[]) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setLastUpdated: (date: Date | null) => void;
  setCrossChainComparison: (results: CrossChainComparisonResult[]) => void;
  setFetchData: (fn: (() => Promise<void>) | null) => void;
}

const initialState: DataState = {
  currentPrices: [],
  crossChainComparison: [],
  loading: true,
  refreshStatus: 'idle',
  showRefreshSuccess: false,
  lastUpdated: null,
  recommendedBaseChain: null,
  fetchData: null,
};

export const useCrossChainDataStore = create<DataState & DataActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setCurrentPrices: (prices) => set({ currentPrices: prices }),
      setRefreshStatus: (status) => set({ refreshStatus: status }),
      setLastUpdated: (date) => set({ lastUpdated: date }),
      setCrossChainComparison: (results) => set({ crossChainComparison: results }),
      setFetchData: (fn) => set({ fetchData: fn }),
    }),
    { name: 'CrossChainDataStore' }
  )
);
