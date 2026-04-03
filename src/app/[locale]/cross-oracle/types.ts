import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { OraclePriceSeries } from '@/components/oracle/charts/PriceCorrelationMatrix';
import type { PriceDeviationDataPoint } from '@/components/oracle/charts/PriceDeviationHeatmap';
import type { OraclePriceData } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import type { OraclePriceHistory } from '@/components/oracle/charts/PriceVolatilityChart';
import type { OraclePerformanceData } from '@/components/oracle/data-display/OraclePerformanceRanking';
import type { FavoriteConfig } from '@/hooks/useFavorites';
import type { UserFavorite } from '@/lib/supabase/queries';
import {
  type OracleProvider,
  type PriceData,
  type SnapshotStats,
  type OracleSnapshot,
} from '@/types/oracle';

import {
  type SortColumn,
  type SortDirection,
  type TimeRange,
  type DeviationFilter,
  type RefreshInterval,
  type HistoryMinMax,
} from './constants';

import type { TabId } from './components/TabNavigation';

export type { TimeRange, DeviationFilter } from './constants';
export type { TabId } from './components/TabNavigation';

// 跨预言机对比数据
export interface CrossOracleData {
  asset?: string;
  oracle?: string;
  provider?: string;
  chain?: string;
  price: number;
  timestamp: number;
  deviation?: number;
  confidence?: number;
}

export interface UseCrossOraclePageReturn {
  selectedOracles: OracleProvider[];
  setSelectedOracles: React.Dispatch<React.SetStateAction<OracleProvider[]>>;
  selectedSymbol: string;
  setSelectedSymbol: React.Dispatch<React.SetStateAction<string>>;
  priceData: PriceData[];
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  isLoading: boolean;
  lastUpdated: Date | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  refreshInterval: RefreshInterval;
  setRefreshInterval: React.Dispatch<React.SetStateAction<RefreshInterval>>;
  timeRange: TimeRange;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
  prevStats: SnapshotStats | null;
  lastStats: SnapshotStats | null;
  zoomLevel: number;
  deviationFilter: DeviationFilter;
  setDeviationFilter: React.Dispatch<React.SetStateAction<DeviationFilter>>;
  oracleFilter: OracleProvider | 'all';
  setOracleFilter: React.Dispatch<React.SetStateAction<OracleProvider | 'all'>>;
  expandedRow: number | null;
  setExpandedRow: React.Dispatch<React.SetStateAction<number | null>>;
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  isChartFullscreen: boolean;
  setIsChartFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  historyMinMax: HistoryMinMax;
  selectedSnapshot: OracleSnapshot | null;
  setSelectedSnapshot: React.Dispatch<React.SetStateAction<OracleSnapshot | null>>;
  showComparison: boolean;
  setShowComparison: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  highlightedOutlierIndex: number | null;
  tableRef: React.RefObject<HTMLTableSectionElement | null>;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  useAccessibleColors: boolean;
  setUseAccessibleColors: React.Dispatch<React.SetStateAction<boolean>>;
  hoveredOracle: OracleProvider | null;
  setHoveredOracle: React.Dispatch<React.SetStateAction<OracleProvider | null>>;
  selectedOracleFromChart: OracleProvider | null;
  setSelectedOracleFromChart: React.Dispatch<React.SetStateAction<OracleProvider | null>>;
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: React.Dispatch<React.SetStateAction<OracleProvider | null>>;
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
  router: AppRouterInstance;
  user: { id: string } | null;
  oracleFavorites: UserFavorite[];
  currentFavoriteConfig: FavoriteConfig;
  validPrices: number[];
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  currentStats: SnapshotStats;
  sortedPriceData: PriceData[];
  filteredPriceData: PriceData[];
  activeFilterCount: number;
  outlierStats: {
    count: number;
    avgDeviation: number;
    outliers: { index: number; provider: OracleProvider; zScore: number; deviation: number }[];
    oracleNames: string[];
  };
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  latencyData: number[];
  performanceData: OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  gasFeeData: {
    oracle: OracleProvider;
    chain: string;
    updateCost: number;
    updateFrequency: number;
    avgGasPrice: number;
    lastUpdate: number;
  }[];
  atrData: {
    oracle: OracleProvider;
    prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
  }[];
  bollingerData: {
    oracle: OracleProvider;
    prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
  }[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  handleSort: (column: SortColumn) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: import('@/types/oracle').OracleSnapshot) => void;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
  toggleOracle: (oracle: OracleProvider) => void;
  handleApplyFavorite: (config: FavoriteConfig) => void;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  scrollToOutlier: () => void;
  calculateChangePercent: (current: number, previous: number) => number | null;
  fetchPriceData: () => Promise<void>;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  getConsistencyRating: (stdDevPercent: number) => string;
  activeTab: TabId;
  handleTabChange: (tab: TabId) => void;
  setHoveredRowIndex: (index: number | null) => void;
  setSelectedRowIndex: (index: number | null) => void;
  // ControlPanel props
  symbols: string[];
  onQuery: () => void;
  onClearFilters: () => void;
  onSymbolChange: (symbol: string) => void;
  onDeviationFilterChange: (filter: DeviationFilter) => void;
  onAccessibleColorsChange: (value: boolean) => void;
}

export interface PriceStatsResult {
  validPrices: number[];
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  medianPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  currentStats: SnapshotStats;
}

export interface ChartDataPoint {
  timestamp: string;
  rawTimestamp: number;
  fullTimestamp?: Date;
  avgPrice?: number;
  stdDev?: number;
  upperBound1?: number;
  lowerBound1?: number;
  upperBound2?: number;
  lowerBound2?: number;
  oracleCount?: number;
  [key: string]: string | number | Date | undefined;
}

export interface ChartDataResult {
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  latencyData: number[];
  performanceData: OraclePerformanceData[];
}

export interface QualityTrendDataPoint {
  timestamp: number;
  updateLatency: number;
  deviationFromMedian: number;
  isOutlier: boolean;
  isStale: boolean;
  heartbeatCompliance: number;
}

export interface QualityTrendData {
  oracle: OracleProvider;
  data: QualityTrendDataPoint[];
}

export interface TechnicalIndicatorsResult {
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  gasFeeData: {
    oracle: OracleProvider;
    chain: string;
    updateCost: number;
    updateFrequency: number;
    avgGasPrice: number;
    lastUpdate: number;
  }[];
  atrData: {
    oracle: OracleProvider;
    prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
  }[];
  bollingerData: {
    oracle: OracleProvider;
    prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
  }[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
}

export interface FilterSortResult {
  sortedPriceData: PriceData[];
  filteredPriceData: PriceData[];
  activeFilterCount: number;
  outlierStats: {
    count: number;
    avgDeviation: number;
    outliers: { index: number; provider: OracleProvider; zScore: number; deviation: number }[];
    oracleNames: string[];
  };
  handleSort: (column: SortColumn) => void;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
}
