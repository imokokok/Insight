'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { ChartSkeleton, MiniChartSkeleton } from '@/components/ui';

// ============================================================================
// Loading Components
// ============================================================================

function createChartLoading(height: number = 400, variant: 'price' | 'mini' | 'heatmap' = 'price') {
  return function LoadingComponent({ error }: { error?: Error | null }) {
    if (error) {
      return (
        <div 
          className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50"
          style={{ height }}
        >
          <span className="text-sm text-red-600">Failed to load chart</span>
        </div>
      );
    }
    if (variant === 'mini') {
      return <MiniChartSkeleton />;
    }
    // 'heatmap' variant uses 'area' skeleton as fallback
    const skeletonVariant = variant === 'heatmap' ? 'area' : variant;
    return <ChartSkeleton height={height} showToolbar={variant === 'price'} variant={skeletonVariant} />;
  };
}

// ============================================================================
// Heavy Chart Components - Dynamically Imported
// ============================================================================

/**
 * Dynamic Price Chart with full features
 * Best for: Main price display, detailed analysis
 */
export const DynamicPriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart').then((mod) => mod.PriceChart),
  {
    ssr: false,
    loading: createChartLoading(600, 'price'),
  }
);

/**
 * Dynamic Price Volatility Chart
 * Best for: Volatility analysis, risk assessment
 */
