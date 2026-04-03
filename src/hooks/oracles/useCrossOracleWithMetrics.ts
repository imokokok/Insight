'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CROSS_ORACLE_GC_TIME,
  CROSS_ORACLE_QUERY_KEY,
  CROSS_ORACLE_STALE_TIME,
} from '@/components/oracle/charts/CrossOracleComparison/useCrossOraclePrices';
import { oracleClients } from '@/components/oracle/charts/CrossOracleComparison/crossOracleConfig';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain, type OracleProvider, type PriceData } from '@/types/oracle';

import { useCalculatedPerformanceMetrics, type OraclePriceResult } from './useCalculatedPerformanceMetrics';

const logger = createLogger('useCrossOracleWithMetrics');

export interface UseCrossOracleWithMetricsOptions {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  enabled?: boolean;
  refetchInterval?: number | false;
  useCalculatedMetrics?: boolean;
}

interface OraclePriceData {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
  previousPrice?: number;
}

export interface UseCrossOracleWithMetricsReturn {
  // 价格数据
  priceData: OraclePriceData[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  lastUpdated: Date | null;

  // 性能指标
  performanceMetrics: ReturnType<typeof useCalculatedPerformanceMetrics>['metrics'];
  isCalculating: boolean;
  lastCalculated: Date | null;

  // 操作方法
  refetchAll: () => Promise<void>;
  recalculateMetrics: () => void;
  clearHistory: () => void;

  // 统计信息
  stats: {
    totalDataPoints: number;
    providerCount: number;
  };
}

export function useCrossOracleWithMetrics({
  selectedSymbol,
  selectedOracles,
  enabled = true,
  refetchInterval = false,
  useCalculatedMetrics = true,
}: UseCrossOracleWithMetricsOptions): UseCrossOracleWithMetricsReturn {
  // 使用性能指标计算 hook
  const {
    metrics: performanceMetrics,
    isLoading: isMetricsLoading,
    isCalculating,
    lastCalculated,
    addMultiplePriceData,
    recalculateMetrics,
    clearHistory,
    stats,
  } = useCalculatedPerformanceMetrics({
    selectedSymbol,
    selectedOracles,
    enabled: useCalculatedMetrics && enabled,
    recalculateInterval: typeof refetchInterval === 'number' ? refetchInterval : 5000,
  });

  // 价格数据状态
  const [priceData, setPriceData] = useState<OraclePriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errors, setErrors] = useState<Error[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 获取所有预言机价格
  const fetchAllPrices = useCallback(async (): Promise<void> => {
    if (!enabled || selectedOracles.length === 0) {
      setPriceData([]);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrors([]);

    const results: OraclePriceResult[] = [];
    const priceDataArray: OraclePriceData[] = [];
    const newErrors: Error[] = [];

    await Promise.all(
      selectedOracles.map(async (provider) => {
        const requestStart = Date.now();
        try {
          const client = oracleClients[provider];
          const priceData: PriceData = await client.getPrice(selectedSymbol, Blockchain.ETHEREUM);
          const responseTime = Date.now() - requestStart;

          const result: OraclePriceResult = {
            provider,
            price: priceData.price,
            timestamp: priceData.timestamp,
            confidence: priceData.confidence,
            responseTime,
            success: true,
            source: priceData.source,
          };

          results.push(result);

          priceDataArray.push({
            provider,
            price: priceData.price,
            timestamp: priceData.timestamp,
            confidence: priceData.confidence,
            responseTime,
          });

          logger.debug(`Fetched price from ${provider}`, {
            price: priceData.price,
            responseTime,
          });
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          newErrors.push(errorObj);

          results.push({
            provider,
            price: 0,
            timestamp: Date.now(),
            responseTime: Date.now() - requestStart,
            success: false,
            source: 'error',
          });

          logger.error(`Error fetching price from ${provider}`, errorObj);
        }
      })
    );

    // 更新价格数据
    setPriceData(priceDataArray);
    setErrors(newErrors);
    setIsError(newErrors.length > 0);
    setLastUpdated(new Date());

    // 将结果添加到性能指标计算器
    if (useCalculatedMetrics) {
      addMultiplePriceData(results);
    }

    setIsLoading(false);

    logger.debug('Fetched all oracle prices', {
      count: priceDataArray.length,
      errors: newErrors.length,
    });
  }, [enabled, selectedOracles, selectedSymbol, useCalculatedMetrics, addMultiplePriceData]);

  // 初始加载和定时刷新
  useEffect(() => {
    fetchAllPrices();

    if (refetchInterval && typeof refetchInterval === 'number') {
      const intervalId = setInterval(fetchAllPrices, refetchInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchAllPrices, refetchInterval]);

  // 手动刷新
  const refetchAll = useCallback(async () => {
    await fetchAllPrices();
  }, [fetchAllPrices]);

  // 计算 previousPrice
  const priceDataWithPrevious = useMemo(() => {
    return priceData.map((data) => {
      const previousEntry = performanceMetrics.find((m) => m.provider === data.provider);
      return {
        ...data,
        previousPrice: previousEntry ? undefined : undefined,
      };
    });
  }, [priceData, performanceMetrics]);

  return {
    priceData: priceDataWithPrevious,
    isLoading: isLoading || (useCalculatedMetrics && isMetricsLoading),
    isError,
    errors,
    lastUpdated,
    performanceMetrics,
    isCalculating,
    lastCalculated,
    refetchAll,
    recalculateMetrics,
    clearHistory,
    stats,
  };
}

export default useCrossOracleWithMetrics;
