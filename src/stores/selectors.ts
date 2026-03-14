import { useCrossChainStore } from './crossChainStore';
import type { Blockchain } from '@/lib/oracles';

type CrossChainState = ReturnType<typeof useCrossChainStore.getState>;

export const selectSelectedProvider = (state: CrossChainState) => state.selectedProvider;

export const selectSelectedSymbol = (state: CrossChainState) => state.selectedSymbol;

export const selectSelectedTimeRange = (state: CrossChainState) => state.selectedTimeRange;

export const selectSelectedBaseChain = (state: CrossChainState) => state.selectedBaseChain;

export const selectVisibleChains = (state: CrossChainState) => state.visibleChains;

export const selectShowMA = (state: CrossChainState) => state.showMA;

export const selectMaPeriod = (state: CrossChainState) => state.maPeriod;

export const selectTableFilter = (state: CrossChainState) => state.tableFilter;

export const selectSortConfig = (state: CrossChainState) => ({
  sortColumn: state.sortColumn,
  sortDirection: state.sortDirection,
});

export const selectCurrentPrices = (state: CrossChainState) => state.currentPrices;

export const selectHistoricalPrices = (state: CrossChainState) => state.historicalPrices;

export const selectLoading = (state: CrossChainState) => state.loading;

export const selectRefreshStatus = (state: CrossChainState) => state.refreshStatus;

export const selectLastUpdated = (state: CrossChainState) => state.lastUpdated;

export const selectRefreshInterval = (state: CrossChainState) => state.refreshInterval;

export const selectThresholdConfig = (state: CrossChainState) => state.thresholdConfig;

export const selectColorblindMode = (state: CrossChainState) => state.colorblindMode;

export const selectUserPreferences = (state: CrossChainState) => ({
  refreshInterval: state.refreshInterval,
  thresholdConfig: state.thresholdConfig,
  colorblindMode: state.colorblindMode,
  showMA: state.showMA,
  maPeriod: state.maPeriod,
  tableFilter: state.tableFilter,
});

export const selectSelectorState = (state: CrossChainState) => ({
  selectedProvider: state.selectedProvider,
  selectedSymbol: state.selectedSymbol,
  selectedTimeRange: state.selectedTimeRange,
  selectedBaseChain: state.selectedBaseChain,
});

export const selectDataState = (state: CrossChainState) => ({
  currentPrices: state.currentPrices,
  historicalPrices: state.historicalPrices,
  loading: state.loading,
  refreshStatus: state.refreshStatus,
  lastUpdated: state.lastUpdated,
});

export const selectUIState = (state: CrossChainState) => ({
  visibleChains: state.visibleChains,
  showMA: state.showMA,
  maPeriod: state.maPeriod,
  tableFilter: state.tableFilter,
  sortColumn: state.sortColumn,
  sortDirection: state.sortDirection,
});

export const selectChartState = (state: CrossChainState) => ({
  showMA: state.showMA,
  maPeriod: state.maPeriod,
  hiddenLines: state.hiddenLines,
  focusedChain: state.focusedChain,
  chartKey: state.chartKey,
});

export const selectTableState = (state: CrossChainState) => ({
  tableFilter: state.tableFilter,
  sortColumn: state.sortColumn,
  sortDirection: state.sortDirection,
  hoveredCell: state.hoveredCell,
  selectedCell: state.selectedCell,
});

export const selectPriceStats = (state: CrossChainState) => ({
  prevStats: state.prevStats,
  recommendedBaseChain: state.recommendedBaseChain,
});

export const selectActions = (state: CrossChainState) => ({
  setSelectedProvider: state.setSelectedProvider,
  setSelectedSymbol: state.setSelectedSymbol,
  setSelectedTimeRange: state.setSelectedTimeRange,
  setSelectedBaseChain: state.setSelectedBaseChain,
  setVisibleChains: state.setVisibleChains,
  toggleChain: state.toggleChain,
  setShowMA: state.setShowMA,
  setMaPeriod: state.setMaPeriod,
  setTableFilter: state.setTableFilter,
  handleSort: state.handleSort,
  setRefreshInterval: state.setRefreshInterval,
  setThresholdConfig: state.setThresholdConfig,
  setColorblindMode: state.setColorblindMode,
  setLoading: state.setLoading,
  setRefreshStatus: state.setRefreshStatus,
  setCurrentPrices: state.setCurrentPrices,
  setHistoricalPrices: state.setHistoricalPrices,
});

export const createSelectorHooks = <T>(selector: (state: CrossChainState) => T) => {
  return () => useCrossChainStore(selector);
};

export const useSelectedProviderSelector = () => useCrossChainStore(selectSelectedProvider);
export const useSelectedSymbolSelector = () => useCrossChainStore(selectSelectedSymbol);
export const useSelectedTimeRangeSelector = () => useCrossChainStore(selectSelectedTimeRange);
export const useVisibleChainsSelector = () => useCrossChainStore(selectVisibleChains);
export const useUserPreferencesSelector = () => useCrossChainStore(selectUserPreferences);
export const useDataStateSelector = () => useCrossChainStore(selectDataState);
export const useUIStateSelector = () => useCrossChainStore(selectUIState);
export const useChartStateSelector = () => useCrossChainStore(selectChartState);
export const useTableStateSelector = () => useCrossChainStore(selectTableState);
export const useActionsSelector = () => useCrossChainStore(selectActions);

export const createChainSpecificSelector = (chain: Blockchain) => {
  return (state: CrossChainState) => ({
    isVisible: state.visibleChains.includes(chain),
    isFocused: state.focusedChain === chain,
    historicalPrices: state.historicalPrices[chain],
  });
};

export const createPriceComparisonSelector = () => {
  return (state: CrossChainState) => {
    const prices = state.currentPrices;
    const threshold = state.thresholdConfig;

    if (prices.length === 0) return { comparisons: [], threshold };

    const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

    const comparisons = prices.map((p) => ({
      chain: p.chain,
      price: p.price,
      deviation: ((p.price - avgPrice) / avgPrice) * 100,
    }));

    return { comparisons, threshold, avgPrice };
  };
};

export const usePriceComparison = () => useCrossChainStore(createPriceComparisonSelector());
