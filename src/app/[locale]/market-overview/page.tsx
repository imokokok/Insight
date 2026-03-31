'use client';

import AnomalyModal from './components/AnomalyModal';
import AssetsTable from './components/AssetsTable';
import ChartContainer from './components/ChartContainer';
import { ChartErrorBoundary } from './components/ChartErrorBoundary';
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
    filter,
    filteredAssets,
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
            <ChartErrorBoundary componentName="MarketStats">
              <MarketStats
                marketStats={marketStats}
                totalTVS={totalTVS}
                totalChains={totalChains}
                totalProtocols={totalProtocols}
              />
            </ChartErrorBoundary>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6 h-full">
                  <ChartErrorBoundary componentName="ChartContainer">
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
                      protocolDetails={protocolDetails}
                      assetCategories={assetCategories}
                      comparisonData={comparisonData}
                      benchmarkData={benchmarkData}
                      correlationData={correlationData}
                    />
                  </ChartErrorBoundary>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
                <MarketSidebar
                  oracleData={sortedOracleData.map((o) => ({
                    name: o.name,
                    share: o.share,
                    change24h: o.change24h,
                    chains: o.chains,
                    color: o.color,
                  }))}
                  loading={isLoading}
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
              <ChartErrorBoundary componentName="AssetsTable">
                <AssetsTable
                  assets={filteredAssets}
                  filters={filter.filters}
                  onSearchChange={filter.setSearchQuery}
                  onOracleFilterChange={filter.setOracleFilter}
                  onChangeMagnitudeChange={filter.setChangeMagnitude}
                  onClearFilters={filter.clearFilters}
                  hasActiveFilters={filter.hasActiveFilters}
                  totalAssetsCount={assets.length}
                />
              </ChartErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      <AnomalyModal
        isOpen={!!selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        data={
          selectedAnomaly
            ? [
                {
                  id: selectedAnomaly.dataKey,
                  type: 'price_spike',
                  level: 'medium',
                  title: 'Price Anomaly',
                  description: `Price change detected for ${selectedAnomaly.dataKey}`,
                  timestamp: new Date(selectedAnomaly.date).getTime(),
                  asset: selectedAnomaly.dataKey,
                  value: selectedAnomaly.value,
                  expectedValue: selectedAnomaly.prevValue,
                  deviation: selectedAnomaly.changeRate,
                  duration: 0,
                  acknowledged: false,
                },
              ]
            : []
        }
      />
    </div>
  );
}
