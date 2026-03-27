'use client';

import AnomalyModal from './components/AnomalyModal';
import AssetsTable from './components/AssetsTable';
import ChartContainer from './components/ChartContainer';
import MarketHeader from './components/MarketHeader';
import MarketSidebar from './components/MarketSidebar';
import MarketStats from './components/MarketStats';
import { useMarketPage } from './useMarketPage';

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
    <div className="min-h-screen bg-insight">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
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

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
            <MarketStats
              marketStats={marketStats}
              totalTVS={totalTVS}
              totalChains={totalChains}
              totalProtocols={totalProtocols}
            />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6 h-full">
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

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
                <MarketSidebar
                  selectedTimeRange={selectedTimeRange}
                  lastUpdated={lastUpdated}
                  sortedOracleData={sortedOracleData}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                  marketStats={marketStats}
                  trendData={trendData}
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
              <AssetsTable assets={assets} />
            </div>
          </div>
        </div>
      </div>

      <AnomalyModal selectedAnomaly={selectedAnomaly} onClose={() => setSelectedAnomaly(null)} />
    </div>
  );
}
