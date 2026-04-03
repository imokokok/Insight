'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CalculatedPerformanceMetrics,
  PerformanceMetricsCalculator,
  PriceHistoryEntry,
} from '@/lib/oracles/performanceMetricsCalculator';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('useCalculatedPerformanceMetrics');

export interface OraclePriceResult {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
  success: boolean;
  source?: string;
}

interface UseCalculatedPerformanceMetricsOptions {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  enabled?: boolean;
  recalculateInterval?: number;
}

interface UseCalculatedPerformanceMetricsReturn {
  metrics: CalculatedPerformanceMetrics[];
  isLoading: boolean;
  isCalculating: boolean;
  lastCalculated: Date | null;
  addPriceData: (result: OraclePriceResult) => void;
  addMultiplePriceData: (results: OraclePriceResult[]) => void;
  recalculateMetrics: () => void;
  getMetricsForProvider: (provider: OracleProvider) => CalculatedPerformanceMetrics | undefined;
  getAllProvidersData: () => Map<OracleProvider, PriceHistoryEntry[]>;
  clearHistory: () => void;
  stats: {
    totalDataPoints: number;
    providerCount: number;
  };
}

export function useCalculatedPerformanceMetrics({
  selectedSymbol,
  selectedOracles,
  enabled = true,
  recalculateInterval = 5000, // 默认每5秒重新计算一次
}: UseCalculatedPerformanceMetricsOptions): UseCalculatedPerformanceMetricsReturn {
  const calculatorRef = useRef<PerformanceMetricsCalculator>(
    new PerformanceMetricsCalculator()
  );

  const [metrics, setMetrics] = useState<CalculatedPerformanceMetrics[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0); // 用于触发重新计算

  const priceDataMapRef = useRef<Map<OracleProvider, PriceHistoryEntry[]>>(new Map());

  // 添加单个价格数据
  const addPriceData = useCallback(
    (result: OraclePriceResult) => {
      if (!enabled) return;

      const key = `${result.provider}-${selectedSymbol}`;

      // 添加到本地历史记录
      if (!priceDataMapRef.current.has(result.provider)) {
        priceDataMapRef.current.set(result.provider, []);
      }

      const history = priceDataMapRef.current.get(result.provider)!;
      history.push({
        price: result.price,
        timestamp: result.timestamp,
        responseTime: result.responseTime,
        success: result.success,
        source: result.source,
      });

      // 限制历史数据大小
      if (history.length > 1000) {
        history.shift();
      }

      // 添加到计算器
      const priceData: PriceData = {
        provider: result.provider,
        symbol: selectedSymbol,
        price: result.price,
        timestamp: result.timestamp,
        confidence: result.confidence,
        source: result.source,
      };

      calculatorRef.current.addPriceData(
        result.provider,
        selectedSymbol,
        priceData,
        result.responseTime,
        result.success
      );

      // 触发重新计算
      setDataVersion((prev) => prev + 1);

      logger.debug(`Added price data for ${result.provider}: ${result.price}`, {
        responseTime: result.responseTime,
        success: result.success,
      });
    },
    [enabled, selectedSymbol]
  );

  // 批量添加价格数据
  const addMultiplePriceData = useCallback(
    (results: OraclePriceResult[]) => {
      if (!enabled || results.length === 0) return;

      results.forEach((result) => {
        const key = `${result.provider}-${selectedSymbol}`;

        // 添加到本地历史记录
        if (!priceDataMapRef.current.has(result.provider)) {
          priceDataMapRef.current.set(result.provider, []);
        }

        const history = priceDataMapRef.current.get(result.provider)!;
        history.push({
          price: result.price,
          timestamp: result.timestamp,
          responseTime: result.responseTime,
          success: result.success,
          source: result.source,
        });

        // 限制历史数据大小
        if (history.length > 1000) {
          history.shift();
        }

        // 添加到计算器
        const priceData: PriceData = {
          provider: result.provider,
          symbol: selectedSymbol,
          price: result.price,
          timestamp: result.timestamp,
          confidence: result.confidence,
          source: result.source,
        };

        calculatorRef.current.addPriceData(
          result.provider,
          selectedSymbol,
          priceData,
          result.responseTime,
          result.success
        );
      });

      // 触发重新计算
      setDataVersion((prev) => prev + 1);

      logger.debug(`Added ${results.length} price data entries`);
    },
    [enabled, selectedSymbol]
  );

  // 重新计算指标
  const recalculateMetrics = useCallback(() => {
    if (!enabled || selectedOracles.length === 0) {
      setMetrics([]);
      return;
    }

    setIsCalculating(true);

    try {
      const newMetrics: CalculatedPerformanceMetrics[] = [];

      selectedOracles.forEach((provider) => {
        const providerMetrics = calculatorRef.current.calculateAllMetrics(
          provider,
          selectedSymbol,
          priceDataMapRef.current
        );
        newMetrics.push(providerMetrics);
      });

      setMetrics(newMetrics);
      setLastCalculated(new Date());

      logger.debug('Recalculated performance metrics', {
        count: newMetrics.length,
        providers: selectedOracles,
      });
    } catch (error) {
      logger.error(
        'Error calculating performance metrics',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsCalculating(false);
    }
  }, [enabled, selectedOracles, selectedSymbol]);

  // 获取特定预言机的指标
  const getMetricsForProvider = useCallback(
    (provider: OracleProvider): CalculatedPerformanceMetrics | undefined => {
      return metrics.find((m) => m.provider === provider);
    },
    [metrics]
  );

  // 获取所有预言机的数据
  const getAllProvidersData = useCallback((): Map<OracleProvider, PriceHistoryEntry[]> => {
    return priceDataMapRef.current;
  }, []);

  // 清除历史数据
  const clearHistory = useCallback(() => {
    calculatorRef.current = new PerformanceMetricsCalculator();
    priceDataMapRef.current = new Map();
    setMetrics([]);
    setLastCalculated(null);
    setDataVersion(0);
    logger.info('Cleared all performance metrics history');
  }, []);

  // 定时重新计算
  useEffect(() => {
    if (!enabled) return;

    recalculateMetrics();

    const intervalId = setInterval(() => {
      recalculateMetrics();
    }, recalculateInterval);

    return () => clearInterval(intervalId);
  }, [enabled, recalculateInterval, recalculateMetrics, dataVersion]);

  // 当选中的预言机或币种改变时，重新计算
  useEffect(() => {
    if (enabled) {
      recalculateMetrics();
    }
  }, [enabled, selectedOracles, selectedSymbol, recalculateMetrics]);

  // 计算统计数据
  const stats = useMemo(() => {
    const calculatorStats = calculatorRef.current.getStats();
    return {
      totalDataPoints: calculatorStats.totalEntries,
      providerCount: calculatorStats.providerCount,
    };
  }, [dataVersion]);

  // 是否正在加载（初始时没有数据）
  const isLoading = useMemo(() => {
    return metrics.length === 0 && stats.totalDataPoints === 0;
  }, [metrics, stats]);

  return {
    metrics,
    isLoading,
    isCalculating,
    lastCalculated,
    addPriceData,
    addMultiplePriceData,
    recalculateMetrics,
    getMetricsForProvider,
    getAllProvidersData,
    clearHistory,
    stats,
  };
}

export default useCalculatedPerformanceMetrics;
