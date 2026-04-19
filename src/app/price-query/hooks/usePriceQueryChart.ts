'use client';

import { useMemo, useRef } from 'react';

import { formatTimeString, formatDateString } from '@/lib/utils/format';
import { type PriceData } from '@/types/oracle';

import { type QueryResult, type ChartDataPoint, providerNames, chainNames } from '../constants';

export type { ChartDataPoint };

interface UsePriceQueryChartParams {
  historicalData: Partial<Record<string, PriceData[]>>;
  queryResults: QueryResult[];
  selectedTimeRange: number;
  isCompareMode: boolean;
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  compareQueryResults: QueryResult[];
  compareTimeRange: number;
}

interface UsePriceQueryChartReturn {
  chartData: ChartDataPoint[];
  compareChartData: ChartDataPoint[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function usePriceQueryChart(params: UsePriceQueryChartParams): UsePriceQueryChartReturn {
  const {
    historicalData,
    queryResults,
    selectedTimeRange,
    isCompareMode,
    compareHistoricalData,
    compareQueryResults,
    compareTimeRange,
  } = params;

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (Object.keys(historicalData).length === 0) return [];

    const timestamps = new Set<number>();
    const historyMaps: Record<string, Map<number, number>> = {};

    Object.entries(historicalData).forEach(([key, history]) => {
      const map = new Map<number, number>();
      history?.forEach((price) => {
        timestamps.add(price.timestamp);
        map.set(price.timestamp, price.price);
      });
      historyMaps[key] = map;
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getFormattedTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      if (selectedTimeRange <= 6) {
        return formatTimeString(date, false);
      } else if (selectedTimeRange <= 24) {
        return `${formatDateString(date, 'medium')} ${formatTimeString(date, false)}`;
      } else {
        return formatDateString(date, 'medium');
      }
    };

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: getFormattedTime(timestamp),
      };

      queryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const map = historyMaps[key];
        const price = map?.get(timestamp);
        const label = `${providerNames[provider]} (${chainNames[chain]})`;

        if (price !== undefined) {
          dataPoint[label] = price;
        } else {
          dataPoint[label] = null;
        }
      });

      return dataPoint;
    });
  }, [historicalData, queryResults, selectedTimeRange]);

  const compareChartData = useMemo((): ChartDataPoint[] => {
    if (!isCompareMode || Object.keys(compareHistoricalData).length === 0) return [];

    const timestamps = new Set<number>();
    const compareHistoryMaps: Record<string, Map<number, number>> = {};

    Object.entries(compareHistoricalData).forEach(([key, history]) => {
      const map = new Map<number, number>();
      history?.forEach((price) => {
        timestamps.add(price.timestamp);
        map.set(price.timestamp, price.price);
      });
      compareHistoryMaps[key] = map;
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getCompareFormattedTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      if (compareTimeRange <= 6) {
        return formatTimeString(date, false);
      } else if (compareTimeRange <= 24) {
        return `${formatDateString(date, 'medium')} ${formatTimeString(date, false)}`;
      } else {
        return formatDateString(date, 'medium');
      }
    };

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: getCompareFormattedTime(timestamp),
      };

      compareQueryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const map = compareHistoryMaps[key];
        const price = map?.get(timestamp);
        if (price !== undefined) {
          const label = `${providerNames[provider]} (${chainNames[chain]})`;
          dataPoint[label] = price;
        }
      });

      return dataPoint;
    });
  }, [compareHistoricalData, compareQueryResults, compareTimeRange, isCompareMode]);

  return {
    chartData,
    compareChartData,
    chartContainerRef,
  };
}
