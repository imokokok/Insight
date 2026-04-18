/**
 * @fileoverview 图表配置 Hook
 * @description 准备图表数据、计算统计指标、管理图表颜色配置
 */

import { useCallback, useMemo } from 'react';

import { chartColors } from '@/lib/config/colors';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import { safeMax, safeMin } from '@/lib/utils/statistics';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames, type TimeRange } from '../constants';

import type {
  ChartDataPoint,
  HistoryMinMax,
  UseChartConfigReturn,
  PriceDeviationDataPoint,
} from '../types/index';

interface UseChartConfigOptions {
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  selectedOracles: OracleProvider[];
  timeRange: TimeRange;
  useAccessibleColors: boolean;
  validPrices: number[];
  avgPrice: number;
  performanceMetrics: CalculatedPerformanceMetrics[];
  currentTime?: number;
}

const initialHistoryMinMax: HistoryMinMax = {
  avgPrice: { min: Infinity, max: -Infinity },
  weightedAvgPrice: { min: Infinity, max: -Infinity },
  maxPrice: { min: Infinity, max: -Infinity },
  minPrice: { min: Infinity, max: -Infinity },
  priceRange: { min: Infinity, max: -Infinity },
  standardDeviationPercent: { min: Infinity, max: -Infinity },
  variance: { min: Infinity, max: -Infinity },
};

function timeRangeToHours(range: TimeRange): number {
  const map: Record<TimeRange, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 7 * 24,
    '30d': 30 * 24,
    '90d': 90 * 24,
    '1y': 365 * 24,
  };
  return map[range];
}

