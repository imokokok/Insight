/**
 * @fileoverview 预言机数据获取 Hook
 * @description 负责价格数据获取、加载状态管理和自动刷新
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleClients, type TimeRange, type RefreshInterval, type PriceOracleProvider } from '../constants';

import type { UseOracleDataReturn } from '../types/index';

const logger = createLogger('useOracleData');

interface UseOracleDataOptions {
  selectedOracles: PriceOracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;
  initialRefreshInterval?: RefreshInterval;
}

export function useOracleData({
  selectedOracles,
  selectedSymbol,
  timeRange,
  initialRefreshInterval = 0,
}: UseOracleDataOptions): UseOracleDataReturn {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<OracleProvider, PriceData[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(initialRefreshInterval);

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
        try {
          const client = oracleClients[oracle];
          const [price, history] = await Promise.all([
            client.getPrice(baseSymbol),
            client.getHistoricalPrices(baseSymbol, undefined, hours),
          ]);

          if (isMountedRef.current) {
            prices.push(price);
            histories[oracle] = history;
          }
        } catch (err) {
          logger.error(
            `Error fetching data from ${oracle}`,
            err instanceof Error ? err : new Error(String(err))
          );
          // 继续处理其他预言机，不中断整个流程
        }
      });

      await Promise.all(fetchPromises);

      if (isMountedRef.current) {
        setPriceData(prices);
        setHistoricalData(histories);
        setLastUpdated(new Date());
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
  }, [selectedOracles, selectedSymbol, timeRange, getHoursForTimeRange]);

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
  };
}

export default useOracleData;
