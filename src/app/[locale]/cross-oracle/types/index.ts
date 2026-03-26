/**
 * @fileoverview 多预言机对比页面类型定义
 * @description 统一导出所有类型定义，确保类型系统清晰一致
 */

import { OracleProvider, PriceData, SnapshotStats } from '@/types/oracle';
import type { OracleSnapshot } from '@/types/oracle';

// 从 constants.tsx 导入基础类型
import type {
  SortColumn,
  SortDirection,
  TimeRange,
  DeviationFilter,
} from '../constants';

// 重新导出基础类型
export type { SortColumn, SortDirection, TimeRange, DeviationFilter } from '../constants';

// TabId 类型定义（避免循环依赖）
export type TabId = 'overview' | 'charts' | 'advanced' | 'snapshots' | 'performance';

// ============================================================================
// 基础类型定义
// ============================================================================

export type RefreshInterval = 0 | 30000 | 60000 | 300000;

// 跨预言机对比数据（用于导出）
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

// ============================================================================
// 历史数据极值类型
// ============================================================================

export interface HistoryMinMaxValue {
  min: number;
  max: number;
}

export interface HistoryMinMax {
  avgPrice: HistoryMinMaxValue;
  weightedAvgPrice: HistoryMinMaxValue;
  maxPrice: HistoryMinMaxValue;
  minPrice: HistoryMinMaxValue;
  priceRange: HistoryMinMaxValue;
  standardDeviationPercent: HistoryMinMaxValue;
  variance: HistoryMinMaxValue;
}

// ============================================================================
// 图表数据类型
// ============================================================================

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

// ============================================================================
// 统计数据类型
// ============================================================================

export interface PriceStatsResult {
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
}

export interface OutlierInfo {
  index: number;
  provider: OracleProvider;
  zScore: number;
  deviation: number;
}

export interface OutlierStats {
  count: number;
  avgDeviation: number;
  outliers: OutlierInfo[];
  oracleNames: string[];
}

// ============================================================================
// 筛选排序结果类型
// ============================================================================

export interface FilterSortResult {
  sortedPriceData: PriceData[];
  filteredPriceData: PriceData[];
  activeFilterCount: number;
  outlierStats: OutlierStats;
  handleSort: (column: SortColumn) => void;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
}

// ============================================================================
// 图表配置结果类型
// ============================================================================

export interface ChartConfigResult {
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  latencyData: number[];
  performanceData: import('@/components/oracle/data-display/OraclePerformanceRanking').OraclePerformanceData[];
}

// 旧版 ChartDataResult（兼容 useChartData.ts）
export interface ChartDataResult extends ChartConfigResult {}

// ============================================================================
// 技术指标结果类型
// ============================================================================

export interface MovingAverageData {
  oracle: OracleProvider;
  prices: { timestamp: number; price: number }[];
}

export interface GasFeeData {
  oracle: OracleProvider;
  chain: string;
  updateCost: number;
  updateFrequency: number;
  avgGasPrice: number;
  lastUpdate: number;
}

export interface ATRData {
  oracle: OracleProvider;
  prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
}

export interface BollingerData {
  oracle: OracleProvider;
  prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
}

export interface QualityScoreData {
  freshness: { lastUpdated: Date };
  completeness: { successCount: number; totalCount: number };
  reliability: { historicalAccuracy: number; responseSuccessRate: number };
}

export interface TechnicalIndicatorsResult {
  maData: MovingAverageData[];
  gasFeeData: GasFeeData[];
  atrData: ATRData[];
  bollingerData: BollingerData[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: QualityScoreData;
}

// ============================================================================
// Hook 返回类型
// ============================================================================

export interface UseOracleDataReturn {
  priceData: PriceData[];
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  fetchPriceData: () => Promise<void>;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
}

export interface UseChartConfigReturn extends ChartConfigResult {
  historyMinMax: HistoryMinMax;
}

export interface UseFilterSortReturn extends FilterSortResult {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  deviationFilter: DeviationFilter;
  setDeviationFilter: (filter: DeviationFilter) => void;
  oracleFilter: OracleProvider | 'all';
  setOracleFilter: (filter: OracleProvider | 'all') => void;
}

export interface UseExportReturn {
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  handleSaveSnapshot: () => void;
}

// ============================================================================
// 页面状态类型
// ============================================================================

export interface CrossOraclePageState {
  // 选择状态
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  
  // UI 状态
  expandedRow: number | null;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  hoveredOracle: OracleProvider | null;
  isFilterPanelOpen: boolean;
  isChartFullscreen: boolean;
  showFavoritesDropdown: boolean;
  useAccessibleColors: boolean;
  
