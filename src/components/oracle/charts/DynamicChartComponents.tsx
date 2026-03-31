'use client';

import dynamic from 'next/dynamic';

import { ChartSkeleton } from '@/components/ui';

// Dynamic Chart Components - Code Splitting for Heavy Components

const createDynamicChart = (
  importFn: () => Promise<unknown>,
  height: number = 400,
  variant: 'price' | 'line' | 'area' | 'bar' = 'line'
) => {
  return dynamic(importFn as () => Promise<{ default: React.ComponentType<unknown> }>, {
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
  });
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
  'line'
);

export const DynamicMovingAverageChart = createDynamicChart(
  () => import('./MovingAverageChart').then((mod) => ({ default: mod.MovingAverageChart })),
  400,
  'line'
);

export const DynamicCrossChainTrendChart = createDynamicChart(
  () => import('./CrossChainTrendChart').then((mod) => ({ default: mod.CrossChainTrendChart })),
  400,
  'line'
);

export const DynamicGasFeeTrendChart = createDynamicChart(
  () => import('./GasFeeTrendChart').then((mod) => ({ default: mod.GasFeeTrendChart })),
  400,
  'line'
);

export const DynamicLatencyTrendChart = createDynamicChart(
  () => import('./LatencyTrendChart').then((mod) => ({ default: mod.LatencyTrendChart })),
  400,
  'line'
);

export const DynamicRequestTrendChart = createDynamicChart(
  () => import('./RequestTrendChart').then((mod) => ({ default: mod.RequestTrendChart })),
  400,
  'line'
);

export const DynamicConfidenceIntervalChart = createDynamicChart(
  () =>
    import('./ConfidenceIntervalChart').then((mod) => ({ default: mod.ConfidenceIntervalChart })),
  400,
  'line'
);

export const DynamicCDFChart = createDynamicChart(
  () => import('./CDFChart').then((mod) => ({ default: mod.CDFChart })),
  400,
  'line'
);

export const DynamicStakingDistributionChart = createDynamicChart(
  () =>
    import('./StakingDistributionChart').then((mod) => ({ default: mod.StakingDistributionChart })),
  400,
  'line'
);

export const DynamicPriceDeviationHistoryChart = createDynamicChart(
  () =>
    import('./PriceDeviationHistoryChart').then((mod) => ({
      default: mod.PriceDeviationHistoryChart,
    })),
  400,
  'line'
);

export const DynamicValidatorHistoryChart = createDynamicChart(
  () => import('./ValidatorHistoryChart').then((mod) => ({ default: mod.ValidatorHistoryChart })),
  400,
  'line'
);

export const DynamicDataSourceTrend = createDynamicChart(
  () => import('./DataSourceTrend').then((mod) => ({ default: mod.DataSourceTrend })),
  400,
  'line'
);

export const DynamicDataQualityTrend = createDynamicChart(
  () => import('./DataQualityTrend').then((mod) => ({ default: mod.DataQualityTrend })),
  400,
  'line'
);

export const DynamicPriceDistributionBoxPlot = createDynamicChart(
  () =>
    import('./PriceDistributionBoxPlot').then((mod) => ({ default: mod.PriceDistributionBoxPlot })),
  400,
  'line'
);

export const DynamicPriceDeviationHeatmap = createDynamicChart(
  () => import('./PriceDeviationHeatmap').then((mod) => ({ default: mod.PriceDeviationHeatmap })),
  400,
  'line'
);

export const DynamicPriceCorrelationMatrix = createDynamicChart(
  () => import('./PriceCorrelationMatrix').then((mod) => ({ default: mod.PriceCorrelationMatrix })),
  400,
  'line'
);

export const DynamicUpdateFrequencyHeatmap = createDynamicChart(
  () => import('./UpdateFrequencyHeatmap').then((mod) => ({ default: mod.UpdateFrequencyHeatmap })),
  400,
  'line'
);

export const DynamicValidatorPerformanceHeatmap = createDynamicChart(
  () =>
    import('./ValidatorPerformanceHeatmap').then((mod) => ({
      default: mod.ValidatorPerformanceHeatmap,
    })),
  400,
  'line'
);

export const DynamicLatencyDistributionHistogram = createDynamicChart(
  () =>
    import('./LatencyDistributionHistogram').then((mod) => ({
      default: mod.LatencyDistributionHistogram,
    })),
  400,
  'line'
);

export const DynamicValidatorGeographicMap = createDynamicChart(
  () => import('./ValidatorGeographicMap').then((mod) => ({ default: mod.ValidatorGeographicMap })),
  400,
  'line'
);

export const DynamicCrossChainPriceComparison = createDynamicChart(
  () =>
    import('./CrossChainPriceComparison').then((mod) => ({
      default: mod.CrossChainPriceComparison,
    })),
  400,
  'line'
);

export const DynamicChainCoverageHeatmap = createDynamicChart(
  () => import('./ChainCoverageHeatmap').then((mod) => ({ default: mod.ChainCoverageHeatmap })),
  400,
  'line'
);

export const DynamicConcentrationRisk = createDynamicChart(
  () => import('./ConcentrationRisk').then((mod) => ({ default: mod.ConcentrationRisk })),
  400,
  'line'
);

export const DynamicCrossChainRisk = createDynamicChart(
  () => import('./CrossChainRisk').then((mod) => ({ default: mod.CrossChainRisk })),
  400,
  'line'
);

export const DynamicPriceDeviationRisk = createDynamicChart(
  () => import('./PriceDeviationRisk').then((mod) => ({ default: mod.PriceDeviationRisk })),
  400,
  'line'
);

export const DynamicCorrelationAnalysis = createDynamicChart(
  () => import('./CorrelationAnalysis').then((mod) => ({ default: mod.CorrelationAnalysis })),
  400,
  'line'
);

export const DynamicChainComparison = createDynamicChart(
  () => import('./ChainComparison').then((mod) => ({ default: mod.ChainComparison })),
  400,
  'line'
);

export const DynamicValidatorComparison = createDynamicChart(
  () => import('./ValidatorComparison').then((mod) => ({ default: mod.ValidatorComparison })),
  400,
  'line'
);

export const DynamicMultiValidatorComparison = createDynamicChart(
  () =>
    import('./MultiValidatorComparison').then((mod) => ({ default: mod.MultiValidatorComparison })),
  400,
  'line'
);

export const DynamicCrossOracleComparison = createDynamicChart(
  () => import('./CrossOracleComparison').then((mod) => ({ default: mod.CrossOracleComparison })),
  600,
  'line'
);

export const DynamicInteractivePriceChart = createDynamicChart(
  () => import('./InteractivePriceChart').then((mod) => ({ default: mod.InteractivePriceChart })),
  600,
  'price'
);

export const DynamicLatencyPrediction = createDynamicChart(
  () => import('./LatencyPrediction').then((mod) => ({ default: mod.LatencyPrediction })),
  400,
  'line'
);

export const DynamicLatencyHistogram = createDynamicChart(
  () => import('./LatencyHistogram').then((mod) => ({ default: mod.LatencyHistogram })),
  400,
  'line'
);

export const DynamicPriceStream = createDynamicChart(
  () => import('./PriceStream').then((mod) => ({ default: mod.PriceStream })),
  400,
  'line'
);
