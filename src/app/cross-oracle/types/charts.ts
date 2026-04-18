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
// 延迟分布直方图类型
// ============================================================================

export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}