  // 图表状态
  zoomLevel: number;
  timeRange: TimeRange;
  
  // 快照状态
  selectedSnapshot: OracleSnapshot | null;
  showComparison: boolean;
  selectedPerformanceOracle: OracleProvider | null;
  
  // 历史统计
  lastStats: SnapshotStats | null;
}

// ============================================================================
// 组件 Props 类型
// ============================================================================

export interface HeaderSectionProps {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedOracles: OracleProvider[];
  isLoading: boolean;
  lastUpdated: Date | null;
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (open: boolean) => void;
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  deviationFilter: DeviationFilter;
  setDeviationFilter: (filter: DeviationFilter) => void;
  oracleFilter: OracleProvider | 'all';
  setOracleFilter: (filter: OracleProvider | 'all') => void;
  activeFilterCount: number;
  useAccessibleColors: boolean;
  setUseAccessibleColors: (value: boolean) => void;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  user: ReturnType<typeof import('@/stores/authStore').useUser>;
  oracleFavorites: ReturnType<typeof import('@/hooks/useFavorites').useFavorites>['favorites'];
  currentFavoriteConfig: import('@/hooks/useFavorites').FavoriteConfig;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
  handleApplyFavorite: (config: import('@/hooks/useFavorites').FavoriteConfig) => void;
  fetchPriceData: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface StatsSectionProps {
  qualityScoreData: QualityScoreData;
  selectedSymbol: string;
  selectedOracles: string[];
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
  variance: number;
  lastStats: {
    avgPrice: number;
    maxPrice: number;
  } | null;
  historyMinMax: HistoryMinMax;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getConsistencyRating: (stdDevPercent: number) => string;
  t: (key: string) => string;
}

export interface PriceTableSectionProps {
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  expandedRow: number | null;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  chartColors: Record<OracleProvider, string>;
  avgPrice: number;
  standardDeviation: number;
  validPrices: number[];
  selectedOracles: OracleProvider[];
  oracleChartColors: Record<OracleProvider, string>;
  onSort: (column: SortColumn) => void;
  onExpandRow: (index: number | null) => void;
  onSetHoveredRow: (index: number | null) => void;
  onSetSelectedRow: (index: number | null) => void;
  onHoverOracle: (oracle: OracleProvider | null) => void;
  onToggleOracle: (oracle: OracleProvider) => void;
  t: (key: string) => string;
}

export interface ComparisonTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  timeRange: TimeRange;
  zoomLevel: number;
  hoveredOracle: OracleProvider | null;
  setHoveredOracle: (oracle: OracleProvider | null) => void;
  setOracleFilter: (filter: OracleProvider | 'all') => void;
  setIsChartFullscreen: (fullscreen: boolean) => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  expandedRow: number | null;
  setExpandedRow: (row: number | null) => void;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  setHoveredRowIndex: (index: number | null) => void;
  setSelectedRowIndex: (index: number | null) => void;
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  variance: number;
  validPrices: number[];
  lastStats: SnapshotStats | null;
  historyMinMax: HistoryMinMax;
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  performanceData: import('@/components/oracle/data-display/OraclePerformanceRanking').OraclePerformanceData[];
  maData: MovingAverageData[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: QualityScoreData;
  selectedSnapshot: OracleSnapshot | null;
  setSelectedSnapshot: (snapshot: OracleSnapshot | null) => void;
  showComparison: boolean;
  setShowComparison: (show: boolean) => void;
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  currentStats: SnapshotStats;
  handleSort: (column: SortColumn) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setTimeRange: (range: TimeRange) => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: OracleSnapshot) => void;
  fetchPriceData: () => Promise<void>;
  toggleOracle: (oracle: OracleProvider) => void;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  getConsistencyRating: (stdDevPercent: number) => string;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
  // ControlPanel props
  symbols: string[];
  deviationFilter: DeviationFilter;
  onDeviationFilterChange: (filter: DeviationFilter) => void;
  useAccessibleColors: boolean;
  onAccessibleColorsChange: (value: boolean) => void;
  onQuery: () => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  onSymbolChange: (symbol: string) => void;
}

// ============================================================================
// 导出类型别名（保持向后兼容）
// ============================================================================

export type { OracleProvider, PriceData, SnapshotStats, OracleSnapshot };
