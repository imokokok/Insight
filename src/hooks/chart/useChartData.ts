/**
 * 图表数据处理 Hook
 */

import { useMemo, useCallback } from 'react';

export interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  [key: string]: number | string | undefined;
}

export interface UseChartDataOptions {
  data: ChartDataPoint[];
  maxPoints?: number;
  preservePeaks?: boolean;
}

export function useChartData(options: UseChartDataOptions) {
  const { data, maxPoints = 500, preservePeaks = true } = options;

  // 数据降采样
  const downsampledData = useMemo(() => {
    if (data.length <= maxPoints) return data;

    const ratio = Math.ceil(data.length / maxPoints);
    const result: ChartDataPoint[] = [];

    for (let i = 0; i < data.length; i += ratio) {
      const chunk = data.slice(i, Math.min(i + ratio, data.length));
      
      if (preservePeaks) {
        // 保留峰值和趋势特征
        const maxPrice = Math.max(...chunk.map(d => d.price));
        const minPrice = Math.min(...chunk.map(d => d.price));
        const maxPoint = chunk.find(d => d.price === maxPrice) || chunk[0];
        const minPoint = chunk.find(d => d.price === minPrice) || chunk[0];
        
        // 按时间排序后添加
        const points = [chunk[0], maxPoint, minPoint, chunk[chunk.length - 1]]
          .sort((a, b) => a.timestamp - b.timestamp);
        
        // 去重
        const uniquePoints = points.filter((p, idx, arr) => 
          idx === 0 || p.timestamp !== arr[idx - 1].timestamp
        );
        
        result.push(...uniquePoints);
      } else {
        // 简单采样：取每段的平均值
        const avgPrice = chunk.reduce((sum, d) => sum + d.price, 0) / chunk.length;
        const avgVolume = chunk.reduce((sum, d) => sum + d.volume, 0) / chunk.length;
        
        result.push({
          ...chunk[0],
          price: avgPrice,
          volume: avgVolume,
        });
      }
    }

    return result;
  }, [data, maxPoints, preservePeaks]);

  // 计算价格范围
  const priceRange = useMemo(() => {
    if (downsampledData.length === 0) return { min: 0, max: 100 };
    
    const prices = downsampledData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    
    return { min: min - padding, max: max + padding };
  }, [downsampledData]);

  // 计算成交量范围
  const volumeRange = useMemo(() => {
    if (downsampledData.length === 0) return { min: 0, max: 1000000 };
    
    const volumes = downsampledData.map(d => d.volume);
    const max = Math.max(...volumes);
    
    return { min: 0, max: max * 3 };
  }, [downsampledData]);

  // 计算价格变化
  const priceChange = useMemo(() => {
    if (downsampledData.length < 2) return { value: 0, percent: 0 };
    
    const first = downsampledData[0].price;
    const last = downsampledData[downsampledData.length - 1].price;
    const change = last - first;
    const percent = (change / first) * 100;
    
    return { value: change, percent };
  }, [downsampledData]);

  // 格式化时间标签
  const formatTimeLabel = useCallback((timestamp: number, timeRange: string): string => {
    const date = new Date(timestamp);
    
    switch (timeRange) {
      case '1H':
      case '24H':
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      case '7D':
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit' });
      default:
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  }, []);

  return {
    data: downsampledData,
    priceRange,
    volumeRange,
    priceChange,
    formatTimeLabel,
    dataCount: downsampledData.length,
    originalCount: data.length,
  };
}
