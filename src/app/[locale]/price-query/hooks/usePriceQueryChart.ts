'use client';

import { useMemo, useRef } from 'react';

import { type PriceData } from '@/lib/oracles';

import { type QueryResult, providerNames, chainNames } from '../constants';

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

export interface UsePriceQueryChartParams {
  historicalData: Partial<Record<string, PriceData[]>>;
  queryResults: QueryResult[];
  selectedTimeRange: number;
  isCompareMode: boolean;
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  compareQueryResults: QueryResult[];
  compareTimeRange: number;
}

export interface UsePriceQueryChartReturn {
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

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (selectedTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (selectedTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    const lastValidValues: Record<string, number> = {};

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };

      queryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const map = historyMaps[key];
        const price = map?.get(timestamp);
        const label = `${providerNames[provider]} (${chainNames[chain]})`;

        if (price !== undefined) {
          lastValidValues[label] = price;
          dataPoint[label] = price;
        } else if (lastValidValues[label] !== undefined) {
          dataPoint[label] = lastValidValues[label];
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

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (compareTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (compareTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
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
