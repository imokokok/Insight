/**
 * @fileoverview Hooks 索引文件
 * @description 统一导出所有自定义 hooks
 */

export { useOracleData } from './useOracleData';
export { useChartConfig } from './useChartConfig';
export { useFilterSort } from './useFilterSort';
export { useExport } from './useExport';
export { usePriceStats } from './usePriceStats';
export { useCrossOraclePage } from './useCrossOraclePage';
export { useCommonSymbols } from './useCommonSymbols';
export {
  useDataQualityScore,
  getScoreLevel,
  getScoreColor,
  getScoreBgColor,
} from './useDataQualityScore';
export { usePriceAnomalyDetection } from './usePriceAnomalyDetection';

// 风险相关 hooks
export {
  useRiskTrends,
  getRiskLevel,
  getRiskLevelColor,
  getRiskLevelBgColor,
} from './useRiskTrends';
export {
  useRiskMetrics,
  getTrendIconRotation,
  getTrendColor,
  getStatusColor,
} from './useRiskMetrics';
export {
  useRiskRecommendations,
  getPriorityColor,
  getPriorityLabel,
  getCategoryLabel,
  getCategoryIcon,
} from './useRiskRecommendations';

export type { TabId } from '../components/TabNavigation';
export type { CommonSymbolInfo, UseCommonSymbolsResult } from './useCommonSymbols';
export type { UseDataQualityScoreParams } from './useDataQualityScore';
export type {
  PriceAnomaly,
  AnomalySeverity,
  AnomalyDetectionResult,
} from './usePriceAnomalyDetection';

// 风险相关类型导出
export type { RiskTrendPoint, RiskTrendsResult } from './useRiskTrends';
export type { RiskMetric, RiskMetricsResult, TrendDirection } from './useRiskMetrics';
export type {
  RiskRecommendation,
  RiskRecommendationsResult,
  RecommendationPriority,
  RecommendationCategory,
} from './useRiskRecommendations';
