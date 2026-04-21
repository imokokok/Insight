'use client';

import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { Blockchain } from '@/types/oracle';

import { type ChainStats } from '../constants';
import { useChartData } from '../hooks/useChartData';
import { useStatistics } from '../hooks/useStatistics';
import { useCurrentClient, useFilteredChains } from '../useCrossChainData';
import { chainNames, getConsistencyRating, formatPrice } from '../utils';

import { BenchmarkComparisonSection } from './BenchmarkComparisonSection';
import { CompactStatsGrid } from './CompactStatsGrid';
import { DataSourceSection } from './DataSourceSection';
import { PriceComparisonTable } from './PriceComparisonTable';
import { HeatmapDetailView } from './PriceSpreadHeatmap';

export function OverviewTab() {
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const lastUpdated = useCrossChainDataStore((s) => s.lastUpdated);
  const fetchData = useCrossChainDataStore((s) => s.fetchData);
  const loading = useCrossChainDataStore((s) => s.loading);

  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);

  const filteredChains = useFilteredChains();
  const currentClient = useCurrentClient();

  const statistics = useStatistics({
    currentPrices,
    filteredChains,
    currentClient,
  });

  const chart = useChartData({
    currentPrices,
    filteredChains,
    selectedBaseChain,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
  });

  const {
    avgPrice,
    maxPrice,
    minPrice,
    priceRange,
    medianPrice,
    iqrValue,
    standardDeviation,
    standardDeviationPercent,
    coefficientOfVariation,
    skewness,
    kurtosis,
    confidenceInterval95,
  } = statistics;

  const { priceDifferences } = chart;

  const statsData: ChainStats[] = [
    {
      label: 'Average Price',
      value: avgPrice > 0 ? formatPrice(avgPrice) : '-',
      trend: null,
      tooltip: 'Average price across all chains',
    },
    {
      label: 'Median Price',
      value: medianPrice > 0 ? formatPrice(medianPrice) : '-',
      trend: null,
      tooltip: 'Median price across all chains',
    },
    {
      label: 'Highest Price',
      value: maxPrice > 0 ? formatPrice(maxPrice) : '-',
      trend: null,
      subValue: minPrice > 0 ? `Minimum: ${formatPrice(minPrice)}` : null,
      tooltip: 'Highest and lowest prices',
    },
    {
      label: 'Price Range',
      value: priceRange > 0 ? formatPrice(priceRange) : '-',
      trend: null,
      tooltip: 'Difference between highest and lowest price',
    },
    {
      label: 'Standard Deviation',
      value: standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-',
      trend: null,
      subValue: standardDeviation > 0 ? formatPrice(standardDeviation) : null,
      tooltip: 'Measure of price variation',
    },
    {
      label: 'IQR',
      value: iqrValue > 0 ? formatPrice(iqrValue) : '-',
      trend: null,
      tooltip: 'Interquartile range',
    },
    {
      label: 'Skewness',
      value: skewness !== null && skewness !== undefined ? skewness.toFixed(4) : '-',
      trend: null,
      tooltip: 'Measure of asymmetry in price distribution',
    },
    {
      label: 'Kurtosis',
      value: kurtosis !== null && kurtosis !== undefined ? kurtosis.toFixed(4) : '-',
      trend: null,
      tooltip: 'Measure of tailedness in price distribution',
    },
    {
      label: '95% Confidence Interval',
      value:
        confidenceInterval95.lower > 0
          ? `${formatPrice(confidenceInterval95.lower)} - ${formatPrice(confidenceInterval95.upper)}`
          : '-',
      trend: null,
      tooltip: '95% confidence interval for the mean',
    },
    {
      label: 'Coefficient of Variation',
      value: coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(4)}%` : '-',
      trend: null,
      tooltip: 'Relative measure of dispersion',
    },
    {
      label: 'Consistency Rating',
      value: standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : '-',
      trend: null,
      tooltip: 'Overall consistency rating',
    },
  ];

  return (
    <>
      <CompactStatsGrid statsData={statsData} />

      {currentPrices.length === 0 && !loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No price data available</p>
          <p className="text-xs text-gray-400 mt-1">
            Select a provider and symbol to view cross-chain price comparison
          </p>
        </div>
      ) : (
        <>
          <DataSourceSection
            dataPoints={currentPrices.map((p) => ({
              chain: p.chain || Blockchain.ETHEREUM,
              price: p.price,
              timestamp: p.timestamp,
              source: p.source,
              confidence: p.confidence,
              provider: selectedProvider,
            }))}
            lastUpdated={lastUpdated}
            onRefresh={() => fetchData()}
            isLoading={loading}
          />

          {currentPrices.length > 0 && (
            <BenchmarkComparisonSection
              chainPrices={currentPrices.map((p) => ({
                chain: p.chain || Blockchain.ETHEREUM,
                price: p.price,
                timestamp: p.timestamp,
              }))}
              loading={loading}
            />
          )}

          <div id="heatmap">
            <HeatmapDetailView />
          </div>

          <div id="table">
            <PriceComparisonTable />
          </div>
        </>
      )}
    </>
  );
}
