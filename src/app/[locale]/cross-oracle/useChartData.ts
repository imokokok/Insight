import { useMemo, useCallback } from 'react';

import { lttbDownsample } from '@/lib/utils/lttb';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { getMaxPointsForTimeRange, getOracleChartColors } from './chartConfig';
import { oracleNames, type TimeRange } from './constants';

import type {
  ChartDataResult,
  ChartDataPoint,
  OraclePriceSeries,
  PriceDeviationDataPoint,
  OraclePriceData,
  OraclePriceHistory,
  OraclePerformanceData,
} from './types/index';

export function useChartData(
  historicalData: Partial<Record<OracleProvider, PriceData[]>>,
  selectedOracles: OracleProvider[],
  timeRange: TimeRange,
  useAccessibleColors: boolean,
  validPrices: number[],
  avgPrice: number
): ChartDataResult {
  const oracleChartColors: Record<OracleProvider, string> = useMemo(() => {
    return getOracleChartColors(useAccessibleColors);
  }, [useAccessibleColors]);

  const getChartData = useCallback((): ChartDataPoint[] => {
    if (Object.keys(historicalData).length === 0) return [];

    const maxPoints = getMaxPointsForTimeRange(timeRange);
    const downsampledData: Partial<Record<OracleProvider, PriceData[]>> = {};

    selectedOracles.forEach((oracle) => {
      const data = historicalData[oracle];
      if (data && data.length > maxPoints) {
        downsampledData[oracle] = lttbDownsample(
          data.map((d) => ({ timestamp: d.timestamp, price: d.price })),
          maxPoints
        ).map((d) => ({ ...d, provider: oracle, confidence: 1 }) as PriceData);
      } else {
        downsampledData[oracle] = data || [];
      }
    });

    const timestamps = new Set<number>();
    Object.values(downsampledData).forEach((history) => {
      history?.forEach((data) => timestamps.add(data.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const point: ChartDataPoint = {
        timestamp: new Date(timestamp).toLocaleTimeString(),
        fullTimestamp: new Date(timestamp),
        rawTimestamp: timestamp,
      };
      const pricesAtTime: number[] = [];

      selectedOracles.forEach((oracle) => {
        const dataPoint = downsampledData[oracle]?.find((d) => d.timestamp === timestamp);
        if (dataPoint) {
          point[oracleNames[oracle]] = dataPoint.price;
          pricesAtTime.push(dataPoint.price);
        }
      });

      if (pricesAtTime.length > 0) {
        const avg = pricesAtTime.reduce((a, b) => a + b, 0) / pricesAtTime.length;
        const variance =
          pricesAtTime.length > 1
            ? pricesAtTime.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pricesAtTime.length
            : 0;
        const stdDev = Math.sqrt(variance);
        point.avgPrice = avg;
        point.stdDev = stdDev;
        point.upperBound1 = avg + stdDev;
        point.lowerBound1 = avg - stdDev;
        point.upperBound2 = avg + stdDev * 2;
        point.lowerBound2 = avg - stdDev * 2;
        point.oracleCount = pricesAtTime.length;
      }
      return point;
    });
  }, [historicalData, selectedOracles, timeRange]);

  const heatmapData = useMemo((): PriceDeviationDataPoint[] => {
    const result: PriceDeviationDataPoint[] = [];
    const chartDataPoints = getChartData();
    chartDataPoints.forEach((point) => {
      const avgPriceVal = point.avgPrice as number | undefined;
      if (!avgPriceVal) return;
      selectedOracles.forEach((oracle) => {
        const price = point[oracleNames[oracle]] as number | undefined;
        if (price !== undefined) {
          const deviationPercent = ((price - avgPriceVal) / avgPriceVal) * 100;
          result.push({
            timestamp: point.rawTimestamp as number,
            oracleName: oracleNames[oracle],
            deviationPercent,
            price,
          });
        }
      });
    });
    return result;
  }, [historicalData, selectedOracles, avgPrice, getChartData]);

  const boxPlotData = useMemo((): OraclePriceData[] => {
    return selectedOracles.map((oracle) => ({
      oracleId: oracle,
      prices: (historicalData[oracle] || []).map((d) => d.price),
    }));
  }, [historicalData, selectedOracles]);

  const volatilityData = useMemo((): OraclePriceHistory[] => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const correlationData = useMemo((): OraclePriceSeries[] => {
    return selectedOracles.map((oracle) => ({
      oracleId: oracle,
      data: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const latencyData = useMemo((): number[] => {
    const latencies: number[] = [];
    selectedOracles.forEach((oracle) => {
      const history = historicalData[oracle] || [];
      for (let i = 1; i < history.length; i++) {
        const timeDiff = history[i].timestamp - history[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 3600000) {
          latencies.push(timeDiff);
        }
      }
    });
    return latencies.length > 0
      ? latencies
      : [150, 180, 200, 220, 250, 280, 300, 320, 350, 400, 450, 500];
  }, [historicalData, selectedOracles]);

  const performanceData = useMemo((): OraclePerformanceData[] => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      const prices = history.map((d) => d.price);
      const mean = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const variance =
        prices.length > 1
          ? prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
          : 0;
      const stdDev = Math.sqrt(variance);
      const stability = mean > 0 ? Math.max(0, 100 - (stdDev / mean) * 1000) : 50;

      const latencies: number[] = [];
      for (let i = 1; i < history.length; i++) {
        const timeDiff = history[i].timestamp - history[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 3600000) {
          latencies.push(timeDiff);
        }
      }
      const avgLatency =
        latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 200;

      const avgPriceVal =
        validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
      const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
      const priceDeviation =
        avgPriceVal > 0 ? Math.abs((currentPrice - avgPriceVal) / avgPriceVal) : 0;
      const accuracy = Math.max(90, Math.min(99.9, 100 - priceDeviation * 100));

      return {
        provider: oracle,
        name: oracleNames[oracle],
        responseTime: Math.round(avgLatency),
        accuracy: accuracy,
        stability: Math.min(100, Math.max(0, stability)),
        dataSources: 0,
        supportedChains: 0,
        color: oracleChartColors[oracle],
      };
    });
  }, [historicalData, selectedOracles, validPrices, oracleChartColors]);

  return {
    oracleChartColors,
    getChartData,
    heatmapData,
    boxPlotData,
    volatilityData,
    correlationData,
    latencyData,
    performanceData,
  };
}
