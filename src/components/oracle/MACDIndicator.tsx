'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DashboardCard } from './DashboardCard';

interface MACDDataPoint {
  time: string;
  timestamp: number;
  dif: number;
  dea: number;
  macd: number;
  signal?: 'golden' | 'death' | null;
}

interface MACDIndicatorProps {
  data: Array<{ time: string; timestamp: number; price: number; close?: number }>;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  height?: number;
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // 第一个EMA使用简单移动平均
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;

  // 计算后续EMA
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }

  // 填充前面的值
  for (let i = 0; i < period - 1; i++) {
    ema[i] = data[i];
  }

  return ema;
}

function calculateMACD(
  data: Array<{ price: number; close?: number }>,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { dif: number[]; dea: number[]; macd: number[]; signals: Array<'golden' | 'death' | null> } {
  const closes = data.map((d) => d.close || d.price);

  // 计算快速和慢速EMA
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // 计算DIF (快线)
  const dif = fastEMA.map((fast, i) => fast - slowEMA[i]);

  // 计算DEA (慢线/信号线)
  const dea = calculateEMA(dif, signalPeriod);

  // 计算MACD柱状图
  const macd = dif.map((d, i) => (d - dea[i]) * 2);

  // 检测金叉和死叉
  const signals: Array<'golden' | 'death' | null> = new Array(data.length).fill(null);
  for (let i = 1; i < data.length; i++) {
    // 金叉: DIF从下向上穿越DEA
    if (dif[i - 1] < dea[i - 1] && dif[i] >= dea[i]) {
      signals[i] = 'golden';
    }
    // 死叉: DIF从上向下穿越DEA
    else if (dif[i - 1] > dea[i - 1] && dif[i] <= dea[i]) {
      signals[i] = 'death';
    }
  }

  return { dif, dea, macd, signals };
}

export function MACDIndicator({
  data,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  height = 200,
}: MACDIndicatorProps) {
  const macdData = useMemo<MACDDataPoint[]>(() => {
    const { dif, dea, macd, signals } = calculateMACD(data, fastPeriod, slowPeriod, signalPeriod);
    return data.map((point, index) => ({
      time: point.time,
      timestamp: point.timestamp,
      dif: dif[index],
      dea: dea[index],
      macd: macd[index],
      signal: signals[index],
    }));
  }, [data, fastPeriod, slowPeriod, signalPeriod]);

  const currentData =
    macdData.length > 0 ? macdData[macdData.length - 1] : { dif: 0, dea: 0, macd: 0 };
  const lastSignal = useMemo(() => {
    for (let i = macdData.length - 1; i >= 0; i--) {
      if (macdData[i].signal) {
        return { type: macdData[i].signal, index: i };
      }
    }
    return null;
  }, [macdData]);

  const goldenCrossCount = macdData.filter((d) => d.signal === 'golden').length;
  const deathCrossCount = macdData.filter((d) => d.signal === 'death').length;

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div>
        <span className="text-sm font-medium text-gray-700">MACD 指数平滑异同平均线</span>
        <span className="ml-2 text-xs text-gray-400">
          ({fastPeriod},{slowPeriod},{signalPeriod})
        </span>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            DIF
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            DEA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            MACD
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">DIF:</span>
        <span
          className={`text-sm font-bold ${currentData.dif > 0 ? 'text-red-500' : 'text-green-500'}`}
        >
          {currentData.dif > 0 ? '+' : ''}
          {currentData.dif.toFixed(4)}
        </span>
        <span className="text-xs text-gray-500 ml-2">DEA:</span>
        <span
          className={`text-sm font-bold ${currentData.dea > 0 ? 'text-red-500' : 'text-green-500'}`}
        >
          {currentData.dea > 0 ? '+' : ''}
          {currentData.dea.toFixed(4)}
        </span>
        {lastSignal?.type === 'golden' && (
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">金叉</span>
        )}
        {lastSignal?.type === 'death' && (
          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">死叉</span>
        )}
      </div>
    </div>
  );

  return (
    <DashboardCard title="" headerAction={headerContent}>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={macdData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload as MACDDataPoint;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <div className="space-y-1">
                      <p
                        className={`text-sm font-bold ${data.dif > 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        DIF: {data.dif > 0 ? '+' : ''}
                        {data.dif.toFixed(4)}
                      </p>
                      <p
                        className={`text-sm font-bold ${data.dea > 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        DEA: {data.dea > 0 ? '+' : ''}
                        {data.dea.toFixed(4)}
                      </p>
                      <p
                        className={`text-sm font-bold ${data.macd > 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        MACD: {data.macd > 0 ? '+' : ''}
                        {data.macd.toFixed(4)}
                      </p>
                      {data.signal === 'golden' && (
                        <p className="text-xs text-red-500 mt-1">金叉信号</p>
                      )}
                      {data.signal === 'death' && (
                        <p className="text-xs text-green-500 mt-1">死叉信号</p>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
            <Bar
              dataKey="macd"
              fill="#9ca3af"
              opacity={0.6}
              shape={(props: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                payload?: MACDDataPoint;
              }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                const isPositive = (payload?.macd || 0) >= 0;
                return (
                  <rect
                    x={x}
                    y={isPositive ? y : y + height}
                    width={width}
                    height={Math.abs(height)}
                    fill={isPositive ? '#ef4444' : '#22c55e'}
                    opacity={0.6}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="dif"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#3b82f6' }}
            />
            <Line
              type="monotone"
              dataKey="dea"
              stroke="#f97316"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#f97316' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded" />
            红柱 (+)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded" />
            绿柱 (-)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-red-600">金叉: {goldenCrossCount}</span>
          <span className="text-green-600">死叉: {deathCrossCount}</span>
        </div>
      </div>
    </DashboardCard>
  );
}

export { calculateMACD };
export type { MACDDataPoint };
