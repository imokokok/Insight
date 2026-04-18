'use client';

import { baseColors, semanticColors } from '@/lib/config/colors';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { Blockchain } from '@/types/oracle';

import { type ChainStats } from '../constants';
import { useChartData } from '../hooks/useChartData';
import { useStatistics } from '../hooks/useStatistics';
import { useCurrentClient, useFilteredChains } from '../useCrossChainData';
import {
  chainNames,
  chainColors,
  getIntegrityColor,
  getConsistencyRating,
  getStabilityRating,
  calculateChangePercent,
  formatPrice,
} from '../utils';

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
  const prevStats = useCrossChainDataStore((s) => s.prevStats);

  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const showMA = useCrossChainUIStore((s) => s.showMA);
  const maPeriod = useCrossChainUIStore((s) => s.maPeriod);
  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

  const filteredChains = useFilteredChains();
  const currentClient = useCurrentClient();
  const historicalPrices = useCrossChainDataStore((s) => s.historicalPrices);

  const statistics = useStatistics({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedTimeRange,
    currentClient,
    selectedBaseChain,
  });

  const chart = useChartData({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedBaseChain,
    selectedTimeRange,
    showMA,
    maPeriod,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
    thresholdConfig,
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
    chainVolatility,
    dataIntegrity,
  } = statistics;

  const { priceDifferences, priceJumpFrequency, totalDataPoints } = chart;

  const statsData: ChainStats[] = [
    {
      label: 'Average Price',
      value: avgPrice > 0 ? formatPrice(avgPrice) : '-',
      trend: calculateChangePercent(avgPrice, prevStats?.avgPrice || 0),
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
      trend: calculateChangePercent(maxPrice, prevStats?.maxPrice || 0),
      subValue: minPrice > 0 ? `Min: ${formatPrice(minPrice)}` : null,
      tooltip: 'Highest and lowest prices',
    },
    {
      label: 'Price Range',
      value: priceRange > 0 ? formatPrice(priceRange) : '-',
      trend: calculateChangePercent(priceRange, prevStats?.priceRange || 0),
      tooltip: 'Difference between highest and lowest price',
    },
    {
      label: 'Standard Deviation',
      value: standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-',
      trend: calculateChangePercent(
        standardDeviationPercent,
        prevStats?.standardDeviationPercent || 0
      ),
      subValue: standardDeviation > 0 ? formatPrice(standardDeviation) : null,
      tooltip: 'Measure of price variation',
    },
    {
      label: 'Data Points',
      value: totalDataPoints.toString(),
      trend: null,
      tooltip: 'Total number of data points',
    },
    {
      label: 'IQR',
      value: iqrValue > 0 ? formatPrice(iqrValue) : '-',
      trend: null,
      tooltip: 'Interquartile range',
    },
    {
      label: 'Skewness',
      value: skewness !== 0 ? skewness.toFixed(4) : '-',
      trend: null,
      tooltip: 'Measure of asymmetry in price distribution',
    },
    {
      label: 'Kurtosis',
      value: kurtosis !== 0 ? kurtosis.toFixed(4) : '-',
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

      <div
        id="stability"
        className="mb-8 pb-8 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
          Stability Analysis
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  Blockchain
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  Data Integrity
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  Absolute Price Diff
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  Price Jump Frequency
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium text-right"
                  style={{ color: baseColors.gray[500] }}
                >
                  Stability Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredChains.map((chain) => {
                const volatility = chainVolatility[chain] ?? 0;
                const stabilityRating = getStabilityRating(volatility);
                const integrity = dataIntegrity[chain] ?? 0;
                const jumpCount = priceJumpFrequency[chain] ?? 0;
                const priceDiff = priceDifferences.find((p) => p.chain === chain);
                const absoluteDiff = priceDiff?.diff ?? 0;
                return (
                  <tr
                    key={chain}
                    className="hover:bg-gray-50"
                    style={{
                      borderBottom: `1px solid ${baseColors.gray[100]}`,
                      backgroundColor: 'transparent',
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 mr-2"
                          style={{ backgroundColor: chainColors[chain] }}
                        />
                        <span className="text-sm font-medium">{chainNames[chain]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${integrity}%`,
                            backgroundColor: getIntegrityColor(integrity),
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{integrity.toFixed(1)}%</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`font-mono text-sm ${
                          Math.abs(absoluteDiff) > 1
                            ? 'font-semibold text-red-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {absoluteDiff > 0 ? '+' : ''}${absoluteDiff.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {jumpCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {jumpCount} jumps
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className="text-sm font-medium"
                        style={{
                          color:
                            stabilityRating === 'stable'
                              ? semanticColors.success.main
                              : stabilityRating === 'moderate'
                                ? semanticColors.warning.main
                                : semanticColors.danger.main,
                        }}
                      >
                        {volatility > 0 ? stabilityRating : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
