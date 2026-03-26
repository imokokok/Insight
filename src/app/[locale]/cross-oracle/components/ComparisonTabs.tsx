'use client';

import { OracleProvider, PriceData, SnapshotStats } from '@/types/oracle';
import { OracleSnapshot } from '@/types/oracle';
import { TimeRange, QualityTrendData, DeviationFilter } from '../types';
import { TabId, TabNavigation } from './TabNavigation';
import { ControlPanel } from './ControlPanel';
import { OverviewTab, AnalysisTab, ChainsTab, HistoryTab } from './tabs';

interface ComparisonTabsProps {
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
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => import('../types').ChartDataPoint[];
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  performanceData: import('@/components/oracle/common/OraclePerformanceRanking').OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  qualityTrendData: QualityTrendData[];
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  selectedSnapshot: OracleSnapshot | null;
  setSelectedSnapshot: (snapshot: OracleSnapshot | null) => void;
  showComparison: boolean;
  setShowComparison: (show: boolean) => void;
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  currentStats: SnapshotStats;
  handleSort: (column: 'price' | 'timestamp' | null) => void;
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

export function ComparisonTabs(props: ComparisonTabsProps) {
  const {
    activeTab,
    onTabChange,
    // OverviewTab props
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
    setIsChartFullscreen,
    chartContainerRef,
    sortColumn,
    sortDirection,
    expandedRow,
    setExpandedRow,
    selectedRowIndex,
    hoveredRowIndex,
    setHoveredRowIndex,
    setSelectedRowIndex,
    avgPrice,
    weightedAvgPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviation,
    standardDeviationPercent,
    variance,
    validPrices,
    lastStats,
    historyMinMax,
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
    // AnalysisTab props
    heatmapData,
    boxPlotData,
    volatilityData,
    correlationData,
    performanceData,
    maData,
    qualityTrendData,
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,
    getOracleLatencyData,
    // HistoryTab props
    selectedSnapshot,
    setSelectedSnapshot,
    showComparison,
    setShowComparison,
    currentStats,
    handleSaveSnapshot,
    handleSelectSnapshot,
    // ControlPanel props
    symbols,
    deviationFilter,
    onDeviationFilterChange,
    useAccessibleColors,
    onAccessibleColorsChange,
    onQuery,
    activeFilterCount,
    onClearFilters,
    onSymbolChange,
    t,
  } = props;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
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
            setIsChartFullscreen={setIsChartFullscreen}
            chartContainerRef={chartContainerRef}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
            selectedRowIndex={selectedRowIndex}
            hoveredRowIndex={hoveredRowIndex}
            setHoveredRowIndex={setHoveredRowIndex}
            setSelectedRowIndex={setSelectedRowIndex}
            avgPrice={avgPrice}
            weightedAvgPrice={weightedAvgPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            variance={variance}
            validPrices={validPrices}
            lastStats={lastStats}
            historyMinMax={historyMinMax}
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
            getConsistencyRating={getConsistencyRating}
            calculateChangePercent={calculateChangePercent}
            t={t}
          />
        );
      case 'analysis':
        return (
          <AnalysisTab
            priceData={priceData}
            isLoading={isLoading}
            selectedOracles={selectedOracles}
            selectedPerformanceOracle={selectedPerformanceOracle}
            setSelectedPerformanceOracle={setSelectedPerformanceOracle}
            useAccessibleColors={useAccessibleColors}
            heatmapData={heatmapData}
            boxPlotData={boxPlotData}
            volatilityData={volatilityData}
            correlationData={correlationData}
            performanceData={performanceData}
            maData={maData}
            qualityTrendData={qualityTrendData}
            getOracleLatencyData={getOracleLatencyData}
            t={t}
          />
        );
      case 'chains':
        return <ChainsTab t={t} />;
      case 'history':
        return (
          <HistoryTab
            selectedSymbol={selectedSymbol}
            selectedOracles={selectedOracles}
            priceData={priceData}
            currentStats={currentStats}
            selectedSnapshot={selectedSnapshot}
            setSelectedSnapshot={setSelectedSnapshot}
            showComparison={showComparison}
            setShowComparison={setShowComparison}
            handleSaveSnapshot={handleSaveSnapshot}
            handleSelectSnapshot={handleSelectSnapshot}
            t={t}
          />
        );
      default:
        return (
          <OverviewTab
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
            setIsChartFullscreen={setIsChartFullscreen}
            chartContainerRef={chartContainerRef}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
            selectedRowIndex={selectedRowIndex}
            hoveredRowIndex={hoveredRowIndex}
            setHoveredRowIndex={setHoveredRowIndex}
            setSelectedRowIndex={setSelectedRowIndex}
            avgPrice={avgPrice}
            weightedAvgPrice={weightedAvgPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            variance={variance}
            validPrices={validPrices}
            lastStats={lastStats}
            historyMinMax={historyMinMax}
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
            getConsistencyRating={getConsistencyRating}
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
            deviationFilter={deviationFilter}
            onDeviationFilterChange={onDeviationFilterChange}
            useAccessibleColors={useAccessibleColors}
            onAccessibleColorsChange={onAccessibleColorsChange}
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
