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
  Scatter,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { chartColors } from '@/lib/config/colors';

interface MACDDataPoint {
  time: string;
  timestamp: number;
  dif: number;
  dea: number;
  macd: number;
  signal?: 'golden' | 'death' | null;
  signalX?: number;
  signalY?: number;
  signalType?: 'golden' | 'death';
}

export interface MACDIndicatorProps {
  data: Array<{ price: number; timestamp: number }>;
  fastPeriod?: number; // 默认12
  slowPeriod?: number; // 默认26
  signalPeriod?: number; // 默认9
  height?: number;
  showSignals?: boolean;
}

/**
 * 计算指数移动平均 (EMA)
 * EMA = (今日收盘价 × 2 / (N + 1)) + (昨日EMA × (N - 1) / (N + 1))
 */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // 第一个EMA使用简单移动平均
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
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

/**
 * 计算 MACD 指标
 * MACD 公式：
 * EMA12 = 12日指数移动平均
 * EMA26 = 26日指数移动平均
 * DIF = EMA12 - EMA26
 * DEA = DIF的9日EMA
 * MACD柱状图 = (DIF - DEA) * 2
 */
function calculateMACD(
  data: Array<{ price: number }>,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { dif: number[]; dea: number[]; macd: number[]; signals: Array<'golden' | 'death' | null> } {
  const prices = data.map((d) => d.price);

  // 计算快速和慢速EMA
  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);

  // 计算DIF (快线) = EMA12 - EMA26
  const dif = ema12.map((fast, i) => fast - ema26[i]);

  // 计算DEA (慢线/信号线) = DIF的9日EMA
  const dea = calculateEMA(dif, signalPeriod);

  // 计算MACD柱状图 = (DIF - DEA) * 2
  const macd = dif.map((d, i) => (d - dea[i]) * 2);

  // 检测金叉和死叉
  const signals: Array<'golden' | 'death' | null> = new Array(data.length).fill(null);
  for (let i = 1; i < data.length; i++) {
    // 金叉: DIF从下向上穿越DEA (DIF上穿DEA)
    if (dif[i - 1] < dea[i - 1] && dif[i] >= dea[i]) {
      signals[i] = 'golden';
    }
    // 死叉: DIF从上向下穿越DEA (DIF下穿DEA)
    else if (dif[i - 1] > dea[i - 1] && dif[i] <= dea[i]) {
      signals[i] = 'death';
    }
  }

  return { dif, dea, macd, signals };
}

/**
 * 格式化时间戳为显示时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function MACDIndicator({
  data,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  height = 200,
  showSignals = true,
}: MACDIndicatorProps) {
  const macdData = useMemo<MACDDataPoint[]>(() => {
    if (data.length === 0) return [];

    const { dif, dea, macd, signals } = calculateMACD(data, fastPeriod, slowPeriod, signalPeriod);

    return data.map((point, index) => {
      const signal = signals[index];
      return {
        time: formatTime(point.timestamp),
        timestamp: point.timestamp,
        dif: dif[index],
        dea: dea[index],
        macd: macd[index],
        signal: signal,
        // 为散点图准备信号点数据
        signalX: signal ? index : undefined,
        signalY: signal ? dif[index] : undefined,
        signalType: signal || undefined,
      };
    });
  }, [data, fastPeriod, slowPeriod, signalPeriod]);

  const currentData =
    macdData.length > 0 ? macdData[macdData.length - 1] : { dif: 0, dea: 0, macd: 0 };
  const lastSignal = (() => {
    for (let i = macdData.length - 1; i >= 0; i--) {
      if (macdData[i].signal) {
        return { type: macdData[i].signal, index: i };
      }
    }
    return null;
  })();

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
            <ReferenceLine y={0} stroke={chartColors.macd.zeroLine} strokeDasharray="3 3" />
            <Bar
              dataKey="macd"
              fill={chartColors.recharts.tick}
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
                    fill={isPositive ? chartColors.macd.histogram.positive : chartColors.macd.histogram.negative}
                    opacity={0.6}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="dif"
              stroke={chartColors.macd.line}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: chartColors.macd.line }}
            />
            <Line
              type="monotone"
              dataKey="dea"
              stroke={chartColors.macd.signal}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: chartColors.macd.signal }}
            />
            {/* 金叉/死叉信号标记 */}
            {showSignals && (
              <>
                <Scatter
                  dataKey="signalY"
                  fill={chartColors.semantic.danger}
                  shape={(props: { cx?: number; cy?: number; payload?: MACDDataPoint }) => {
                    const { cx = 0, cy = 0, payload } = props;
                    if (payload?.signalType === 'golden') {
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={chartColors.semantic.danger}
                            stroke={chartColors.recharts.white}
                            strokeWidth={2}
                          />
                          <text x={cx} y={cy - 10} textAnchor="middle" fill={chartColors.semantic.danger} fontSize={10}>
                            金叉
                          </text>
                        </g>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  dataKey="signalY"
                  fill={chartColors.semantic.success}
                  shape={(props: { cx?: number; cy?: number; payload?: MACDDataPoint }) => {
                    const { cx = 0, cy = 0, payload } = props;
                    if (payload?.signalType === 'death') {
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={chartColors.semantic.success}
                            stroke={chartColors.recharts.white}
                            strokeWidth={2}
                          />
                          <text x={cx} y={cy - 10} textAnchor="middle" fill={chartColors.semantic.success} fontSize={10}>
                            死叉
                          </text>
                        </g>
                      );
                    }
                    return null;
                  }}
                />
              </>
            )}
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
