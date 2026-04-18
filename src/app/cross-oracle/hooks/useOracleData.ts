import { type OracleProvider } from '@/types/oracle';

import { type TimeRange, type RefreshInterval } from '../constants';

import { useOracleDataCore } from './useOracleDataCore';
import { useOracleErrorHandling } from './useOracleErrorHandling';
import { useOracleMemory } from './useOracleMemory';
import { useOraclePerformance } from './useOraclePerformance';

import type { UseOracleDataReturn, RetryConfig } from '../types';

interface UseOracleDataOptions {
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRefreshInterval?: RefreshInterval;
  enablePerformanceMetrics?: boolean;
  initialRetryConfig?: Partial<RetryConfig>;
  requestTimeout?: number;
  requestPriority?: Parameters<typeof useOracleDataCore>[0]['requestPriority'];
}

export function useOracleData({
  selectedOracles,
  selectedSymbol,
  timeRange,
  initialRefreshInterval = 'off',
  enablePerformanceMetrics = true,
  initialRetryConfig,
  requestTimeout,
  requestPriority = 'normal',
}: UseOracleDataOptions): UseOracleDataReturn {
  const errorHandling = useOracleErrorHandling();

  const performance = useOraclePerformance({ enablePerformanceMetrics });

  const memory = useOracleMemory({
    metricsCalculatorRef: performance.metricsCalculatorRef,
  });

  const core = useOracleDataCore(
    {
      selectedOracles,
      selectedSymbol,
      timeRange,
      initialRefreshInterval,
      enablePerformanceMetrics,
      initialRetryConfig,
      requestTimeout,
      requestPriority,
    },
    errorHandling,
    performance,
    memory
  );

  return {
    priceData: core.priceData,
    historicalData: core.historicalData,
    isLoading: core.isLoading,
    error: core.error,
    lastUpdated: core.lastUpdated,
    fetchPriceData: core.fetchPriceData,
    refreshInterval: core.refreshInterval,
    setRefreshInterval: core.setRefreshInterval,
    performanceMetrics: performance.performanceMetrics,
    isCalculatingMetrics: performance.isCalculatingMetrics,
    oracleDataError: core.oracleDataError,
    retryConfig: core.retryConfig,
    setRetryConfig: core.setRetryConfig,
    retryOracle: core.retryOracle,
    retryAllFailed: core.retryAllFailed,
    isRetrying: core.isRetrying,
    retryingOracles: core.retryingOracles,
    getMemoryStats: memory.getMemoryStats,
    clearHistoryData: memory.clearHistoryData,
    getDetailedMemoryStats: memory.getDetailedMemoryStats,
    queryProgress: core.queryProgress,
    skippedOracles: core.skippedOracles,
    lastRefreshedAt: core.lastRefreshedAt,
    nextRefreshAt: core.nextRefreshAt,
  };
}
