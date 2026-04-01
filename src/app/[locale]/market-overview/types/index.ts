/**
 * 市场概览页面类型定义统一导出
 */

// 预言机相关类型
export type {
  OracleMarketData,
  EnhancedOracleMarketData,
  ChainBreakdown,
  ProtocolDetail,
  ChainSupportData,
  ComparisonMetric,
  ComparisonData,
  MarketConcentrationResult,
  MarketInsights,
} from './oracle';

// 资产相关类型
export type { PriceSource, AssetData, AssetCategory } from './asset';

// 图表相关类型
export type {
  ChartType,
  ViewType,
  ComparisonMode,
  TrendChartType,
  TimeRange,
  TVSTrendData,
  RadarDataPoint,
  AnomalyData,
  AnomalyLevel,
  AnomalyType,
  SelectedAnomaly,
  ZoomRange,
  LinkedOracle,
  ChartContainerProps,
} from './chart';

// 市场统计相关类型
export type { MarketStats } from './market';

// 风险指标相关类型
export type {
  RiskLevel,
  HHIResult,
  DiversificationResult,
  VolatilityResult,
  CorrelationRiskResult,
  RiskAlert,
  CorrelationPair,
  CorrelationData,
  RiskMetrics,
} from './risk';

// 导出功能相关类型
export type {
  ExportFormat,
  ExportDateRange,
  ExportTimeRange,
  ExportConfig,
  ScheduledExportFrequency,
  ScheduledExport,
} from './export';

// 预警功能相关类型
export type { AlertType, AlertChannel, PriceAlert, AlertCheckResult, AlertHistory } from './alert';

// 刷新状态
export type RefreshStatus = 'idle' | 'refreshing' | 'success' | 'error';

// 重新导出原 types.ts 中的类型以保持兼容性
export type { UseMarketOverviewDataReturn } from '../types';
