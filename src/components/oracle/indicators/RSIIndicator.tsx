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
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { chartColors } from '@/lib/config/colors';
import { calculateRSIFromData } from '@/lib/indicators';


export interface RSIDataPoint {
  time: string;
  timestamp: number;
  rsi: number;
}

export interface RSIIndicatorProps {
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

export function RSIIndicator({ data, period = 14, height = 200 }: RSIIndicatorProps) {
  const rsiData = useMemo<RSIDataPoint[]>(() => {
    const rsiValues = calculateRSIFromData(data, period);
    return data.map((point, index) => ({
      time: point.time,
      timestamp: point.timestamp,
      rsi: rsiValues[index],
    }));
  }, [data, period]);

  const currentRSI = rsiData.length > 0 ? rsiData[rsiData.length - 1].rsi : 50;
  const isOverbought = currentRSI > 70;
  const isOversold = currentRSI < 30;

  const stats = useMemo(() => {
    const rsiValues = rsiData.map((d) => d.rsi);
    return {
      max: Math.max(...rsiValues),
      min: Math.min(...rsiValues),
      avg: rsiValues.reduce((sum, v) => sum + v, 0) / rsiValues.length,
    };
  }, [rsiData]);

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div>
        <span className="text-sm font-medium text-gray-700">RSI 相对强弱指标</span>
        <span className="ml-2 text-xs text-gray-400">({period}日)</span>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
          <span>最高: {stats.max.toFixed(2)}</span>
          <span>最低: {stats.min.toFixed(2)}</span>
          <span>平均: {stats.avg.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-lg font-bold ${
            isOverbought ? 'text-danger-500' : isOversold ? 'text-success-500' : 'text-gray-700'
          }`}
        >
          {currentRSI.toFixed(2)}
        </span>
        {isOverbought && (
          <span className="px-2 py-0.5 text-xs bg-danger-100 text-danger-700 rounded">超买</span>
        )}
        {isOversold && (
          <span className="px-2 py-0.5 text-xs bg-success-100 text-success-700 rounded">超卖</span>
        )}
      </div>
    </div>
  );

  return (
    <DashboardCard title="" headerAction={headerContent}>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rsiData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              minTickGap={30}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              ticks={[0, 30, 50, 70, 100]}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const rsi = payload[0].value as number;
                return (
                  <div className="bg-white border border-gray-200  p-2 ">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p
                      className={`text-sm font-bold ${
                        rsi > 70 ? 'text-danger-600' : rsi < 30 ? 'text-success-600' : 'text-primary-600'
                      }`}
                    >
                      RSI: {rsi.toFixed(2)}
                    </p>
                    {rsi > 70 && <p className="text-xs text-danger-500 mt-1">超买区域</p>}
                    {rsi < 30 && <p className="text-xs text-success-500 mt-1">超卖区域</p>}
                  </div>
                );
              }}
            />
            <ReferenceArea
              y1={70}
              y2={100}
              fill={chartColors.rsi.overbought.line}
              fillOpacity={0.1}
            />
            <ReferenceArea y1={0} y2={30} fill={chartColors.rsi.oversold.line} fillOpacity={0.1} />
            <ReferenceLine y={50} stroke={chartColors.rsi.neutral} strokeDasharray="3 3" />
            <ReferenceLine y={70} stroke={chartColors.rsi.overbought.line} strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke={chartColors.rsi.oversold.line} strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="rsi"
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
          <span className="w-3 h-3 bg-danger-100 border border-red-300 rounded" />
          <span>超买 (&gt;70)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-success-100 border border-green-300 rounded" />
          <span>超卖 (&lt;30)</span>
        </div>
      </div>
    </DashboardCard>
  );
}

export { calculateRSIFromData as calculateRSI };
