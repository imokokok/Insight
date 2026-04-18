import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type Blockchain } from '@/lib/oracles';

interface UIState {
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: string[];
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';
  hoveredCell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null;
  selectedCell: { xChain: Blockchain; yChain: Blockchain } | null;
  tooltipPosition: { x: number; y: number };
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

interface CrossChainUIStore extends UIState {
  setVisibleChains: (chains: Blockchain[]) => void;
  setShowMA: (show: boolean) => void;
  setMaPeriod: (period: number) => void;
  setChartKey: (key: number) => void;
  setHiddenLines: (lines: string[]) => void;
  setFocusedChain: (chain: Blockchain | null) => void;
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  setHoveredCell: (
    cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null
  ) => void;
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
  setTooltipPosition: (position: { x: number; y: number }) => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;

  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
}

const initialState: UIState = {
  visibleChains: [],
  showMA: false,
  maPeriod: 7,
  chartKey: 0,
  hiddenLines: [],
  focusedChain: null,
  tableFilter: 'all',
  hoveredCell: null,
  selectedCell: null,
  tooltipPosition: { x: 0, y: 0 },
  sortColumn: 'chain',
  sortDirection: 'asc',
};

export const useCrossChainUIStore = create<CrossChainUIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

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
      }),
      {
        name: 'cross-chain-ui-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          showMA: state.showMA,
          maPeriod: state.maPeriod,
          tableFilter: state.tableFilter,
          sortColumn: state.sortColumn,
          sortDirection: state.sortDirection,
          hiddenLines: state.hiddenLines,
        }),
      }
    ),
    { name: 'CrossChainUIStore' }
  )
);

const useVisibleChains = () => useCrossChainUIStore((state) => state.visibleChains);
const useShowMA = () => useCrossChainUIStore((state) => state.showMA);
const useMaPeriod = () => useCrossChainUIStore((state) => state.maPeriod);
const useChartKey = () => useCrossChainUIStore((state) => state.chartKey);
const useHiddenLines = () => useCrossChainUIStore((state) => state.hiddenLines);
const useFocusedChain = () => useCrossChainUIStore((state) => state.focusedChain);
const useTableFilter = () => useCrossChainUIStore((state) => state.tableFilter);
const useHoveredCell = () => useCrossChainUIStore((state) => state.hoveredCell);
const useSelectedCell = () => useCrossChainUIStore((state) => state.selectedCell);
const useTooltipPosition = () => useCrossChainUIStore((state) => state.tooltipPosition);
const useSortColumn = () => useCrossChainUIStore((state) => state.sortColumn);
const useSortDirection = () => useCrossChainUIStore((state) => state.sortDirection);

const useUIState = () =>
  useCrossChainUIStore((state) => ({
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
