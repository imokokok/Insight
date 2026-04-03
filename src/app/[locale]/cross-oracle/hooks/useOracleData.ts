/**
 * @fileoverview 预言机数据获取 Hook
 * @description 负责价格数据获取、加载状态管理和自动刷新，集成性能指标计算
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { createLogger } from '@/lib/utils/logger';
import {
  PerformanceMetricsCalculator,
  type CalculatedPerformanceMetrics,
} from '@/lib/oracles/performanceMetricsCalculator';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleClients, type TimeRange, type RefreshInterval, type PriceOracleProvider } from '../constants';

import type { UseOracleDataReturn } from '../types/index';

const logger = createLogger('useOracleData');

interface UseOracleDataOptions {
  selectedOracles: PriceOracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRefreshInterval?: RefreshInterval;
  enablePerformanceMetrics?: boolean;
}

export function useOracleData({
  selectedOracles,
  selectedSymbol,
  timeRange,
  initialRefreshInterval = 0,
  enablePerformanceMetrics = true,
}: UseOracleDataOptions): UseOracleDataReturn {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<OracleProvider, PriceData[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(initialRefreshInterval);

  // 性能指标计算
  const [performanceMetrics, setPerformanceMetrics] = useState<CalculatedPerformanceMetrics[]>([]);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const metricsCalculatorRef = useRef<PerformanceMetricsCalculator>(
    new PerformanceMetricsCalculator()
  );
  const priceHistoryMapRef = useRef<Map<OracleProvider, Array<{
    price: number;
    timestamp: number;
    responseTime: number;
    success: boolean;
    source?: string;
  }>>>(new Map());

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const getHoursForTimeRange = useCallback((range: TimeRange): number | undefined => {
    switch (range) {
      case '1H':
        return 1;
      case '24H':
        return 24;
      case '7D':
        return 168;
      case '30D':
        return 720;
      case '90D':
        return 2160;
      case '1Y':
        return 8760;
      case 'ALL':
        return undefined;
      default:
        return 24;
    }
  }, []);

  // 计算性能指标
  const calculatePerformanceMetrics = useCallback(() => {
    if (!enablePerformanceMetrics) return;

    setIsCalculatingMetrics(true);

    try {
      const newMetrics: CalculatedPerformanceMetrics[] = [];
      const baseSymbol = selectedSymbol.split('/')[0];

      selectedOracles.forEach((oracle) => {
        const metrics = metricsCalculatorRef.current.calculateAllMetrics(
          oracle as OracleProvider,
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
  }, [enablePerformanceMetrics, selectedOracles, selectedSymbol]);

  const fetchPriceData = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    const prices: PriceData[] = [];
    const histories: Partial<Record<OracleProvider, PriceData[]>> = {};
    const hours = getHoursForTimeRange(timeRange);
    const baseSymbol = selectedSymbol.split('/')[0];

    try {
      const fetchPromises = selectedOracles.map(async (oracle) => {
        const requestStart = Date.now();
        try {
          const client = oracleClients[oracle];
          const [price, history] = await Promise.all([
            client.getPrice(baseSymbol),
            client.getHistoricalPrices(baseSymbol, undefined, hours),
          ]);

          const responseTime = Date.now() - requestStart;

          if (isMountedRef.current) {
            prices.push(price);
            histories[oracle] = history;

            // 记录性能数据
            if (enablePerformanceMetrics) {
              // 添加到计算器
              metricsCalculatorRef.current.addPriceData(
                oracle as OracleProvider,
                baseSymbol,
                price,
                responseTime,
                true
              );

              // 添加到本地历史
              if (!priceHistoryMapRef.current.has(oracle as OracleProvider)) {
                priceHistoryMapRef.current.set(oracle as OracleProvider, []);
              }
              const history = priceHistoryMapRef.current.get(oracle as OracleProvider)!;
              history.push({
                price: price.price,
                timestamp: price.timestamp,
                responseTime,
                success: true,
                source: price.source,
              });
              // 限制历史大小
              if (history.length > 1000) {
                history.shift();
              }
            }
          }
        } catch (err) {
          const responseTime = Date.now() - requestStart;
          logger.error(
            `Error fetching data from ${oracle}`,
            err instanceof Error ? err : new Error(String(err))
          );

          // 记录失败
          if (enablePerformanceMetrics) {
            metricsCalculatorRef.current.addPriceData(
              oracle as OracleProvider,
              baseSymbol,
              {
                provider: oracle as OracleProvider,
                symbol: baseSymbol,
                price: 0,
                timestamp: Date.now(),
              },
              responseTime,
              false
            );

            if (!priceHistoryMapRef.current.has(oracle as OracleProvider)) {
              priceHistoryMapRef.current.set(oracle as OracleProvider, []);
            }
            const history = priceHistoryMapRef.current.get(oracle as OracleProvider)!;
            history.push({
              price: 0,
              timestamp: Date.now(),
              responseTime,
              success: false,
              source: 'error',
            });
          }
          // 继续处理其他预言机，不中断整个流程
        }
      });

      await Promise.all(fetchPromises);

      if (isMountedRef.current) {
        setPriceData(prices);
        setHistoricalData(histories);
        setLastUpdated(new Date());

        // 计算性能指标
        if (enablePerformanceMetrics) {
          calculatePerformanceMetrics();
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to fetch price data', error);
      if (isMountedRef.current) {
        setError(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    selectedOracles,
    selectedSymbol,
    timeRange,
    getHoursForTimeRange,
    enablePerformanceMetrics,
    calculatePerformanceMetrics,
  ]);

  // 初始加载和数据变化时自动获取
  useEffect(() => {
    isMountedRef.current = true;
    fetchPriceData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPriceData]);

  // 自动刷新
  useEffect(() => {
    if (refreshInterval === 0) return;

    const intervalId = setInterval(() => {
      fetchPriceData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchPriceData]);

  return {
    priceData,
    historicalData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData,
    refreshInterval,
    setRefreshInterval,
    // 性能指标相关
    performanceMetrics,
    isCalculatingMetrics,
  };
}

export default useOracleData;
