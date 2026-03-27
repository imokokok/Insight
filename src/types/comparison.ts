/**
 * @fileoverview 对比分析模块统一类型定义
 * @description 包含预言机对比、跨链对比等功能的统一类型定义
 */

import type { OracleProvider, SnapshotStats } from './oracle';

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 对比分析时间范围类型
 */
export type ComparisonTimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

/**
 * 排序列类型
 */
export type SortColumn = 'price' | 'timestamp' | null;

/**
 * 排序方向类型
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 偏离筛选类型
 */
export type DeviationFilter = 'all' | 'excellent' | 'good' | 'poor';

/**
 * 刷新间隔类型
 */
export type RefreshInterval = 0 | 30000 | 60000 | 300000;

/**
 * Tab ID 类型
 */
export type TabId = 'overview' | 'charts' | 'advanced' | 'snapshots' | 'performance';

/**
 * 一致性评级类型
 */
export type ConsistencyRating = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * 健康指示器类型
 */
export type HealthIndicator = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * 健康颜色类型
 */
export type HealthColorType = 'price' | 'deviation' | 'range';

// ============================================================================
// 偏离检测相关类型
// ============================================================================

/**
 * 偏离级别类型
 */
export type DeviationLevel = 'none' | 'warning' | 'danger';

/**
 * 偏离值类型
 */
export type DeviationType = 'percentage' | 'absolute';

/**
 * 阈值配置接口
 */
export interface DeviationThreshold {
  /** 警告阈值 */
  warning: number;
  /** 危险阈值 */
  danger: number;
}

/**
 * 偏离检测结果接口
 */
export interface DeviationDetectionResult {
  /** 偏离级别 */
  level: DeviationLevel;
  /** 是否处于警告状态 */
  isWarning: boolean;
  /** 是否处于危险状态 */
  isDanger: boolean;
  /** 是否偏离正常范围 */
  isDeviated: boolean;
  /** 颜色类名 */
  colorClass: string;
  /** 背景颜色类名 */
  bgClass: string;
  /** 边框颜色类名 */
  borderClass: string;
  /** 文字颜色类名 */
  textClass: string;
  /** 脉冲动画类名 */
  pulseClass: string;
}

// ============================================================================
// 历史数据相关类型
// ============================================================================

/**
 * 历史极值项
 */
export interface HistoryMinMaxValue {
  min: number;
  max: number;
}

/**
 * 历史极值集合
 */
export interface HistoryMinMax {
  avgPrice: HistoryMinMaxValue;
  weightedAvgPrice: HistoryMinMaxValue;
  maxPrice: HistoryMinMaxValue;
  minPrice: HistoryMinMaxValue;
  priceRange: HistoryMinMaxValue;
  standardDeviationPercent: HistoryMinMaxValue;
  variance: HistoryMinMaxValue;
}

// ============================================================================
// 统计数据相关类型
// ============================================================================

/**
 * 价格统计结果
 */
export interface PriceStatsResult {
  /** 有效价格数组 */
  validPrices: number[];
  /** 平均值 */
  avgPrice: number;
  /** 加权平均值 */
  weightedAvgPrice: number;
  /** 最大值 */
  maxPrice: number;
  /** 最小值 */
  minPrice: number;
  /** 价格范围 */
  priceRange: number;
  /** 方差 */
  variance: number;
  /** 标准差 */
  standardDeviation: number;
  /** 标准差百分比 */
  standardDeviationPercent: number;
  /** 当前统计快照 */
  currentStats: SnapshotStats;
}

/**
 * 统计指标接口
 */
export interface ComparisonMetrics {
  /** 平均值 */
  avgPrice: number;
  /** 加权平均值 */
  weightedAvgPrice: number;
  /** 最大值 */
  maxPrice: number;
  /** 最小值 */
  minPrice: number;
  /** 价格范围 */
  priceRange: number;
  /** 方差 */
  variance: number;
  /** 标准差 */
  standardDeviation: number;
  /** 标准差百分比 */
  standardDeviationPercent: number;
  /** 中位数 */
  medianPrice?: number;
  /** 一致性评级 */
  consistencyRating?: ConsistencyRating;
}

