/**
 * @fileoverview 图表配置 Hook
 * @description 准备图表数据、计算统计指标、管理图表颜色配置
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { OracleProvider, PriceData } from '@/types/oracle';
import { chartColors } from '@/lib/config/colors';
import { oracleNames, type TimeRange } from '../constants';
import type {
  ChartDataPoint,
  HistoryMinMax,
  UseChartConfigReturn,
} from '../types/index';

interface UseChartConfigOptions {
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  selectedOracles: OracleProvider[];
  timeRange: TimeRange;
  useAccessibleColors: boolean;
  validPrices: number[];
  avgPrice: number;
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

export function useChartConfig({
  historicalData,
  selectedOracles,
  timeRange,
  useAccessibleColors,
  validPrices,
  avgPrice,
}: UseChartConfigOptions): UseChartConfigReturn {
  const [historyMinMax, setHistoryMinMax] = useState<HistoryMinMax>(initialHistoryMinMax);

  // 计算图表颜色配置
  const oracleChartColors = useMemo(() => {
    const colors: Record<OracleProvider, string> = {} as Record<OracleProvider, string>;
    selectedOracles.forEach((oracle, index) => {
      if (useAccessibleColors) {
        // 使用色盲友好的颜色
        const accessiblePalette = ['#0066CC', '#FF6600', '#009900', '#CC0000', '#6600CC', '#CC9900'];
        colors[oracle] = accessiblePalette[index % accessiblePalette.length];
      } else {
        colors[oracle] = chartColors.oracle[oracle as keyof typeof chartColors.oracle] || '#888888';
      }
    });
    return colors;
  }, [selectedOracles, useAccessibleColors]);

  // 生成图表数据
  const getChartData = useCallback((): ChartDataPoint[] => {
    const dataMap = new Map<number, ChartDataPoint>();

    // 收集所有时间点
    selectedOracles.forEach((oracle) => {
      const history = historicalData[oracle] || [];
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

    // 转换为数组并排序
    const sortedData = Array.from(dataMap.values()).sort(
      (a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0)
    );

    // 计算统计值
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
  }, [historicalData, selectedOracles]);

  // 生成热力图数据
  const heatmapData = useMemo(() => {
    const data: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[] = [];
    
    selectedOracles.forEach((oracle) => {
      const history = historicalData[oracle] || [];
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
  }, [historicalData, selectedOracles, avgPrice]);

  // 生成箱线图数据
  const boxPlotData = useMemo(() => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracleId: oracleNames[oracle],
        prices: history.map((h) => h.price),
      };
    });
  }, [historicalData, selectedOracles]);

  // 生成波动率数据
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

  // 模拟延迟数据
  const latencyData = useMemo(() => {
    // 生成模拟延迟数据
    return [150, 180, 200, 220, 250, 280, 300, 320, 350, 400, 450, 500];
  }, []);

  // 生成性能数据
  const performanceData = useMemo(() => {
    return selectedOracles.map((oracle, index) => {
      const history = historicalData[oracle] || [];
      const prices = history.map((h) => h.price);
      
      // 计算响应时间（模拟）
      const responseTime = 150 + index * 50;
      
      // 计算准确率（基于数据完整性）
      const accuracy = prices.length > 0 ? Math.min(95 + Math.random() * 5, 99.9) : 0;
      
      // 计算稳定性（基于价格波动）
      const stability = prices.length > 1 
        ? Math.max(80, 100 - (calculateStdDev(prices) / avgPrice) * 100)
        : 0;

      return {
        provider: oracle,
        name: oracleNames[oracle],
        responseTime,
        accuracy,
        stability,
        color: oracleChartColors[oracle],
      };
    });
  }, [selectedOracles, historicalData, oracleChartColors, avgPrice]);

  // 更新历史极值
  useEffect(() => {
    if (validPrices.length === 0) return;

    const currentAvg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    const currentMax = Math.max(...validPrices);
    const currentMin = Math.min(...validPrices);
    const currentRange = currentMax - currentMin;

    setHistoryMinMax((prev: HistoryMinMax) => ({
      avgPrice: {
        min: Math.min(prev.avgPrice.min, currentAvg),
        max: Math.max(prev.avgPrice.max, currentAvg),
      },
      maxPrice: {
        min: Math.min(prev.maxPrice.min, currentMax),
        max: Math.max(prev.maxPrice.max, currentMax),
      },
      minPrice: {
        min: Math.min(prev.minPrice.min, currentMin),
        max: Math.max(prev.minPrice.max, currentMin),
      },
      priceRange: {
        min: Math.min(prev.priceRange.min, currentRange),
        max: Math.max(prev.priceRange.max, currentRange),
      },
      weightedAvgPrice: prev.weightedAvgPrice,
      standardDeviationPercent: prev.standardDeviationPercent,
      variance: prev.variance,
    }));
  }, [validPrices]);

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

export default useChartConfig;
