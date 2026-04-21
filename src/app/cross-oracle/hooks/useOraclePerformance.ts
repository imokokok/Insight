import { useState, useCallback, useRef } from 'react';

import { extractBaseSymbol } from '@/lib/oracles';
import { memoryManager } from '@/lib/oracles/utils/memoryManager';
import {
  PerformanceMetricsCalculator,
  type CalculatedPerformanceMetrics,
} from '@/lib/oracles/utils/performanceMetricsCalculator';
import { getPerformanceMetricsConfig } from '@/lib/oracles/utils/performanceMetricsConfig';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import type { PriceHistoryMap } from './useOracleMemory';

const logger = createLogger('useOraclePerformance');

interface UseOraclePerformanceOptions {
  enablePerformanceMetrics: boolean;
}

export interface UseOraclePerformanceReturn {
  performanceMetrics: CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;
  metricsCalculatorRef: React.MutableRefObject<PerformanceMetricsCalculator>;
  calculatePerformanceMetrics: (
    selectedOracles: OracleProvider[],
    selectedSymbol: string,
    priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>,
    isMountedRef: React.MutableRefObject<boolean>
  ) => void;
  recordSuccessfulFetch: (
    oracle: OracleProvider,
    baseSymbol: string,
    price: PriceData,
    responseTime: number,
    priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>,
    isMountedRef: React.MutableRefObject<boolean>
  ) => void;
  recordFailedFetch: (
    oracle: OracleProvider,
    baseSymbol: string,
    responseTime: number,
    priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>
  ) => void;
}

export function useOraclePerformance({
  enablePerformanceMetrics,
}: UseOraclePerformanceOptions): UseOraclePerformanceReturn {
  const [performanceMetrics, setPerformanceMetrics] = useState<CalculatedPerformanceMetrics[]>([]);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const metricsCalculatorRef = useRef<PerformanceMetricsCalculator>(
    new PerformanceMetricsCalculator()
  );

  const calculatePerformanceMetrics = useCallback(
    (
      selectedOracles: OracleProvider[],
      selectedSymbol: string,
      priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>,
      isMountedRef: React.MutableRefObject<boolean>
    ) => {
      if (!enablePerformanceMetrics) return;

      setIsCalculatingMetrics(true);

      try {
        const newMetrics: CalculatedPerformanceMetrics[] = [];
        const baseSymbol = extractBaseSymbol(selectedSymbol);

        selectedOracles.forEach((oracle) => {
          const metrics = metricsCalculatorRef.current.calculateAllMetrics(
            oracle,
            baseSymbol,
            priceHistoryMapRef.current
          );
          newMetrics.push(metrics);
        });

        if (isMountedRef.current) {
          setPerformanceMetrics(newMetrics);
          logger.debug('Calculated performance metrics', { count: newMetrics.length });
        }
      } catch (err) {
        logger.error(
          'Error calculating performance metrics',
          err instanceof Error ? err : new Error(String(err))
        );
      } finally {
        if (isMountedRef.current) {
          setIsCalculatingMetrics(false);
        }
      }
    },
    [enablePerformanceMetrics]
  );

  const recordSuccessfulFetch = useCallback(
    (
      oracle: OracleProvider,
      baseSymbol: string,
      price: PriceData,
      responseTime: number,
      priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>,
      isMountedRef: React.MutableRefObject<boolean>
    ) => {
      if (!enablePerformanceMetrics || !isMountedRef.current) return;

      metricsCalculatorRef.current.addPriceData(oracle, baseSymbol, price, responseTime, true);

      if (!priceHistoryMapRef.current.has(oracle)) {
        priceHistoryMapRef.current.set(oracle, []);
      }
      const historyData = priceHistoryMapRef.current.get(oracle)!;
      historyData.push({
        price: price.price,
        timestamp: price.timestamp,
        responseTime,
        success: true,
        source: price.source,
      });

      const memConfig = getPerformanceMetricsConfig().memoryManagement;
      if (memConfig.enabled) {
        const cleanedData = memoryManager.smartCleanup(historyData);
        if (cleanedData.length !== historyData.length) {
          priceHistoryMapRef.current.set(oracle, cleanedData);
        }
      } else if (historyData.length > 1000) {
        historyData.splice(0, historyData.length - 999);
      }
    },
    [enablePerformanceMetrics]
  );

  const recordFailedFetch = useCallback(
    (
      oracle: OracleProvider,
      baseSymbol: string,
      responseTime: number,
      priceHistoryMapRef: React.MutableRefObject<PriceHistoryMap>
    ) => {
      if (!enablePerformanceMetrics) return;

      metricsCalculatorRef.current.addPriceData(
        oracle,
        baseSymbol,
        {
          provider: oracle,
          symbol: baseSymbol,
          price: 0,
          timestamp: Date.now(),
        },
        responseTime,
        false
      );

      if (!priceHistoryMapRef.current.has(oracle)) {
        priceHistoryMapRef.current.set(oracle, []);
      }
      const historyData = priceHistoryMapRef.current.get(oracle)!;
      historyData.push({
        price: 0,
        timestamp: Date.now(),
        responseTime,
        success: false,
        source: 'error',
      });
    },
    [enablePerformanceMetrics]
  );

  return {
    performanceMetrics,
    isCalculatingMetrics,
    metricsCalculatorRef,
    calculatePerformanceMetrics,
    recordSuccessfulFetch,
    recordFailedFetch,
  };
}
