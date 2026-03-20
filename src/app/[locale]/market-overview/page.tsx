'use client';

import { useMarketPage } from './useMarketPage';
import MarketHeader from './components/MarketHeader';
import MarketStats from './components/MarketStats';
import ChartContainer from './components/ChartContainer';
import MarketSidebar from './components/MarketSidebar';
import AssetsTable from './components/AssetsTable';
import AnomalyModal from './components/AnomalyModal';

export default function MarketOverviewPage() {
  const {
    chartContainerRef,
    zoomRange,
    setZoomRange,
    anomalyThreshold,
    setAnomalyThreshold,
    selectedAnomaly,
    setSelectedAnomaly,
    linkedOracle,
    setLinkedOracle,
    comparisonMode,
    setComparisonMode,
    trendComparisonData,
    setTrendComparisonData,
    showConfidenceInterval,
    setShowConfidenceInterval,
    oracleData,
    assets,
    trendData,
    marketStats,
    chainBreakdown,
    protocolDetails,
    assetCategories,
    comparisonData,
    benchmarkData,
    correlationData,
    isLoading,
    isLoadingEnhanced,
    isLoadingComparison,
    lastUpdated,
    selectedTimeRange,
    setSelectedTimeRange,
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    hoveredItem,
    setHoveredItem,
    selectedItem,
    setSelectedItem,
    refreshInterval,
    setRefreshInterval,
    refreshStatus,
    fetchData,
    sortedOracleData,
    totalTVS,
    totalChains,
    totalProtocols,
    wsStatus,
    wsReconnect,
    getChartTitle,
  } = useMarketPage();

  return (
    <div className="min-h-screen bg-insight rounded-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MarketHeader
          loading={isLoading}
          oracleData={oracleData}
          assets={assets}
          chartContainerRef={chartContainerRef}
          activeChart={activeChart}
          getChartTitle={getChartTitle}
          lastUpdated={lastUpdated}
          refreshStatus={refreshStatus}
          fetchData={fetchData}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          wsStatus={wsStatus}
          wsReconnect={wsReconnect}
        />

        <div className="bg-white border border-gray-200 p-6 transition-all duration-200 hover:border-gray-300">
          <MarketStats
            marketStats={marketStats}
            totalTVS={totalTVS}
            totalChains={totalChains}
            totalProtocols={totalProtocols}
          />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 p-6 transition-all duration-200 hover:border-gray-300">
                <ChartContainer
                  chartContainerRef={chartContainerRef}
                  activeChart={activeChart}
                  setActiveChart={setActiveChart}
                  viewType={viewType}
                  setViewType={setViewType}
                  selectedTimeRange={selectedTimeRange}
                  setSelectedTimeRange={setSelectedTimeRange}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                  linkedOracle={linkedOracle}
                  setLinkedOracle={setLinkedOracle}
                  zoomRange={zoomRange}
                  setZoomRange={setZoomRange}
                  anomalyThreshold={anomalyThreshold}
                  setAnomalyThreshold={setAnomalyThreshold}
                  selectedAnomaly={selectedAnomaly}
                  setSelectedAnomaly={setSelectedAnomaly}
                  comparisonMode={comparisonMode}
                  setComparisonMode={setComparisonMode}
                  trendComparisonData={trendComparisonData}
                  setTrendComparisonData={setTrendComparisonData}
                  showConfidenceInterval={showConfidenceInterval}
                  setShowConfidenceInterval={setShowConfidenceInterval}
                  getChartTitle={getChartTitle}
                  loading={isLoading}
                  loadingEnhanced={isLoadingEnhanced}
                  loadingComparison={isLoadingComparison}
                  sortedOracleData={sortedOracleData}
                  trendData={trendData}
                  chainBreakdown={chainBreakdown}
                  protocolDetails={protocolDetails}
                  assetCategories={assetCategories}
                  comparisonData={comparisonData}
                  benchmarkData={benchmarkData}
                  correlationData={correlationData}
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 transition-all duration-200 hover:border-gray-300">
              <MarketSidebar
                selectedTimeRange={selectedTimeRange}
                lastUpdated={lastUpdated}
                sortedOracleData={sortedOracleData}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                marketStats={marketStats}
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-6 transition-all duration-200 hover:border-gray-300">
            <AssetsTable assets={assets} />
          </div>
        </div>
      </div>

      <AnomalyModal selectedAnomaly={selectedAnomaly} onClose={() => setSelectedAnomaly(null)} />
    </div>
  );
}
