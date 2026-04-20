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
        onRefresh={() => fetchData?.()}
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
  );
}
