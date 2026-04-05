'use client';

import { useMemo } from 'react';

import { TrendingUp as TrendingUpIcon } from 'lucide-react';

import { type PriceData } from '@/types/oracle';

import { SparklineMemo } from './Sparkline';

export interface MiniPriceChartProps {
  historicalData: PriceData[];
  currentPrice: PriceData | null;
  themeColor: string;
  labels?: {
    trend24h: string;
    before24h: string;
    now: string;
  };
}

export function MiniPriceChart({
  historicalData,
  currentPrice,
  labels = {
    trend24h: '24h Trend',
    before24h: '24h ago',
    now: 'Now',
  },
}: MiniPriceChartProps) {
  const chartData = useMemo(() => {
    if (historicalData.length >= 20) {
      return historicalData.slice(-20).map((d) => d.price);
    }
    const basePrice = currentPrice?.price || 100;
    return Array.from({ length: 20 }, (_, index) => {
      const seed = index * 0.1;
      return basePrice * (1 + Math.sin(seed) * 0.5 * 0.1);
    });
  }, [historicalData, currentPrice]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    return ((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100;
  }, [chartData]);

  const isPositive = priceChange >= 0;

  if (!chartData.length) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <TrendingUpIcon className="w-3.5 h-3.5" />
          <span>{labels.trend24h}</span>
        </div>
        <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}
          {priceChange.toFixed(2)}%
        </span>
      </div>
      <div className="flex-1 min-h-[80px] flex items-end">
        <SparklineMemo data={chartData} positive={isPositive} width={180} height={70} />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>{labels.before24h}</span>
        <span>{labels.now}</span>
      </div>
    </div>
  );
}
