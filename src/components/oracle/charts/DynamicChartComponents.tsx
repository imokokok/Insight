'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui';
import type { ComponentType } from 'react';

// Dynamic Chart Components - Code Splitting for Heavy Components

const createDynamicChart = <T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> } | { [key: string]: ComponentType<T> }>,
  height: number = 400,
  variant: string = 'default'
): ComponentType<T> => {
  return dynamic(importFn, {
    ssr: false,
    loading: ({ error }) => {
      if (error) {
        return (
          <div className="flex items-center justify-center h-[400px] text-red-500">
            Failed to load chart component
          </div>
        );
      }
      return <ChartSkeleton height={height} variant={variant} />;
    },
  }) as ComponentType<T>;
};

// Core dynamic chart components
export const DynamicPriceChart = createDynamicChart(
  () => import('./PriceChart').then((mod) => ({ default: mod.PriceChart })),
  600,
  'price'
);

export const DynamicPriceVolatilityChart = createDynamicChart(
  () => import('./PriceVolatilityChart').then((mod) => ({ default: mod.PriceVolatilityChart })),
  400,
  'volatility'
);

export const DynamicMovingAverageChart = createDynamicChart(
  () => import('./MovingAverageChart').then((mod) => ({ default: mod.MovingAverageChart })),
  400,
  'movingAverage'
);

export const DynamicCrossChainTrendChart = createDynamicChart(
  () => import('./CrossChainTrendChart').then((mod) => ({ default: mod.CrossChainTrendChart })),
  400,
  'crossChain'
);

export const DynamicGasFeeTrendChart = createDynamicChart(
  () => import('./GasFeeTrendChart').then((mod) => ({ default: mod.GasFeeTrendChart })),
  400,
  'gasFee'
);

export const DynamicLatencyTrendChart = createDynamicChart(
  () => import('./LatencyTrendChart').then((mod) => ({ default: mod.LatencyTrendChart })),
  400,
  'latency'
);

export const DynamicRequestTrendChart = createDynamicChart(
  () => import('./RequestTrendChart').then((mod) => ({ default: mod.RequestTrendChart })),
  400,
  'request'
);

export const DynamicConfidenceIntervalChart = createDynamicChart(
  () => import('./ConfidenceIntervalChart').then((mod) => ({ default: mod.ConfidenceIntervalChart })),
  400,
  'confidence'
);

export const DynamicCDFChart = createDynamicChart(
  () => import('./CDFChart').then((mod) => ({ default: mod.CDFChart })),
  400,
  'cdf'
);

export const DynamicStakingDistributionChart = createDynamicChart(
  () => import('./StakingDistributionChart').then((mod) => ({ default: mod.StakingDistributionChart })),
  400,
  'staking'
);

export const DynamicPriceDeviationHistoryChart = createDynamicChart(
  () => import('./PriceDeviationHistoryChart').then((mod) => ({ default: mod.PriceDeviationHistoryChart })),
  400,
  'deviation'
);

export const DynamicValidatorHistoryChart = createDynamicChart(
  () => import('./ValidatorHistoryChart').then((mod) => ({ default: mod.ValidatorHistoryChart })),
  400,
  'validator'
);

export const DynamicDataSourceTrend = createDynamicChart(
  () => import('./DataSourceTrend').then((mod) => ({ default: mod.DataSourceTrend })),
  400,
  'dataSource'
);

export const DynamicDataQualityTrend = createDynamicChart(
  () => import('./DataQualityTrend').then((mod) => ({ default: mod.DataQualityTrend })),
  400,
  'dataQuality'
);

export const DynamicPriceDistributionBoxPlot = createDynamicChart(
  () => import('./PriceDistributionBoxPlot').then((mod) => ({ default: mod.PriceDistributionBoxPlot })),
  400,
  'boxPlot'
);

export const DynamicPriceDeviationHeatmap = createDynamicChart(
  () => import('./PriceDeviationHeatmap').then((mod) => ({ default: mod.PriceDeviationHeatmap })),
  400,
  'heatmap'
);

export const DynamicPriceCorrelationMatrix = createDynamicChart(
  () => import('./PriceCorrelationMatrix').then((mod) => ({ default: mod.PriceCorrelationMatrix })),
  400,
  'correlation'
);

export const DynamicUpdateFrequencyHeatmap = createDynamicChart(
  () => import('./UpdateFrequencyHeatmap').then((mod) => ({ default: mod.UpdateFrequencyHeatmap })),
  400,
  'heatmap'
);

export const DynamicValidatorPerformanceHeatmap = createDynamicChart(
  () => import('./ValidatorPerformanceHeatmap').then((mod) => ({ default: mod.ValidatorPerformanceHeatmap })),
  400,
  'heatmap'
);

export const DynamicLatencyDistributionHistogram = createDynamicChart(
  () => import('./LatencyDistributionHistogram').then((mod) => ({ default: mod.LatencyDistributionHistogram })),
  400,
  'histogram'
);

export const DynamicValidatorGeographicMap = createDynamicChart(
  () => import('./ValidatorGeographicMap').then((mod) => ({ default: mod.ValidatorGeographicMap })),
  400,
  'map'
);