/**
 * 异常值信息
 */
export interface OutlierInfo {
  index: number;
  provider: OracleProvider;
  zScore: number;
  deviation: number;
}

/**
 * 异常值统计
 */
export interface OutlierStats {
  count: number;
  avgDeviation: number;
  outliers: OutlierInfo[];
  oracleNames: string[];
}

// ============================================================================
// 图表数据相关类型
// ============================================================================

/**
 * 对比分析图表数据点
 */
export interface ComparisonChartDataPoint {
  timestamp: string;
  rawTimestamp: number;
  fullTimestamp?: Date;
  avgPrice?: number;
  stdDev?: number;
  upperBound1?: number;
  lowerBound1?: number;
  upperBound2?: number;
  lowerBound2?: number;
  oracleCount?: number;
  [key: string]: string | number | Date | undefined;
}

/**
 * 质量趋势数据点
 */
export interface QualityTrendDataPoint {
  timestamp: number;
  updateLatency: number;
  deviationFromMedian: number;
  isOutlier: boolean;
  isStale: boolean;
  heartbeatCompliance: number;
}

/**
 * 质量趋势数据
 */
export interface QualityTrendData {
  oracle: OracleProvider;
  data: QualityTrendDataPoint[];
}

/**
 * 对比分析移动平均线数据
 */
export interface ComparisonMovingAverageData {
  oracle: OracleProvider;
  prices: { timestamp: number; price: number }[];
}

/**
 * Gas费用数据
 */
export interface GasFeeData {
  oracle: OracleProvider;
  chain: string;
  updateCost: number;
  updateFrequency: number;
  avgGasPrice: number;
  lastUpdate: number;
}

/**
 * ATR数据
 */
export interface ATRData {
  oracle: OracleProvider;
  prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
}

/**
 * 布林带数据
 */
export interface BollingerData {
  oracle: OracleProvider;
  prices: { timestamp: number; price: number; high: number; low: number; close: number }[];
}

/**
 * 质量分数数据
 */
export interface QualityScoreData {
  freshness: { lastUpdated: Date };
  completeness: { successCount: number; totalCount: number };
  reliability: { historicalAccuracy: number; responseSuccessRate: number };
}

// ============================================================================
// 组件 Props 类型
// ============================================================================

/**
 * 健康颜色配置
 */
export interface HealthColor {
  bg: string;
  text: string;
  border: string;
  indicator: HealthIndicator;
}

/**
 * 交易对配置
 */
export interface SymbolConfig {
  symbol: string;
  name: string;
  category: 'layer1' | 'defi' | 'stablecoin';
  iconColor: string;
}

/**
 * 导出数据行
 */
export interface ExportRow {
  oracle: string;
  provider: string;
  symbol: string;
  price: number;
  deviationPercent: number | null;
  confidence: number | null;
  source: string;
  timestamp: string;
}

// ============================================================================
// 跨预言机对比数据
// ============================================================================

/**
 * 跨预言机对比数据（用于导出）
 */
export interface CrossOracleData {
  asset?: string;
  oracle?: string;
  provider?: string;
  chain?: string;
  price: number;
  timestamp: number;
  deviation?: number;
  confidence?: number;
}

// ============================================================================
// 默认值和常量
// ============================================================================

/**
 * 默认偏离阈值
 */
export const DEFAULT_DEVIATION_THRESHOLD: DeviationThreshold = {
  warning: 1,
  danger: 2,
};

/**
 * 初始历史极值
 */
export const initialHistoryMinMax: HistoryMinMax = {
  avgPrice: { min: Infinity, max: -Infinity },
  weightedAvgPrice: { min: Infinity, max: -Infinity },
  maxPrice: { min: Infinity, max: -Infinity },
  minPrice: { min: Infinity, max: -Infinity },
  priceRange: { min: Infinity, max: -Infinity },
  standardDeviationPercent: { min: Infinity, max: -Infinity },
  variance: { min: Infinity, max: -Infinity },
};

/**
 * 时间范围选项
 */
export const timeRanges: ComparisonTimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];