export function useChartConfig({
  historicalData,
  selectedOracles,
  timeRange,
  useAccessibleColors,
  validPrices,
  avgPrice,
  performanceMetrics,
  currentTime,
}: UseChartConfigOptions): UseChartConfigReturn {
  const stableCurrentTime = currentTime ?? Date.now();

  // 计算图表颜色配置
  const oracleChartColors = useMemo(() => {
    const colors: Record<OracleProvider, string> = {} as Record<OracleProvider, string>;
    selectedOracles.forEach((oracle, index) => {
      if (useAccessibleColors) {
        // 使用色盲友好的颜色
        const accessiblePalette = [
          '#0066CC',
          '#FF6600',
          '#009900',
          '#CC0000',
          '#6600CC',
          '#CC9900',
        ];
        colors[oracle] = accessiblePalette[index % accessiblePalette.length];
      } else {
        colors[oracle] = chartColors.oracle[oracle as keyof typeof chartColors.oracle] || '#888888';
      }
    });
    return colors;
  }, [selectedOracles, useAccessibleColors]);

  // 生成图表数据
  const chartData = useMemo((): ChartDataPoint[] => {
    const now = stableCurrentTime;
    const cutoff = now - timeRangeToHours(timeRange) * 3600 * 1000;
    const dataMap = new Map<number, ChartDataPoint>();

    selectedOracles.forEach((oracle) => {
      const history = (historicalData[oracle] || []).filter((item) => item.timestamp >= cutoff);
      history.forEach((item) => {
        if (!dataMap.has(item.timestamp)) {
          dataMap.set(item.timestamp, {
            timestamp: new Date(item.timestamp).toLocaleTimeString(),
            rawTimestamp: item.timestamp,
            fullTimestamp: new Date(item.timestamp),
          });
        }
        const point = dataMap.get(item.timestamp)!;
        point[oracleNames[oracle]] = item.price;
      });
    });

    const sortedData = Array.from(dataMap.values()).sort(
      (a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0)
    );

    return sortedData.map((point) => {
      const prices: number[] = [];
      selectedOracles.forEach((oracle) => {
        const price = point[oracleNames[oracle]] as number | undefined;
        if (price && price > 0) {
          prices.push(price);
        }
      });

      if (prices.length > 0) {
        const pointAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance =
          prices.reduce((sum, p) => sum + Math.pow(p - pointAvg, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);

        point.avgPrice = pointAvg;
        point.stdDev = stdDev;
        point.upperBound1 = pointAvg + stdDev;
        point.lowerBound1 = pointAvg - stdDev;
        point.upperBound2 = pointAvg + stdDev * 2;
        point.lowerBound2 = pointAvg - stdDev * 2;
        point.oracleCount = prices.length;
      }

      return point;
    });
  }, [historicalData, selectedOracles, timeRange, stableCurrentTime]);

  const getChartData = useCallback((): ChartDataPoint[] => chartData, [chartData]);
  const heatmapData = useMemo(() => {
    const now = stableCurrentTime;
    const cutoff = now - timeRangeToHours(timeRange) * 3600 * 1000;
    const data: PriceDeviationDataPoint[] = [];

    selectedOracles.forEach((oracle) => {
      const history = (historicalData[oracle] || []).filter((item) => item.timestamp >= cutoff);
      history.forEach((item) => {
        const deviation = avgPrice > 0 ? ((item.price - avgPrice) / avgPrice) * 100 : 0;
        data.push({
          oracleName: oracleNames[oracle],
          timestamp: item.timestamp,
          deviationPercent: deviation,
          price: item.price,
        });
      });
    });

    return data;
  }, [historicalData, selectedOracles, avgPrice, timeRange, stableCurrentTime]);
  const boxPlotData = useMemo(() => {
    const now = stableCurrentTime;
    const cutoff = now - timeRangeToHours(timeRange) * 3600 * 1000;
    return selectedOracles.map((oracle) => {
      const history = (historicalData[oracle] || []).filter((item) => item.timestamp >= cutoff);
      return {
        oracleId: oracleNames[oracle],
        prices: history.map((h) => h.price),
      };
    });
  }, [historicalData, selectedOracles, timeRange, stableCurrentTime]);
  const volatilityData = useMemo(() => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracle,
        prices: history.map((h) => ({
          timestamp: h.timestamp,
          price: h.price,
        })),
      };
    });
  }, [historicalData, selectedOracles]);

  // 生成相关性数据
  const correlationData = useMemo(() => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracleId: oracleNames[oracle],
        data: history.map((h) => ({
          timestamp: h.timestamp,
          price: h.price,
        })),
      };
    });
  }, [historicalData, selectedOracles]);

  const latencyData = useMemo(() => {
    if (performanceMetrics.length === 0) {
      return [];
    }
    return performanceMetrics.map((metric) => metric.responseTime);
  }, [performanceMetrics]);

  // 生成性能数据
  const performanceData = useMemo(() => {
    const metricsMap = new Map(performanceMetrics.map((m) => [m.provider, m]));

    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      const prices = history.map((h) => h.price);
      const metric = metricsMap.get(oracle);

      const responseTime = metric?.responseTime ?? 0;
      const accuracy = metric?.accuracy ?? (prices.length > 0 ? 95 : 0);
      const stability =
        prices.length > 1 ? Math.max(80, 100 - (calculateStdDev(prices) / avgPrice) * 100) : 0;

      return {
        provider: oracle,
        name: oracleNames[oracle],
        responseTime,
        accuracy,
        stability,
        color: oracleChartColors[oracle],
      };
    });
  }, [selectedOracles, historicalData, oracleChartColors, avgPrice, performanceMetrics]);

  // 计算历史极值
  const historyMinMax = useMemo((): HistoryMinMax => {
    if (validPrices.length === 0) {
      return initialHistoryMinMax;
    }

    const currentAvg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    const currentMax = safeMax(validPrices);
    const currentMin = safeMin(validPrices);
    const currentRange = currentMax - currentMin;

    let histAvgMin = currentAvg;
    let histAvgMax = currentAvg;
    let histWavgMin = Infinity;
    let histWavgMax = -Infinity;
    let histMaxMin = currentMax;
    let histMaxMax = currentMax;
    let histMinMax = currentMin;
    let histMinMax2 = currentMin;
    let histRangeMin = currentRange;
    let histRangeMax = currentRange;
    let histStdDevPctMin = Infinity;
    let histStdDevPctMax = -Infinity;
    let histVarMin = Infinity;
    let histVarMax = -Infinity;

    selectedOracles.forEach((oracle) => {
      const history = historicalData[oracle] || [];
      if (history.length === 0) return;

      const prices = history.map((h) => h.price).filter((p) => p > 0);
      if (prices.length === 0) return;

      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      histAvgMin = Math.min(histAvgMin, avg);
      histAvgMax = Math.max(histAvgMax, avg);

      const wavgData = history.filter((h) => h.price > 0);
      if (wavgData.length > 0) {
        let sumWeighted = 0;
        let sumWeights = 0;
        wavgData.forEach((h) => {
          const weight = h.confidence ?? 1;
          sumWeighted += h.price * weight;
          sumWeights += weight;
        });
        const wavg = sumWeights > 0 ? sumWeighted / sumWeights : avg;
        histWavgMin = Math.min(histWavgMin, wavg);
        histWavgMax = Math.max(histWavgMax, wavg);
      }

      const max = safeMax(prices);
      const min = safeMin(prices);
      histMaxMin = Math.min(histMaxMin, max);
      histMaxMax = Math.max(histMaxMax, max);
      histMinMax = Math.min(histMinMax, min);
      histMinMax2 = Math.max(histMinMax2, min);

      const range = max - min;
      histRangeMin = Math.min(histRangeMin, range);
      histRangeMax = Math.max(histRangeMax, range);

      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
      histVarMin = Math.min(histVarMin, variance);
      histVarMax = Math.max(histVarMax, variance);

      const stdDev = Math.sqrt(variance);
      const stdDevPct = avg > 0 ? (stdDev / avg) * 100 : 0;
      histStdDevPctMin = Math.min(histStdDevPctMin, stdDevPct);
      histStdDevPctMax = Math.max(histStdDevPctMax, stdDevPct);
    });

    return {
      avgPrice: { min: histAvgMin, max: histAvgMax },
      weightedAvgPrice: {
        min: histWavgMin === Infinity ? currentAvg : histWavgMin,
        max: histWavgMax === -Infinity ? currentAvg : histWavgMax,
      },
      maxPrice: { min: histMaxMin, max: histMaxMax },
      minPrice: { min: histMinMax, max: histMinMax2 },
      priceRange: { min: histRangeMin, max: histRangeMax },
      standardDeviationPercent: {
        min: histStdDevPctMin === Infinity ? 0 : histStdDevPctMin,
        max: histStdDevPctMax === -Infinity ? 0 : histStdDevPctMax,
      },
      variance: {
        min: histVarMin === Infinity ? 0 : histVarMin,
        max: histVarMax === -Infinity ? 0 : histVarMax,
      },
    };
  }, [validPrices, historicalData, selectedOracles]);

  return {
    oracleChartColors,
    getChartData,
    heatmapData,
    boxPlotData,
    volatilityData,
    correlationData,
    latencyData,
    performanceData,
    historyMinMax,
  };
}

// 辅助函数：计算标准差
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
