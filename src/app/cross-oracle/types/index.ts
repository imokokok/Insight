import type { MemoryStats } from '@/lib/oracles/utils/memoryManager';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import type { OracleRetryConfig as RetryConfig } from '@/lib/oracles/utils/retry';
import type { OracleProvider, PriceData, SnapshotStats } from '@/types/oracle';

import type { PriceHistoryMap } from '../hooks/useOracleMemory';

export type RefreshInterval = 'off' | '10s' | '30s' | '1m' | '5m';

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

export type { RetryConfig };

export interface UseOracleDataReturn {
  priceData: PriceData[];
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
  priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>;
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
