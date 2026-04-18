/**
 * @fileoverview Multi-oracle comparison page type definitions
 * @description Unified export of all type definitions, ensuring a clear and consistent type system
 */

import type { MemoryStats } from '@/lib/oracles/utils/memoryManager';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import { type OracleProvider, type PriceData, type SnapshotStats } from '@/types/oracle';

import type {
  OraclePriceSeries,
  PriceDeviationDataPoint,
  OraclePriceData,
  OraclePriceHistory,
  OraclePerformanceData,
  LatencyStats,
} from './charts';
import type { SortColumn, SortDirection, TimeRange, DeviationFilter } from '../constants';
import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

export type { PriceAnomaly };

export type { SortColumn, SortDirection, DeviationFilter } from '../constants';

export type TabId = 'priceComparison' | 'qualityAnalysis' | 'oracleProfiles';

export type RefreshInterval = 'off' | '10s' | '30s' | '1m' | '5m';

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

export interface ChartDataPoint {
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

export interface PriceStatsResult {
  validPrices: number[];
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  medianPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  currentStats: SnapshotStats;
}

export type OracleErrorType =
  | 'network'
  | 'timeout'
  | 'data_format'
  | 'rate_limit'
  | 'server_error'
  | 'cors'
  | 'authorization'
  | 'unknown';

export interface OracleErrorInfo {
  provider: OracleProvider;
  errorType: OracleErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
  timestamp: number;
}

export interface PartialSuccessState {
  isSuccess: boolean;
  successCount: number;
  failedCount: number;
  totalCount: number;
  failedOracles: OracleProvider[];
  successOracles: OracleProvider[];
}

export interface OracleDataError {
  hasError: boolean;
  isPartialSuccess: boolean;
  partialSuccess: PartialSuccessState | null;
  errors: OracleErrorInfo[];
  globalError: Error | null;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

export interface UseOracleDataReturn {
  priceData: PriceData[];
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  fetchPriceData: () => Promise<void>;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  performanceMetrics: CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;
  oracleDataError: OracleDataError;
  retryConfig: RetryConfig;
  setRetryConfig: (config: Partial<RetryConfig>) => void;
  retryOracle: (provider: OracleProvider) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  isRetrying: boolean;
  retryingOracles: OracleProvider[];
  getMemoryStats: () => MemoryStats;
  clearHistoryData: () => void;
  getDetailedMemoryStats: () => {
    localPriceHistory: MemoryStats;
    calculatorStats: {
      basic: { totalEntries: number; providerCount: number; cacheSize: number };
      memory: MemoryStats;
      entriesByProvider: Record<string, number>;
    };
    formattedBytes: string;
  };
  queryProgress: { completed: number; total: number };
  skippedOracles: OracleProvider[];
  lastRefreshedAt: Date | null;
  nextRefreshAt: Date | null;
}

export interface OracleFeature {
  provider: OracleProvider;
  name: string;
  symbolCount: number;
  avgLatency: number;
  features: string[];
  descriptionKey: string;
}

export type { OracleProvider, PriceData, SnapshotStats };

export type {
  OraclePriceSeries,
  PriceDeviationDataPoint,
  OraclePriceData,
  OraclePriceHistory,
  OraclePerformanceData,
  LatencyStats,
} from './charts';
