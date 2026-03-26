'use client';

import { useMemo } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { chartColors } from '@/lib/config/colors';
import { calculateATR, type OHLCVDataPoint } from '@/lib/indicators';

export interface ATRDataPoint {
  time: string;
  timestamp: number;
  atr: number;
  tr?: number;
}

export interface ATRIndicatorProps {
  data: Array<{
    time: string;
    timestamp: number;
    price: number;
    high?: number;
    low?: number;
    close?: number;
  }>;
  period?: number;
  height?: number;
}

export function ATRIndicator({ data, period = 14, height = 200 }: ATRIndicatorProps) {
  const atrData = useMemo<ATRDataPoint[]>(() => {
    const priceData: OHLCVDataPoint[] = data.map((point) => ({
      price: point.price,
      high: point.high,
      low: point.low,
      close: point.close,
      timestamp: point.timestamp,
    }));
    const { atr, tr } = calculateATR(priceData, period);
    return data.map((point, index) => ({
      time: point.time,
      timestamp: point.timestamp,
      atr: atr[index] || 0,
      tr: tr[index],
    }));
  }, [data, period]);

  const currentATR = atrData.length > 0 ? atrData[atrData.length - 1].atr : 0;

  const stats = useMemo(() => {
    const atrValues = atrData.map((d) => d.atr).filter((v) => !isNaN(v) && v > 0);
    if (atrValues.length === 0) return { max: 0, min: 0, avg: 0 };
    return {
      max: Math.max(...atrValues),
      min: Math.min(...atrValues),
      avg: atrValues.reduce((sum, v) => sum + v, 0) / atrValues.length,
    };
  }, [atrData]);

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div>
        <span className="text-sm font-medium text-gray-700">ATR 平均真实波幅</span>
        <span className="ml-2 text-xs text-gray-400">({period}日)</span>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
          <span>最高: {stats.max.toFixed(4)}</span>
          <span>最低: {stats.min.toFixed(4)}</span>
          <span>平均: {stats.avg.toFixed(4)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-700">{currentATR.toFixed(4)}</span>
      </div>
    </div>
  );

  return (
    <DashboardCard title="" headerAction={headerContent}>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={atrData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const atr = payload[0].value as number;
                return (
                  <div className="bg-white border border-gray-200 p-2">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-primary-600">ATR: {atr.toFixed(4)}</p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="atr"
              stroke={chartColors.recharts.primary}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: chartColors.recharts.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-primary-100 border border-primary-300 rounded" />
          <span>ATR 平均真实波幅</span>
        </div>
      </div>
    </DashboardCard>
  );
}
