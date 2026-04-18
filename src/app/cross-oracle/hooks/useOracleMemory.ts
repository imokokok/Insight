import { useCallback, useEffect, useRef } from 'react';

import { memoryManager, type MemoryStats } from '@/lib/oracles/utils/memoryManager';
import { type PerformanceMetricsCalculator } from '@/lib/oracles/utils/performanceMetricsCalculator';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

const logger = createLogger('useOracleMemory');

export interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  responseTime: number;
  success: boolean;
  source?: string;
}

export type PriceHistoryMap = Map<OracleProvider, PriceHistoryEntry[]>;

export interface UseOracleMemoryOptions {
  metricsCalculatorRef: React.MutableRefObject<PerformanceMetricsCalculator>;
}

export interface UseOracleMemoryReturn {
  priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>;
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
}

export function useOracleMemory({
  metricsCalculatorRef,
}: UseOracleMemoryOptions): UseOracleMemoryReturn {
  const priceHistoryMapRef = useRef<PriceHistoryMap>(new Map());

  useEffect(() => {
    const priceHistoryMap = priceHistoryMapRef.current;
    const metricsCalculator = metricsCalculatorRef.current;
    return () => {
      priceHistoryMap.clear();
      metricsCalculator.clearAllData();
    };
  }, [metricsCalculatorRef]);

  useEffect(() => {
    memoryManager.startPeriodicCleanup();
    return () => {
      memoryManager.stopPeriodicCleanup();
    };
  }, []);

  const getMemoryStats = useCallback((): MemoryStats => {
    return memoryManager.getMemoryStats(priceHistoryMapRef.current);
  }, []);

  const clearHistoryData = useCallback(() => {
    priceHistoryMapRef.current.clear();
    metricsCalculatorRef.current.clearAllData();
    logger.info('Cleared all price history data');
  }, [metricsCalculatorRef]);

  const getDetailedMemoryStats = useCallback(() => {
    const calculatorStats = metricsCalculatorRef.current.getDetailedStats();
    const localStats = getMemoryStats();

    return {
      localPriceHistory: localStats,
      calculatorStats,
      formattedBytes: memoryManager.formatBytes(localStats.estimatedBytes),
    };
  }, [getMemoryStats, metricsCalculatorRef]);

  return {
    priceHistoryMapRef,
    getMemoryStats,
    clearHistoryData,
    getDetailedMemoryStats,
  };
}
