/**
 * 数据对比功能类型定义
 */

import { type OracleProvider } from '@/types/oracle';

// ============================================
// 时间段对比类型
// ============================================

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

export interface TimePeriod {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  range: TimeRange;
}

export interface TimeComparisonConfig {
  primaryPeriod: TimePeriod;
  comparisonPeriod: TimePeriod;
  comparisonType: 'previous' | 'custom' | 'year_over_year';
}

export interface TimeComparisonResult<T> {
  primary: T;
  comparison: T;
  difference: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================
// 预言机对比类型
// ============================================

export interface OracleComparisonItem {
  provider: OracleProvider;
  name: string;
  color: string;
  metrics: OracleMetrics;
}

export interface OracleMetrics {
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime?: number;
  deviation?: number;
  updateFrequency?: number;
  accuracy?: number;
  reliability?: number;
}

export interface OracleComparisonResult {
  oracles: OracleComparisonItem[];
  averagePrice: number;
  medianPrice: number;
  priceRange: number;
  stdDeviation: number;
  consistencyScore: number;
  maxDeviation: number;
}

// ============================================
// 基准对比类型
// ============================================

export type BenchmarkType = 'industry_average' | 'market_leader' | 'custom';

export interface BenchmarkConfig {
  type: BenchmarkType;
  customValue?: number;
  customLabel?: string;
}

export interface BenchmarkData {
  label: string;
  value: number;
  description?: string;
  source?: string;
}

export interface BenchmarkComparisonResult<T> {
  actual: T;
  benchmark: BenchmarkData;
  difference: number;
  percentDiff: number;
  performance: 'above' | 'below' | 'at';
}

// ============================================
// 差异高亮类型
// ============================================

export type DifferenceSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface DifferenceHighlight {
  severity: DifferenceSeverity;
  value: number;
  percentChange: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface ComparisonCellStyle {
  bgColor: string;
  textColor: string;
  borderColor?: string;
  icon?: string;
}

// ============================================
// 对比模式类型
// ============================================

export type ComparisonMode = 'time' | 'oracle' | 'benchmark';

export interface ComparisonConfig {
  mode: ComparisonMode;
  timeConfig?: TimeComparisonConfig;
  oracleConfig?: {
    selectedOracles: OracleProvider[];
    benchmarkOracle?: OracleProvider;
  };
  benchmarkConfig?: BenchmarkConfig;
}

// ============================================
// 图表数据类型
// ============================================

export interface ComparisonChartData {
  timestamp: number;
  primary: number;
  comparison: number;
  difference: number;
  label: string;
}

export interface MultiOracleChartData {
  timestamp: number;
  [oracleName: string]: number | string;
}

export interface BenchmarkChartData {
  category: string;
  actual: number;
  benchmark: number;
  gap: number;
}
