import { create } from 'zustand';
import { OracleProvider, Blockchain, PriceData } from '@/lib/oracles';
import { RefreshInterval } from '@/app/cross-chain/constants';
import { ThresholdConfig, defaultThresholdConfig } from '@/app/cross-chain/utils';

interface SelectorState {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
}

interface UIState {
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';
  hoveredCell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null;
  selectedCell: { xChain: Blockchain; yChain: Blockchain } | null;
  tooltipPosition: { x: number; y: number };
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

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

interface ConfigState {
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
}

interface CrossChainStore extends SelectorState, UIState, DataState, ConfigState {
  setSelectedProvider: (provider: OracleProvider) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (range: number) => void;
  setSelectedBaseChain: (chain: Blockchain | null) => void;

  setVisibleChains: (chains: Blockchain[]) => void;
  setShowMA: (show: boolean) => void;
  setMaPeriod: (period: number) => void;
  setChartKey: (key: number) => void;
  setHiddenLines: (lines: Set<string>) => void;
  setFocusedChain: (chain: Blockchain | null) => void;
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  setHoveredCell: (
    cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null
  ) => void;
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
  setTooltipPosition: (position: { x: number; y: number }) => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;

  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (prices: Partial<Record<Blockchain, PriceData[]>>) => void;
  setLoading: (loading: boolean) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLastUpdated: (date: Date | null) => void;
  setPrevStats: (stats: DataState['prevStats']) => void;
  setRecommendedBaseChain: (chain: Blockchain | null) => void;

  setRefreshInterval: (interval: RefreshInterval) => void;
  setThresholdConfig: (config: ThresholdConfig) => void;
  setColorblindMode: (enabled: boolean) => void;

  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
}

const initialState: SelectorState & UIState & DataState & ConfigState = {
  selectedProvider: OracleProvider.CHAINLINK,
  selectedSymbol: 'BTC',
  selectedTimeRange: 24,
  selectedBaseChain: null,

  visibleChains: [],
  showMA: false,
  maPeriod: 7,
  chartKey: 0,
  hiddenLines: new Set(),
  focusedChain: null,
  tableFilter: 'all',
  hoveredCell: null,
  selectedCell: null,
  tooltipPosition: { x: 0, y: 0 },
  sortColumn: 'chain',
  sortDirection: 'asc',

  currentPrices: [],
  historicalPrices: {},
  loading: true,
  refreshStatus: 'idle',
  showRefreshSuccess: false,
  lastUpdated: null,
  prevStats: null,
  recommendedBaseChain: null,

  refreshInterval: 0,
  thresholdConfig: defaultThresholdConfig,
  colorblindMode: false,
};

export const useCrossChainStore = create<CrossChainStore>((set, get) => ({
  ...initialState,

  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
  setSelectedBaseChain: (chain) => set({ selectedBaseChain: chain }),

  setVisibleChains: (chains) => set({ visibleChains: chains }),
  setShowMA: (show) => set({ showMA: show }),
  setMaPeriod: (period) => set({ maPeriod: period }),
  setChartKey: (key) => set({ chartKey: key }),
  setHiddenLines: (lines) => set({ hiddenLines: lines }),
  setFocusedChain: (chain) => set({ focusedChain: chain }),
  setTableFilter: (filter) => set({ tableFilter: filter }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setSelectedCell: (cell) => set({ selectedCell: cell }),
  setTooltipPosition: (position) => set({ tooltipPosition: position }),
  setSortColumn: (column) => set({ sortColumn: column }),
  setSortDirection: (direction) => set({ sortDirection: direction }),

  setCurrentPrices: (prices) => set({ currentPrices: prices }),
  setHistoricalPrices: (prices) => set({ historicalPrices: prices }),
  setLoading: (loading) => set({ loading }),
  setRefreshStatus: (status) => set({ refreshStatus: status }),
  setShowRefreshSuccess: (show) => set({ showRefreshSuccess: show }),
  setLastUpdated: (date) => set({ lastUpdated: date }),
  setPrevStats: (stats) => set({ prevStats: stats }),
  setRecommendedBaseChain: (chain) => set({ recommendedBaseChain: chain }),

  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
  setThresholdConfig: (config) => set({ thresholdConfig: config }),
  setColorblindMode: (enabled) => set({ colorblindMode: enabled }),

  toggleChain: (chain) => {
    const { visibleChains } = get();
    if (visibleChains.includes(chain)) {
      set({ visibleChains: visibleChains.filter((c) => c !== chain) });
    } else {
      set({ visibleChains: [...visibleChains, chain] });
    }
  },

  handleSort: (column) => {
    const { sortColumn, sortDirection } = get();
    if (sortColumn === column) {
      set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortColumn: column, sortDirection: 'asc' });
    }
  },
}));

