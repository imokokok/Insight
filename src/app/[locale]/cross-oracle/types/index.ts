/**
 * @fileoverview 多预言机对比页面类型定义
 * @description 统一导出所有类型定义，确保类型系统清晰一致
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { OraclePriceSeries } from '@/components/oracle/charts/PriceCorrelationMatrix';
import type { PriceDeviationDataPoint } from '@/components/oracle/charts/PriceDeviationHeatmap';
import type { OraclePriceData } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import type { OraclePriceHistory } from '@/components/oracle/charts/PriceVolatilityChart';
import type { OraclePerformanceData } from '@/components/oracle/data-display/OraclePerformanceRanking';
import type { FavoriteConfig } from '@/hooks/data';
import type { UserFavorite } from '@/lib/supabase/queries';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/performanceMetricsCalculator';
import type { MemoryStats } from '@/lib/oracles/memoryManager';
import {
  type OracleProvider,
  type PriceData,
  type SnapshotStats,
  type OracleSnapshot,
} from '@/types/oracle';

// 从 constants.tsx 导入基础类型
import type { SortColumn, SortDirection, TimeRange, DeviationFilter } from '../constants';

// 重新导出基础类型
export type { SortColumn, SortDirection, TimeRange, DeviationFilter } from '../constants';

// TabId 类型定义（避免循环依赖）
export type TabId = 'priceComparison' | 'qualityAnalysis' | 'oracleProfiles';

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
  medianPrice: number;
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
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  latencyData: number[];
  performanceData: OraclePerformanceData[];
}

// 旧版 ChartDataResult（兼容 useChartData.ts）
export type ChartDataResult = ChartConfigResult;

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
// 错误类型定义
// ============================================================================

export type OracleErrorType = 'network' | 'timeout' | 'data_format' | 'rate_limit' | 'unknown';

export interface OracleErrorInfo {
  provider: OracleProvider;
  errorType: OracleErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
  timestamp: number;
}

export interface PartialSuccessState {
  isSuccess: boolean;
  successCount: number;
  failedCount: number;
  totalCount: number;
  failedOracles: OracleProvider[];
  successOracles: OracleProvider[];
}

export interface OracleDataError {
  hasError: boolean;
  isPartialSuccess: boolean;
  partialSuccess: PartialSuccessState | null;
  errors: OracleErrorInfo[];
  globalError: Error | null;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

// ============================================================================
// Hook 返回类型
// ============================================================================

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
  outlierStats: OutlierStats;
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  latencyData: number[];
  performanceData: OraclePerformanceData[];
  maData: MovingAverageData[];
  gasFeeData: GasFeeData[];
  atrData: ATRData[];
  bollingerData: BollingerData[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: QualityScoreData;
  handleSort: (column: SortColumn) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleSaveSnapshot: () => void;
  handleSelectSnapshot: (snapshot: OracleSnapshot) => void;
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
  symbols: string[];
  onQuery: () => void;
  onClearFilters: () => void;
  onSymbolChange: (symbol: string) => void;
  onDeviationFilterChange: (filter: DeviationFilter) => void;
  onAccessibleColorsChange: (value: boolean) => void;
}

export interface UseOracleDataReturn {
  priceData: PriceData[];
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  fetchPriceData: () => Promise<void>;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  performanceMetrics: CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;
  oracleDataError: OracleDataError;
  retryConfig: RetryConfig;
  setRetryConfig: (config: Partial<RetryConfig>) => void;
  retryOracle: (provider: OracleProvider) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  isRetrying: boolean;
  retryingOracles: OracleProvider[];
  getMemoryStats: () => MemoryStats;
  clearHistoryData: () => void;
  getDetailedMemoryStats: () => {
    localPriceHistory: MemoryStats;
    calculatorStats: {
      basic: { totalEntries: number; providerCount: number; cacheSize: number };
      memory: MemoryStats;
      entriesByProvider: Record<string, number>;
    };
    formattedBytes: string;
  };
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
  user: { id: string } | null;
  oracleFavorites: UserFavorite[];
  currentFavoriteConfig: FavoriteConfig;
  handleClearFilters: () => void;
  getFilterSummary: () => string[];
  handleApplyFavorite: (config: FavoriteConfig) => void;
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
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  performanceData: OraclePerformanceData[];
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
// 风险预警相关类型
// ============================================================================

export interface PriceAnomaly {
  provider: OracleProvider;
  price: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface DataQualityScore {
  consistency: number; // 0-100
  freshness: number; // 0-100
  completeness: number; // 0-100
  overall: number; // 0-100
  suggestions: string[];
}

/**
 * 专业质量指标
 */
export interface ProfessionalQualityMetrics {
  /** 变异系数 (Coefficient of Variation) = 标准差 / 平均值 */
  coefficientOfVariation: number;
  /** 标准误差 (Standard Error of Mean) = 标准差 / √n */
  standardError: number;
  /** 95%置信区间下限 */
  confidenceIntervalLower: number;
  /** 95%置信区间上限 */
  confidenceIntervalUpper: number;
  /** 样本数量 */
  sampleSize: number;
  /** 平均值 */
  mean: number;
  /** 中位数 */
  median: number;
  /** 标准差 */
  standardDeviation: number;
  /** 方差 */
  variance: number;
}

/**
 * 延迟统计
 */
export interface LatencyStats {
  /** P50 中位数延迟 */
  p50: number;
  /** P95 延迟 */
  p95: number;
  /** P99 延迟 */
  p99: number;
  /** 最小延迟 */
  min: number;
  /** 最大延迟 */
  max: number;
  /** 平均延迟 */
  avg: number;
}

/**
 * 单个预言机质量指标
 */
export interface OracleQualityMetrics {
  /** 预言机提供商 */
  provider: OracleProvider;
  /** 价格 */
  price: number;
  /** 相对中位数的偏差百分比 */
  deviationPercent: number;
  /** Z-Score (标准分数) */
  zScore: number;
  /** 更新延迟(ms) */
  latency: number;
  /** 置信度 0-1 */
  confidence: number;
  /** 是否为异常值 */
  isOutlier: boolean;
  /** 最后更新时间 */
  lastUpdated: number;
}

/**
 * 扩展的数据质量评分（包含专业指标）
 */
export interface ExtendedDataQualityScore extends DataQualityScore {
  /** 专业统计指标 */
  professionalMetrics: ProfessionalQualityMetrics;
  /** 各预言机质量指标 */
  oracleMetrics: OracleQualityMetrics[];
  /** 延迟统计 */
  latencyStats: LatencyStats;
}

export interface OracleFeature {
  provider: OracleProvider;
  name: string;
  symbolCount: number;
  avgLatency: number;
  features: string[];
  descriptionKey: string;
}

// ============================================================================
// 导出类型别名（保持向后兼容）
// ============================================================================

export type { OracleProvider, PriceData, SnapshotStats, OracleSnapshot };
