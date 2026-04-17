'use client';

import { baseColors, semanticColors } from '@/lib/config/colors';
import { Blockchain } from '@/types/oracle';

import { type ChainStats } from '../constants';
import { type useCrossChainData } from '../useCrossChainData';
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

interface OverviewTabProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const {
    currentPrices,
    lastUpdated,
    fetchData,
    loading,
    selectedProvider,
    filteredChains,
    chainVolatility,
    dataIntegrity,
    priceJumpFrequency,
    priceDifferences,
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
    totalDataPoints,
    prevStats,
  } = data;

  const statsData: ChainStats[] = [
    {
      label: 'crossChain.averagePrice',
      value: avgPrice > 0 ? formatPrice(avgPrice) : '-',
      trend: calculateChangePercent(avgPrice, prevStats?.avgPrice || 0),
      tooltip: 'crossChain.tooltip.averagePrice',
    },
    {
      label: 'crossChain.medianPrice',
      value: medianPrice > 0 ? formatPrice(medianPrice) : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.medianPrice',
    },
    {
      label: 'crossChain.highestPrice',
      value: maxPrice > 0 ? formatPrice(maxPrice) : '-',
      trend: calculateChangePercent(maxPrice, prevStats?.maxPrice || 0),
      subValue: minPrice > 0 ? `Min: ${formatPrice(minPrice)}` : null,
      tooltip: 'crossChain.tooltip.highestPrice',
    },
    {
      label: 'crossChain.priceRange',
      value: priceRange > 0 ? formatPrice(priceRange) : '-',
      trend: calculateChangePercent(priceRange, prevStats?.priceRange || 0),
      tooltip: 'crossChain.tooltip.priceRange',
    },
    {
      label: 'crossChain.standardDeviation',
      value: standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-',
      trend: calculateChangePercent(
        standardDeviationPercent,
        prevStats?.standardDeviationPercent || 0
      ),
      subValue: standardDeviation > 0 ? formatPrice(standardDeviation) : null,
      tooltip: 'crossChain.tooltip.standardDeviation',
    },
    {
      label: 'crossChain.dataPoints',
      value: totalDataPoints.toString(),
      trend: null,
      tooltip: 'crossChain.tooltip.dataPoints',
    },
    {
      label: 'crossChain.iqr',
      value: iqrValue > 0 ? formatPrice(iqrValue) : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.iqr',
    },
    {
      label: 'crossChain.skewness',
      value: skewness !== 0 ? skewness.toFixed(4) : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.skewness',
    },
    {
      label: 'crossChain.kurtosis',
      value: kurtosis !== 0 ? kurtosis.toFixed(4) : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.kurtosis',
    },
    {
      label: 'crossChain.confidenceInterval95',
      value:
        confidenceInterval95.lower > 0
          ? `${formatPrice(confidenceInterval95.lower)} - ${formatPrice(confidenceInterval95.upper)}`
          : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.confidenceInterval95',
    },
    {
      label: 'crossChain.coefficientOfVariation',
      value: coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(4)}%` : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.coefficientOfVariation',
    },
    {
      label: 'crossChain.consistencyRating',
      value: standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : '-',
      trend: null,
      tooltip: 'crossChain.tooltip.consistencyRating',
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
        onRefresh={fetchData}
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
        <HeatmapDetailView data={data} />
      </div>

      <div id="table">
        <PriceComparisonTable data={data} />
      </div>

      <div
        id="stability"
        className="mb-8 pb-8 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
          {'crossChain.stabilityAnalysis'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {'crossChain.blockchain'}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {'crossChain.dataIntegrity'}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {'crossChain.absolutePriceDiff'}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium"
                  style={{ color: baseColors.gray[500] }}
                >
                  {'crossChain.priceJumpFrequency'}
                </th>
                <th
                  className="px-3 py-2.5 text-xs font-medium text-right"
                  style={{ color: baseColors.gray[500] }}
                >
                  {'crossChain.stabilityRating'}
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
