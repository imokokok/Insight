'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { SectionErrorBoundary } from '@/components/error-boundary';
import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';
import { type Blockchain } from '@/types/oracle';

import { type useCrossChainData } from '../useCrossChainData';

import { InteractivePriceChart } from './InteractivePriceChart';
import { StandardBoxPlot } from './StandardBoxPlot';

interface ChartsTabProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function ChartsTab({ data }: ChartsTabProps) {
  const {
    filteredChains,
    hiddenLines,
    setHiddenLines,
    focusedChain,
    setFocusedChain,
    chartData,
    chartDataWithMA,
    scatterData,
    avgPrice,
    medianPrice,
    standardDeviation,
    priceDistributionData,
    boxPlotData,
    meanBinIndex,
    medianBinIndex,
  } = data;

  const handleLegendClick = (e: unknown) => {
    const dataKey = (e as { dataKey?: string | number })?.dataKey;
    if (typeof dataKey === 'string') {
      if (hiddenLines.includes(dataKey)) {
        setHiddenLines(hiddenLines.filter((l) => l !== dataKey));
      } else {
        setHiddenLines([...hiddenLines, dataKey]);
      }
    }
  };

  const handleLegendDoubleClick = (chain: Blockchain) => {
    if (focusedChain === chain) {
      setFocusedChain(null);
      setHiddenLines([]);
    } else {
      setFocusedChain(chain);
      const newHidden = filteredChains.filter((c) => c !== chain);
      setHiddenLines(newHidden);
    }
  };

  return (
    <>
      <div
        id="distribution"
        className="mb-8 pb-8 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
          Price Distribution Analysis
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-medium mb-3" style={{ color: baseColors.gray[700] }}>
              Price Distribution Histogram
            </h4>
            <div className="h-64 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    stroke={chartColors.recharts.axis}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    width={40}
                    stroke={chartColors.recharts.axis}
                  />
                  <RechartsTooltip formatter={(value) => [value, 'Frequency']} />
                  {meanBinIndex >= 0 && priceDistributionData[meanBinIndex] && (
                    <ReferenceLine
                      x={priceDistributionData[meanBinIndex].range}
                      stroke={chartColors.recharts.primary}
                      strokeDasharray="5 5"
                    />
                  )}
                  {medianBinIndex >= 0 && priceDistributionData[medianBinIndex] && (
                    <ReferenceLine
                      x={priceDistributionData[medianBinIndex].range}
                      stroke={chartColors.recharts.success}
                      strokeDasharray="5 5"
                    />
                  )}
                  <Bar dataKey="count" fill={chartColors.recharts.indigo} radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="py-3">
                <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                  Median Line
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ color: semanticColors.success.main }}
                >
                  ${medianPrice.toFixed(4)}
                </div>
              </div>
              <div className="py-3">
                <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                  Mean Line
                </div>
                <div className="text-lg font-semibold" style={{ color: baseColors.primary[500] }}>
                  ${avgPrice.toFixed(4)}
                </div>
              </div>
              <div className="py-3">
                <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                  Standard Deviation
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ color: chartColors.recharts.purple }}
                >
                  ${standardDeviation.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium mb-3" style={{ color: baseColors.gray[700] }}>
              Chain Price Box Plot
            </h4>
            <div className="h-64 py-4">
              <StandardBoxPlot data={boxPlotData} />
            </div>
          </div>
        </div>
      </div>

      <div id="chart">
        <SectionErrorBoundary componentName="Interactive Price Chart">
          <InteractivePriceChart
            chartData={chartData}
            chartDataWithMA={chartDataWithMA}
            filteredChains={filteredChains}
            hiddenLines={hiddenLines}
            scatterData={scatterData}
            avgPrice={avgPrice}
            medianPrice={medianPrice}
            onLegendClick={handleLegendClick}
            onLegendDoubleClick={handleLegendDoubleClick}
          />
        </SectionErrorBoundary>
      </div>
    </>
  );
}
