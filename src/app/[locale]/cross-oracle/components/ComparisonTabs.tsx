'use client';

import type { OraclePriceSeries } from '@/components/oracle/charts/PriceCorrelationMatrix';
import type { PriceDeviationDataPoint } from '@/components/oracle/charts/PriceDeviationHeatmap';
import type { OraclePriceData } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import type { OraclePriceHistory } from '@/components/oracle/charts/PriceVolatilityChart';
import type { OraclePerformanceData } from '@/components/oracle/data-display/OraclePerformanceRanking';
import { type OracleProvider, type PriceData, type SnapshotStats } from '@/types/oracle';

import { type TimeRange, type QualityTrendData, type ChartDataPoint } from '../types';
import { type PriceOracleProvider } from '../constants';

import { ControlPanel } from './ControlPanel';
import { type TabId, TabNavigation } from './TabNavigation';
import { PriceComparisonTab, QualityAnalysisTab, OracleProfilesTab } from './tabs';

import type { DataQualityScore } from '../hooks/useDataQualityScore';
import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

interface ComparisonTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  selectedSymbol: string;
  selectedOracles: PriceOracleProvider[];
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  timeRange: TimeRange;
  zoomLevel: number;
  hoveredOracle: PriceOracleProvider | null;
  setHoveredOracle: (oracle: PriceOracleProvider | null) => void;
  setOracleFilter: (filter: PriceOracleProvider | 'all') => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  sortColumn: 'price' | 'timestamp' | null;
  sortDirection: 'asc' | 'desc';
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
  historyMinMax: {
    avgPrice: { min: number; max: number };
    weightedAvgPrice: { min: number; max: number };
    maxPrice: { min: number; max: number };
    minPrice: { min: number; max: number };
    priceRange: { min: number; max: number };
    standardDeviationPercent: { min: number; max: number };
    variance: { min: number; max: number };
  };
  oracleChartColors: Record<PriceOracleProvider, string>;
  getChartData: () => ChartDataPoint[];
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  performanceData: OraclePerformanceData[];
  maData: { oracle: PriceOracleProvider; prices: { timestamp: number; price: number }[] }[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  selectedPerformanceOracle: PriceOracleProvider | null;
  setSelectedPerformanceOracle: (oracle: PriceOracleProvider | null) => void;
  currentStats: SnapshotStats;
  handleSort: (column: 'price' | 'timestamp' | null) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setTimeRange: (range: TimeRange) => void;
  fetchPriceData: () => Promise<void>;
  toggleOracle: (oracle: PriceOracleProvider) => void;
  getLineStrokeDasharray: (oracle: PriceOracleProvider) => string;
  getConsistencyRating: (stdDevPercent: number) => string;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getOracleLatencyData: (oracle: PriceOracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
  // ControlPanel props
  symbols: string[];
  onQuery: () => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  onSymbolChange: (symbol: string) => void;
  // 新增：风险预警和质量评分数据
  anomalies: PriceAnomaly[];
  qualityScore: DataQualityScore;
  // 新增：预言机特性数据
  oracleFeatures?: {
    provider: PriceOracleProvider;
    name: string;
    symbolCount: number;
    avgLatency: number;
    features: string[];
    description: string;
  }[];
  // 新增：异常统计
  anomalyCount?: number;
  highRiskCount?: number;
  mediumRiskCount?: number;
  lowRiskCount?: number;
  maxDeviation?: number;
}

export function ComparisonTabs(props: ComparisonTabsProps) {
  const {
    activeTab,
    onTabChange,
    // PriceComparisonTab props
    selectedSymbol,
    selectedOracles,
    priceData,
    filteredPriceData,
    isLoading,
    timeRange,
    zoomLevel,
    hoveredOracle,
    setHoveredOracle,
    setOracleFilter,
    chartContainerRef,
    sortColumn,
    sortDirection,
    expandedRow,
    setExpandedRow,
    hoveredRowIndex,
    setHoveredRowIndex,
    setSelectedRowIndex,
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviationPercent,
    validPrices,
    lastStats,
    oracleChartColors,
    getChartData,
    qualityScoreData,
    handleSort,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    setTimeRange,
    fetchPriceData,
    toggleOracle,
    getLineStrokeDasharray,
    getConsistencyRating,
    calculateChangePercent,
    // QualityAnalysisTab props
    anomalies,
    qualityScore,
    // OracleProfilesTab props
    oracleFeatures = [],
    // 异常统计
    anomalyCount = 0,
    highRiskCount = 0,
    mediumRiskCount = 0,
    lowRiskCount = 0,
    maxDeviation = 0,
    // ControlPanel props
    symbols,
    onQuery,
    activeFilterCount,
    onClearFilters,
    onSymbolChange,
    t,
  } = props;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'priceComparison':
        return (
          <PriceComparisonTab
            selectedSymbol={selectedSymbol}
            selectedOracles={selectedOracles}
            priceData={priceData}
            filteredPriceData={filteredPriceData}
            isLoading={isLoading}
            timeRange={timeRange}
            zoomLevel={zoomLevel}
            hoveredOracle={hoveredOracle}
            setHoveredOracle={setHoveredOracle}
            setOracleFilter={setOracleFilter}
            setIsChartFullscreen={() => {}}
            chartContainerRef={chartContainerRef}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
            selectedRowIndex={null}
            hoveredRowIndex={hoveredRowIndex}
            setHoveredRowIndex={setHoveredRowIndex}
            setSelectedRowIndex={setSelectedRowIndex}
            medianPrice={avgPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            deviationRate={standardDeviationPercent}
            consistencyRating={getConsistencyRating(standardDeviationPercent)}
            validPrices={validPrices}
            lastStats={lastStats}
            oracleChartColors={oracleChartColors}
            getChartData={getChartData}
            qualityScoreData={qualityScoreData}
            handleSort={handleSort}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            handleResetZoom={handleResetZoom}
            setTimeRange={setTimeRange}
            fetchPriceData={fetchPriceData}
            toggleOracle={toggleOracle}
            getLineStrokeDasharray={getLineStrokeDasharray}
            calculateChangePercent={calculateChangePercent}
            t={t}
          />
        );
      case 'qualityAnalysis':
        return (
          <QualityAnalysisTab
            priceData={priceData}
            isLoading={isLoading}
            selectedOracles={selectedOracles}
            qualityScore={qualityScore}
            anomalies={anomalies}
            anomalyCount={anomalyCount}
            highRiskCount={highRiskCount}
            mediumRiskCount={mediumRiskCount}
            lowRiskCount={lowRiskCount}
            maxDeviation={maxDeviation}
            lastUpdated={qualityScoreData.freshness.lastUpdated}
            successCount={qualityScoreData.completeness.successCount}
            totalCount={qualityScoreData.completeness.totalCount}
            t={t}
          />
        );
      case 'oracleProfiles':
        return (
          <OracleProfilesTab
            oracleFeatures={oracleFeatures}
            selectedOracles={selectedOracles}
            t={t}
          />
        );
      default:
        return (
          <PriceComparisonTab
            selectedSymbol={selectedSymbol}
            selectedOracles={selectedOracles}
            priceData={priceData}
            filteredPriceData={filteredPriceData}
            isLoading={isLoading}
            timeRange={timeRange}
            zoomLevel={zoomLevel}
            hoveredOracle={hoveredOracle}
            setHoveredOracle={setHoveredOracle}
            setOracleFilter={setOracleFilter}
            setIsChartFullscreen={() => {}}
            chartContainerRef={chartContainerRef}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
            selectedRowIndex={null}
            hoveredRowIndex={hoveredRowIndex}
            setHoveredRowIndex={setHoveredRowIndex}
            setSelectedRowIndex={setSelectedRowIndex}
            medianPrice={avgPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            deviationRate={standardDeviationPercent}
            consistencyRating={getConsistencyRating(standardDeviationPercent)}
            validPrices={validPrices}
            lastStats={lastStats}
            oracleChartColors={oracleChartColors}
            getChartData={getChartData}
            qualityScoreData={qualityScoreData}
            handleSort={handleSort}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            handleResetZoom={handleResetZoom}
            setTimeRange={setTimeRange}
            fetchPriceData={fetchPriceData}
            toggleOracle={toggleOracle}
            getLineStrokeDasharray={getLineStrokeDasharray}
            calculateChangePercent={calculateChangePercent}
            t={t}
          />
        );
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Sidebar - ControlPanel */}
      <aside className="xl:w-[400px] xl:flex-shrink-0">
        <div className="xl:sticky xl:top-6">
          <ControlPanel
            selectedSymbol={selectedSymbol}
            onSymbolChange={onSymbolChange}
            symbols={symbols}
            selectedOracles={selectedOracles}
            onOracleToggle={toggleOracle}
            oracleChartColors={oracleChartColors}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onQuery={onQuery}
            isLoading={isLoading}
            activeFilterCount={activeFilterCount}
            onClearFilters={onClearFilters}
            t={t}
          />
        </div>
      </aside>

      {/* Right Content - Tabs */}
      <main className="flex-1 min-w-0">
        <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
        <div className="mt-6">{renderTabContent()}</div>
      </main>
    </div>
  );
}
