/**
 * @fileoverview 图表组件类型定义
 * @description 为 cross-oracle 页面定义所需的图表类型
 */

import type { OracleProvider } from '@/types/oracle';

// ============================================================================
// 价格相关性矩阵类型
// ============================================================================

export interface OraclePriceSeries {
  oracleId: string;
  data: {
    timestamp: number;
    price: number;
  }[];
}

// ============================================================================
// 价格偏差热力图类型
// ============================================================================

export interface PriceDeviationDataPoint {
  oracleName: string;
  timestamp: number;
  deviationPercent: number;
  price: number;
}

// ============================================================================
// 价格分布箱线图类型
// ============================================================================

interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

export interface OraclePriceData {
  oracleId: string;
  prices: number[];
}

// ============================================================================
// 价格波动率图表类型
// ============================================================================

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: {
    timestamp: number;
    price: number;
  }[];
}

interface VolatilityResult {
  volatility: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface VolatilityTrendPoint {
  timestamp: number;
  volatility: number;
  price: number;
}

// ============================================================================
// 性能排名类型
// ============================================================================

export interface OraclePerformanceData {
  provider: OracleProvider;
  name: string;
  responseTime: number;
  accuracy: number;
  stability: number;
  color: string;
  dataSources?: number;
  supportedChains?: number;
}

// ============================================================================
// 移动平均线图表类型
// ============================================================================

interface MovingAverageChartProps {
  data: {
    oracle: OracleProvider;
    prices: {
      timestamp: number;
      price: number;
    }[];
  }[];
  oracleNames: Record<OracleProvider, string>;
}

// ============================================================================
// 数据质量趋势类型
// ============================================================================

interface QualityDataPoint {
  timestamp: number;
  score: number;
  completeness: number;
  freshness: number;
  reliability: number;
}

interface DataQualityTrendProps {
  data: {
    oracle: OracleProvider;
    data: QualityDataPoint[];
  }[];
  oracleNames: Record<OracleProvider, string>;
}

// ============================================================================
// 延迟分布直方图类型
// ============================================================================

interface HistogramBin {
  bin: string;
  count: number;
  range: [number, number];
}

export interface LatencyStats {
  /** P50 中位数延迟 */
  p50: number;
  /** P95 延迟 */
  p95: number;
  /** P99 延迟 */
  p99: number;
  /** 最小延迟 */
  min: number;
  /** 最大延迟 */
  max: number;
  /** 平均延迟 */
  avg: number;
}

interface LatencyDistributionHistogramProps {
  data: number[];
  oracleName: string;
}
