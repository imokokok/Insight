/**
 * @fileoverview Chart component type definitions
 * @description Define chart types needed for the cross-oracle page
 */

import type { OracleProvider } from '@/types/oracle';

// ============================================================================
// Price correlation matrix types
// ============================================================================

export interface OraclePriceSeries {
  oracleId: string;
  data: {
    timestamp: number;
    price: number;
  }[];
}

// ============================================================================
// Price deviation heatmap types
// ============================================================================

export interface PriceDeviationDataPoint {
  oracleName: string;
  timestamp: number;
  deviationPercent: number;
  price: number;
}

// ============================================================================
// Price distribution box plot types
// ============================================================================

export interface OraclePriceData {
  oracleId: string;
  prices: number[];
}

// ============================================================================
// Price volatility chart types
// ============================================================================

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: {
    timestamp: number;
    price: number;
  }[];
}

// ============================================================================
// Performance ranking types
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
// Latency distribution histogram types
// ============================================================================

export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}
