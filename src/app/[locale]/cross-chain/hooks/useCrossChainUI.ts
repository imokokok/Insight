import { type Blockchain } from '@/lib/oracles';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';

export interface UseCrossChainUIReturn {
  visibleChains: Blockchain[];
  setVisibleChains: (chains: Blockchain[]) => void;
  showMA: boolean;
  setShowMA: (show: boolean) => void;
  maPeriod: number;
  setMaPeriod: (period: number) => void;
  chartKey: number;
  setChartKey: (key: number) => void;
  hiddenLines: string[];
  setHiddenLines: (lines: string[]) => void;
  focusedChain: Blockchain | null;
  setFocusedChain: (chain: Blockchain | null) => void;
  tableFilter: 'all' | 'abnormal' | 'normal';
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  hoveredCell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null;
  setHoveredCell: (
    cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null
  ) => void;
  selectedCell: { xChain: Blockchain; yChain: Blockchain } | null;
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
  tooltipPosition: { x: number; y: number };
  setTooltipPosition: (position: { x: number; y: number }) => void;
  sortColumn: string;
  setSortColumn: (column: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
}

export function useCrossChainUI(): UseCrossChainUIReturn {
  const {
    visibleChains,
    showMA,
    maPeriod,
    chartKey,
    hiddenLines,
    focusedChain,
    tableFilter,
    hoveredCell,
    selectedCell,
    tooltipPosition,
    sortColumn,
    sortDirection,
    setVisibleChains,
    setShowMA,
    setMaPeriod,
    setChartKey,
    setHiddenLines,
    setFocusedChain,
    setTableFilter,
    setHoveredCell,
    setSelectedCell,
    setTooltipPosition,
    setSortColumn,
    setSortDirection,
  } = useCrossChainUIStore();

  return {
    visibleChains,
    setVisibleChains,
    showMA,
    setShowMA,
    maPeriod,
    setMaPeriod,
    chartKey,
    setChartKey,
    hiddenLines,
    setHiddenLines,
    focusedChain,
    setFocusedChain,
    tableFilter,
    setTableFilter,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
  };
}
