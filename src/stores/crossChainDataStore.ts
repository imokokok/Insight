import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { type CrossChainComparisonResult } from '@/lib/oracles/crossChainComparison';
import { type AnomalousPricePoint } from '@/lib/types/crossChain';
import { type PriceStats } from '@/types/analytics';
import { type Blockchain, type PriceData } from '@/types/oracle';

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
}

interface DataActions {
  setCurrentPrices: (prices: PriceData[]) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setLastUpdated: (date: Date | null) => void;
  setAnomalies: (anomalies: AnomalousPricePoint[]) => void;
  setCrossChainComparison: (results: CrossChainComparisonResult[]) => void;
}

let _fetchData: (() => Promise<void>) | null = null;

export function setFetchDataRef(fn: () => Promise<void>) {
  _fetchData = fn;
}

export function getFetchData(): (() => Promise<void>) | null {
  return _fetchData;
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
};

export const useCrossChainDataStore = create<DataState & DataActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setCurrentPrices: (prices) => set({ currentPrices: prices }),
      setRefreshStatus: (status) => set({ refreshStatus: status }),
      setLastUpdated: (date) => set({ lastUpdated: date }),
      setAnomalies: (anomalies) => set({ anomalies }),
      setCrossChainComparison: (results) => set({ crossChainComparison: results }),
    }),
    { name: 'CrossChainDataStore' }
  )
);