export const DynamicCrossChainPriceComparison = createDynamicChart(
  () => import('./CrossChainPriceComparison').then((mod) => ({ default: mod.CrossChainPriceComparison })),
  400,
  'comparison'
);

export const DynamicChainCoverageHeatmap = createDynamicChart(
  () => import('./ChainCoverageHeatmap').then((mod) => ({ default: mod.ChainCoverageHeatmap })),
  400,
  'heatmap'
);

export const DynamicConcentrationRisk = createDynamicChart(
  () => import('./ConcentrationRisk').then((mod) => ({ default: mod.ConcentrationRisk })),
  400,
  'risk'
);

export const DynamicCrossChainRisk = createDynamicChart(
  () => import('./CrossChainRisk').then((mod) => ({ default: mod.CrossChainRisk })),
  400,
  'risk'
);

export const DynamicPriceDeviationRisk = createDynamicChart(
  () => import('./PriceDeviationRisk').then((mod) => ({ default: mod.PriceDeviationRisk })),
  400,
  'risk'
);

export const DynamicCorrelationAnalysis = createDynamicChart(
  () => import('./CorrelationAnalysis').then((mod) => ({ default: mod.CorrelationAnalysis })),
  400,
  'correlation'
);

export const DynamicChainComparison = createDynamicChart(
  () => import('./ChainComparison').then((mod) => ({ default: mod.ChainComparison })),
  400,
  'comparison'
);

export const DynamicValidatorComparison = createDynamicChart(
  () => import('./ValidatorComparison').then((mod) => ({ default: mod.ValidatorComparison })),
  400,
  'comparison'
);

export const DynamicMultiValidatorComparison = createDynamicChart(
  () => import('./MultiValidatorComparison').then((mod) => ({ default: mod.MultiValidatorComparison })),
  400,
  'comparison'
);

export const DynamicCrossOracleComparison = createDynamicChart(
  () => import('./CrossOracleComparison').then((mod) => ({ default: mod.CrossOracleComparison })),
  600,
  'comparison'
);

export const DynamicInteractivePriceChart = createDynamicChart(
  () => import('./InteractivePriceChart').then((mod) => ({ default: mod.InteractivePriceChart })),
  600,
  'price'
);

export const DynamicKPIDashboard = createDynamicChart(
  () => import('./KPIDashboard').then((mod) => ({ default: mod.KPIDashboard })),
  400,
  'kpi'
);

export const DynamicLatencyPrediction = createDynamicChart(
  () => import('./LatencyPrediction').then((mod) => ({ default: mod.LatencyPrediction })),
  400,
  'prediction'
);

export const DynamicLatencyHistogram = createDynamicChart(
  () => import('./LatencyHistogram').then((mod) => ({ default: mod.LatencyHistogram })),
  400,
  'histogram'
);

export const DynamicPriceStream = createDynamicChart(
  () => import('./PriceStream').then((mod) => ({ default: mod.PriceStream })),
  400,
  'stream'
);

// Type for dynamic chart components
export type DynamicChartComponent =
  | typeof DynamicPriceChart
  | typeof DynamicPriceVolatilityChart
  | typeof DynamicMovingAverageChart
  | typeof DynamicCrossChainTrendChart
  | typeof DynamicGasFeeTrendChart
  | typeof DynamicLatencyTrendChart
  | typeof DynamicRequestTrendChart
  | typeof DynamicConfidenceIntervalChart
  | typeof DynamicCDFChart
  | typeof DynamicStakingDistributionChart
  | typeof DynamicPriceDeviationHistoryChart
  | typeof DynamicValidatorHistoryChart
  | typeof DynamicDataSourceTrend
  | typeof DynamicDataQualityTrend
  | typeof DynamicPriceDistributionBoxPlot
  | typeof DynamicPriceDeviationHeatmap
  | typeof DynamicPriceCorrelationMatrix
  | typeof DynamicUpdateFrequencyHeatmap
  | typeof DynamicValidatorPerformanceHeatmap
  | typeof DynamicLatencyDistributionHistogram
  | typeof DynamicValidatorGeographicMap
  | typeof DynamicCrossChainPriceComparison
  | typeof DynamicChainCoverageHeatmap
  | typeof DynamicConcentrationRisk
  | typeof DynamicCrossChainRisk
  | typeof DynamicPriceDeviationRisk
  | typeof DynamicCorrelationAnalysis
  | typeof DynamicChainComparison
  | typeof DynamicValidatorComparison
  | typeof DynamicMultiValidatorComparison
  | typeof DynamicCrossOracleComparison
  | typeof DynamicInteractivePriceChart
  | typeof DynamicKPIDashboard
  | typeof DynamicLatencyPrediction
  | typeof DynamicLatencyHistogram
  | typeof DynamicPriceStream;

// Preload utilities
export const preloadChart = (chartName: string): void => {
  // This function can be used to preload specific charts
  console.log(`Preloading chart: ${chartName}`);
};

export const preloadCharts = (chartNames: string[]): void => {
  // This function can be used to preload multiple charts
  chartNames.forEach((name) => preloadChart(name));
};