export const useSelectedProvider = () => useCrossChainStore((state) => state.selectedProvider);
export const useSelectedSymbol = () => useCrossChainStore((state) => state.selectedSymbol);
export const useSelectedTimeRange = () => useCrossChainStore((state) => state.selectedTimeRange);
export const useSelectedBaseChain = () => useCrossChainStore((state) => state.selectedBaseChain);

export const useVisibleChains = () => useCrossChainStore((state) => state.visibleChains);
export const useShowMA = () => useCrossChainStore((state) => state.showMA);
export const useMaPeriod = () => useCrossChainStore((state) => state.maPeriod);
export const useChartKey = () => useCrossChainStore((state) => state.chartKey);
export const useHiddenLines = () => useCrossChainStore((state) => state.hiddenLines);
export const useFocusedChain = () => useCrossChainStore((state) => state.focusedChain);
export const useTableFilter = () => useCrossChainStore((state) => state.tableFilter);
export const useHoveredCell = () => useCrossChainStore((state) => state.hoveredCell);
export const useSelectedCell = () => useCrossChainStore((state) => state.selectedCell);
export const useTooltipPosition = () => useCrossChainStore((state) => state.tooltipPosition);
export const useSortColumn = () => useCrossChainStore((state) => state.sortColumn);
export const useSortDirection = () => useCrossChainStore((state) => state.sortDirection);

export const useCurrentPrices = () => useCrossChainStore((state) => state.currentPrices);
export const useHistoricalPrices = () => useCrossChainStore((state) => state.historicalPrices);
export const useLoading = () => useCrossChainStore((state) => state.loading);
export const useRefreshStatus = () => useCrossChainStore((state) => state.refreshStatus);
export const useShowRefreshSuccess = () => useCrossChainStore((state) => state.showRefreshSuccess);
export const useLastUpdated = () => useCrossChainStore((state) => state.lastUpdated);
export const usePrevStats = () => useCrossChainStore((state) => state.prevStats);
export const useRecommendedBaseChain = () =>
  useCrossChainStore((state) => state.recommendedBaseChain);

export const useRefreshInterval = () => useCrossChainStore((state) => state.refreshInterval);
export const useThresholdConfig = () => useCrossChainStore((state) => state.thresholdConfig);
export const useColorblindMode = () => useCrossChainStore((state) => state.colorblindMode);
export const useSetColorblindMode = () => useCrossChainStore((state) => state.setColorblindMode);

export const useSelectorState = () =>
  useCrossChainStore((state) => ({
    selectedProvider: state.selectedProvider,
    selectedSymbol: state.selectedSymbol,
    selectedTimeRange: state.selectedTimeRange,
    selectedBaseChain: state.selectedBaseChain,
  }));

export const useUIState = () =>
  useCrossChainStore((state) => ({
    visibleChains: state.visibleChains,
    showMA: state.showMA,
    maPeriod: state.maPeriod,
    chartKey: state.chartKey,
    hiddenLines: state.hiddenLines,
    focusedChain: state.focusedChain,
    tableFilter: state.tableFilter,
    hoveredCell: state.hoveredCell,
    selectedCell: state.selectedCell,
    tooltipPosition: state.tooltipPosition,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
  }));

export const useDataState = () =>
  useCrossChainStore((state) => ({
    currentPrices: state.currentPrices,
    historicalPrices: state.historicalPrices,
    loading: state.loading,
    refreshStatus: state.refreshStatus,
    showRefreshSuccess: state.showRefreshSuccess,
    lastUpdated: state.lastUpdated,
    prevStats: state.prevStats,
    recommendedBaseChain: state.recommendedBaseChain,
  }));
