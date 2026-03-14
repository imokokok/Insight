'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';

interface RSIDataPoint {
  time: string;
  timestamp: number;
  rsi: number;
}

interface RSIIndicatorProps {
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

function calculateRSI(
  data: Array<{ price: number; high?: number; low?: number; close?: number }>,
  period: number = 14
): number[] {
  if (data.length < period + 1) {
    return new Array(data.length).fill(50);
  }

  const closes = data.map((d) => d.close || d.price);
  const rsiValues: number[] = new Array(data.length).fill(50);

  let gains = 0;
  let losses = 0;

  // 计算初始平均收益和损失
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // 计算第一个RSI值
  if (avgLoss === 0) {
    rsiValues[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsiValues[period] = 100 - 100 / (1 + rs);
  }

  // 使用平滑公式计算后续RSI值
  for (let i = period + 1; i < data.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiValues[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsiValues;
}

export function RSIIndicator({ data, period = 14, height = 200 }: RSIIndicatorProps) {
  const rsiData = useMemo<RSIDataPoint[]>(() => {
    const rsiValues = calculateRSI(data, period);
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
            isOverbought ? 'text-red-500' : isOversold ? 'text-green-500' : 'text-gray-700'
          }`}
        >
          {currentRSI.toFixed(2)}
        </span>
        {isOverbought && (
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">超买</span>
        )}
        {isOversold && (
          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">超卖</span>
        )}
      </div>
    </div>
  );

  return (
    <DashboardCard title="" headerAction={headerContent}>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rsiData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              minTickGap={30}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              ticks={[0, 30, 50, 70, 100]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const rsi = payload[0].value as number;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p
                      className={`text-sm font-bold ${
                        rsi > 70 ? 'text-red-600' : rsi < 30 ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      RSI: {rsi.toFixed(2)}
                    </p>
                    {rsi > 70 && <p className="text-xs text-red-500 mt-1">超买区域</p>}
                    {rsi < 30 && <p className="text-xs text-green-500 mt-1">超卖区域</p>}
                  </div>
                );
              }}
            />
            {/* 超买区域 */}
            <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.1} />
            {/* 超卖区域 */}
            <ReferenceArea y1={0} y2={30} fill="#22c55e" fillOpacity={0.1} />
            {/* 中性线 */}
            <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
            {/* 超买线 */}
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            {/* 超卖线 */}
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
          <span>超买 (&gt;70)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
          <span>超卖 (&lt;30)</span>
        </div>
      </div>
    </DashboardCard>
  );
}

export { calculateRSI };
export type { RSIDataPoint };