export const DynamicPriceVolatilityChart = dynamic(
  () => import('@/components/oracle/charts/PriceVolatilityChart').then((mod) => mod.PriceVolatilityChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Moving Average Chart
 * Best for: Trend analysis, technical indicators
 */
export const DynamicMovingAverageChart = dynamic(
  () => import('@/components/oracle/charts/MovingAverageChart').then((mod) => mod.MovingAverageChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Cross Chain Trend Chart
 * Best for: Multi-chain price comparison
 */
export const DynamicCrossChainTrendChart = dynamic(
  () => import('@/components/oracle/charts/CrossChainTrendChart').then((mod) => mod.CrossChainTrendChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Gas Fee Trend Chart
 * Best for: Transaction cost analysis
 */
export const DynamicGasFeeTrendChart = dynamic(
  () => import('@/components/oracle/charts/GasFeeTrendChart').then((mod) => mod.GasFeeTrendChart),
  {
    ssr: false,
    loading: createChartLoading(300, 'mini'),
  }
);

/**
 * Dynamic Latency Trend Chart
 * Best for: Performance monitoring
 */
export const DynamicLatencyTrendChart = dynamic(
  () => import('@/components/oracle/charts/LatencyTrendChart').then((mod) => mod.LatencyTrendChart),
  {
    ssr: false,
    loading: createChartLoading(300, 'mini'),
  }
);

/**
 * Dynamic Request Trend Chart
 * Best for: Usage analytics
 */
export const DynamicRequestTrendChart = dynamic(
  () => import('@/components/oracle/charts/RequestTrendChart').then((mod) => mod.RequestTrendChart),
  {
    ssr: false,
    loading: createChartLoading(300, 'mini'),
  }
);

/**
 * Dynamic Confidence Interval Chart
 * Best for: Statistical analysis
 */
export const DynamicConfidenceIntervalChart = dynamic(
  () => import('@/components/oracle/charts/ConfidenceIntervalChart').then((mod) => mod.ConfidenceIntervalChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic CDF Chart (Cumulative Distribution Function)
 * Best for: Probability analysis
 */
export const DynamicCDFChart = dynamic(
  () => import('@/components/oracle/charts/CDFChart').then((mod) => mod.CDFChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Staking Distribution Chart
 * Best for: Validator stake visualization
 */
export const DynamicStakingDistributionChart = dynamic(
  () => import('@/components/oracle/charts/StakingDistributionChart').then((mod) => mod.StakingDistributionChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Price Deviation History Chart
 * Best for: Price deviation tracking
 */
export const DynamicPriceDeviationHistoryChart = dynamic(
  () => import('@/components/oracle/charts/PriceDeviationHistoryChart').then((mod) => mod.PriceDeviationHistoryChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Validator History Chart
 * Best for: Validator performance history
 */
export const DynamicValidatorHistoryChart = dynamic(
  () => import('@/components/oracle/charts/ValidatorHistoryChart').then((mod) => mod.ValidatorHistoryChart),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Data Source Trend Chart
 * Best for: Data source analytics
 */
export const DynamicDataSourceTrend = dynamic(
  () => import('@/components/oracle/charts/DataSourceTrend').then((mod) => mod.DataSourceTrend),
  {
    ssr: false,
    loading: createChartLoading(300, 'mini'),
  }
);

/**
 * Dynamic Data Quality Trend Chart
 * Best for: Data quality monitoring
 */
export const DynamicDataQualityTrend = dynamic(
  () => import('@/components/oracle/charts/DataQualityTrend').then((mod) => mod.DataQualityTrend),
  {
    ssr: false,
    loading: createChartLoading(300, 'mini'),
  }
);

/**
 * Dynamic Price Distribution Box Plot
 * Best for: Statistical distribution visualization
 */
export const DynamicPriceDistributionBoxPlot = dynamic(
  () => import('@/components/oracle/charts/PriceDistributionBoxPlot').then((mod) => mod.PriceDistributionBoxPlot),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Price Deviation Heatmap
 * Best for: Deviation pattern analysis
 */
export const DynamicPriceDeviationHeatmap = dynamic(
  () => import('@/components/oracle/charts/PriceDeviationHeatmap').then((mod) => mod.PriceDeviationHeatmap),
  {
    ssr: false,
    loading: createChartLoading(400, 'heatmap'),
  }
);

/**
 * Dynamic Price Correlation Matrix
 * Best for: Asset correlation analysis
 */
export const DynamicPriceCorrelationMatrix = dynamic(
  () => import('@/components/oracle/charts/PriceCorrelationMatrix').then((mod) => mod.PriceCorrelationMatrix),
  {
    ssr: false,
    loading: createChartLoading(400, 'heatmap'),
  }
);

/**
 * Dynamic Update Frequency Heatmap
 * Best for: Update pattern analysis
 */
export const DynamicUpdateFrequencyHeatmap = dynamic(
  () => import('@/components/oracle/charts/UpdateFrequencyHeatmap').then((mod) => mod.UpdateFrequencyHeatmap),
  {
    ssr: false,
    loading: createChartLoading(400, 'heatmap'),
  }
);

/**
 * Dynamic Validator Performance Heatmap
 * Best for: Validator comparison
 */
export const DynamicValidatorPerformanceHeatmap = dynamic(
  () => import('@/components/oracle/charts/ValidatorPerformanceHeatmap').then((mod) => mod.ValidatorPerformanceHeatmap),
  {
    ssr: false,
    loading: createChartLoading(400, 'heatmap'),
  }
);

/**
 * Dynamic Latency Distribution Histogram
 * Best for: Latency distribution analysis
 */
export const DynamicLatencyDistributionHistogram = dynamic(
  () => import('@/components/oracle/charts/LatencyDistributionHistogram').then((mod) => mod.LatencyDistributionHistogram),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Validator Geographic Map
 * Best for: Geographic distribution visualization
 */
export const DynamicValidatorGeographicMap = dynamic(
  () => import('@/components/oracle/charts/ValidatorGeographicMap').then((mod) => mod.ValidatorGeographicMap),
  {
    ssr: false,
    loading: createChartLoading(500, 'price'),
  }
);

/**
 * Dynamic Cross Chain Price Comparison
 * Best for: Cross-chain price analysis
 */
export const DynamicCrossChainPriceComparison = dynamic(
  () => import('@/components/oracle/charts/CrossChainPriceComparison').then((mod) => mod.CrossChainPriceComparison),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Chain Coverage Heatmap
 * Best for: Chain coverage visualization
 */
export const DynamicChainCoverageHeatmap = dynamic(
  () => import('@/components/oracle/charts/ChainCoverageHeatmap').then((mod) => mod.ChainCoverageHeatmap),
  {
    ssr: false,
    loading: createChartLoading(400, 'heatmap'),
  }
);

/**
 * Dynamic Concentration Risk Chart
 * Best for: Risk concentration analysis
 */
export const DynamicConcentrationRisk = dynamic(
  () => import('@/components/oracle/charts/ConcentrationRisk').then((mod) => mod.ConcentrationRisk),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Cross Chain Risk Chart
 * Best for: Cross-chain risk assessment
 */
export const DynamicCrossChainRisk = dynamic(
  () => import('@/components/oracle/charts/CrossChainRisk').then((mod) => mod.CrossChainRisk),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Price Deviation Risk Chart
 * Best for: Price deviation risk analysis
 */
export const DynamicPriceDeviationRisk = dynamic(
  () => import('@/components/oracle/charts/PriceDeviationRisk').then((mod) => mod.PriceDeviationRisk),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Correlation Analysis Chart
 * Best for: Correlation analysis
 */
export const DynamicCorrelationAnalysis = dynamic(
  () => import('@/components/oracle/charts/CorrelationAnalysis').then((mod) => mod.CorrelationAnalysis),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Chain Comparison Chart
 * Best for: Chain performance comparison
 */
export const DynamicChainComparison = dynamic(
  () => import('@/components/oracle/charts/ChainComparison').then((mod) => mod.ChainComparison),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Validator Comparison Chart
 * Best for: Validator performance comparison
 */
export const DynamicValidatorComparison = dynamic(
  () => import('@/components/oracle/charts/ValidatorComparison').then((mod) => mod.ValidatorComparison),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Multi Validator Comparison Chart
 * Best for: Multiple validator comparison
 */
export const DynamicMultiValidatorComparison = dynamic(
  () => import('@/components/oracle/charts/MultiValidatorComparison').then((mod) => mod.MultiValidatorComparison),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Cross Oracle Comparison
 * Best for: Oracle provider comparison
 */
export const DynamicCrossOracleComparison = dynamic(
  () => import('@/components/oracle/charts/CrossOracleComparison').then((mod) => mod.CrossOracleComparison),
  {
    ssr: false,
    loading: createChartLoading(600, 'price'),
  }
);

/**
 * Dynamic Interactive Price Chart
 * Best for: Interactive price exploration
 */
export const DynamicInteractivePriceChart = dynamic(
  () => import('@/components/oracle/charts/InteractivePriceChart').then((mod) => mod.InteractivePriceChart),
  {
    ssr: false,
    loading: createChartLoading(600, 'price'),
  }
);

/**
 * Dynamic KPI Dashboard
 * Best for: Key metrics overview
 */
export const DynamicKPIDashboard = dynamic(
  () => import('@/components/oracle/charts/KPIDashboard').then((mod) => mod.KPIDashboard),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Latency Prediction Chart
 * Best for: Latency forecasting
 */
export const DynamicLatencyPrediction = dynamic(
  () => import('@/components/oracle/charts/LatencyPrediction').then((mod) => mod.LatencyPrediction),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Latency Histogram
 * Best for: Latency distribution
 */
export const DynamicLatencyHistogram = dynamic(
  () => import('@/components/oracle/charts/LatencyHistogram').then((mod) => mod.LatencyHistogram),
  {
    ssr: false,
    loading: createChartLoading(400, 'price'),
  }
);

/**
 * Dynamic Price Stream Component
 * Best for: Real-time price streaming
 */
export const DynamicPriceStream = dynamic(
  () => import('@/components/oracle/charts/PriceStream').then((mod) => mod.PriceStream),
  {
    ssr: false,
    loading: createChartLoading(200, 'mini'),
  }
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Preload a chart component for faster subsequent renders
 * @param componentName - Name of the chart component to preload
 */
export function preloadChart(componentName: string): void {
  const preloadMap: Record<string, () => Promise<unknown>> = {
    PriceChart: () => import('@/components/oracle/charts/PriceChart'),
    PriceVolatilityChart: () => import('@/components/oracle/charts/PriceVolatilityChart'),
    MovingAverageChart: () => import('@/components/oracle/charts/MovingAverageChart'),
    CrossChainTrendChart: () => import('@/components/oracle/charts/CrossChainTrendChart'),
    GasFeeTrendChart: () => import('@/components/oracle/charts/GasFeeTrendChart'),
    LatencyTrendChart: () => import('@/components/oracle/charts/LatencyTrendChart'),
    RequestTrendChart: () => import('@/components/oracle/charts/RequestTrendChart'),
    ConfidenceIntervalChart: () => import('@/components/oracle/charts/ConfidenceIntervalChart'),
    CDFChart: () => import('@/components/oracle/charts/CDFChart'),
    StakingDistributionChart: () => import('@/components/oracle/charts/StakingDistributionChart'),
    PriceDeviationHistoryChart: () => import('@/components/oracle/charts/PriceDeviationHistoryChart'),
    ValidatorHistoryChart: () => import('@/components/oracle/charts/ValidatorHistoryChart'),
    DataSourceTrend: () => import('@/components/oracle/charts/DataSourceTrend'),
    DataQualityTrend: () => import('@/components/oracle/charts/DataQualityTrend'),
    PriceDistributionBoxPlot: () => import('@/components/oracle/charts/PriceDistributionBoxPlot'),
    PriceDeviationHeatmap: () => import('@/components/oracle/charts/PriceDeviationHeatmap'),
    PriceCorrelationMatrix: () => import('@/components/oracle/charts/PriceCorrelationMatrix'),
    UpdateFrequencyHeatmap: () => import('@/components/oracle/charts/UpdateFrequencyHeatmap'),
    ValidatorPerformanceHeatmap: () => import('@/components/oracle/charts/ValidatorPerformanceHeatmap'),
    LatencyDistributionHistogram: () => import('@/components/oracle/charts/LatencyDistributionHistogram'),
    ValidatorGeographicMap: () => import('@/components/oracle/charts/ValidatorGeographicMap'),
    CrossChainPriceComparison: () => import('@/components/oracle/charts/CrossChainPriceComparison'),
    ChainCoverageHeatmap: () => import('@/components/oracle/charts/ChainCoverageHeatmap'),
    ConcentrationRisk: () => import('@/components/oracle/charts/ConcentrationRisk'),
    CrossChainRisk: () => import('@/components/oracle/charts/CrossChainRisk'),
    PriceDeviationRisk: () => import('@/components/oracle/charts/PriceDeviationRisk'),
    CorrelationAnalysis: () => import('@/components/oracle/charts/CorrelationAnalysis'),
    ChainComparison: () => import('@/components/oracle/charts/ChainComparison'),
    ValidatorComparison: () => import('@/components/oracle/charts/ValidatorComparison'),
    MultiValidatorComparison: () => import('@/components/oracle/charts/MultiValidatorComparison'),
    CrossOracleComparison: () => import('@/components/oracle/charts/CrossOracleComparison'),
    InteractivePriceChart: () => import('@/components/oracle/charts/InteractivePriceChart'),
    KPIDashboard: () => import('@/components/oracle/charts/KPIDashboard'),
    LatencyPrediction: () => import('@/components/oracle/charts/LatencyPrediction'),
    LatencyHistogram: () => import('@/components/oracle/charts/LatencyHistogram'),
    PriceStream: () => import('@/components/oracle/charts/PriceStream'),
  };

  const preloadFn = preloadMap[componentName];
  if (preloadFn) {
    preloadFn();
  }
}

/**
 * Preload multiple chart components
 * @param componentNames - Array of chart component names to preload
 */
export function preloadCharts(componentNames: string[]): void {
  componentNames.forEach(preloadChart);
}

// ============================================================================
// Export Types
// ============================================================================

export type DynamicChartComponent = ComponentType<unknown>;
