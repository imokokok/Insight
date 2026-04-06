import type { OracleProvider, Blockchain, PriceData } from '@/types';
import type { RefreshInterval } from '@/types/comparison';

export type TableFilter = 'all' | 'abnormal' | 'normal';
export type RefreshStatus = 'idle' | 'refreshing' | 'success' | 'error';

export interface ThresholdConfig {
  warning: number;
  danger: number;
}

export interface CrossChainState {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: TableFilter;
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: RefreshStatus;
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
}

export interface CrossChainActions {
  setSelectedProvider: (provider: OracleProvider) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (timeRange: number) => void;
  setSelectedBaseChain: (chain: Blockchain | null) => void;
  toggleChain: (chain: Blockchain) => void;
  setVisibleChains: (chains: Blockchain[]) => void;
  setShowMA: (show: boolean) => void;
  setMAPeriod: (period: number) => void;
  incrementChartKey: () => void;
  toggleLine: (lineId: string) => void;
  setHiddenLines: (lines: Set<string>) => void;
  setFocusedChain: (chain: Blockchain | null) => void;
  setTableFilter: (filter: TableFilter) => void;
  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (chain: Blockchain, prices: PriceData[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshStatus: (status: RefreshStatus) => void;
  setRefreshInterval: (interval: RefreshInterval) => void;
  setThresholdConfig: (config: Partial<ThresholdConfig>) => void;
  setColorblindMode: (enabled: boolean) => void;
  reset: () => void;
}

export type CrossChainStore = CrossChainState & CrossChainActions;
