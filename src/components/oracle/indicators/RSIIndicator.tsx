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

interface RSIIndicatorProps {
  data: Array<{ price: number; timestamp: number }>;
  period?: number; // 默认14
  height?: number;
  showOverboughtOversold?: boolean;
}

interface RSIDataPoint {
  timestamp: number;
  rsi: number;
  time: string;
}

/**
 * 计算 RSI 指标
 * RSI = 100 - (100 / (1 + RS))
 * RS = 平均上涨幅度 / 平均下跌幅度
 *
 * 使用 Wilder 的平滑方法计算平均涨跌
 */
function calculateRSI(
  data: Array<{ price: number; timestamp: number }>,
  period: number = 14
): RSIDataPoint[] {
  if (data.length < period + 1) {
    return data.map((item) => ({
      timestamp: item.timestamp,
      rsi: 50,
      time: new Date(item.timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }

  const prices = data.map((d) => d.price);
  const rsiValues: number[] = new Array(data.length).fill(50);

  let gains = 0;
  let losses = 0;

  // 计算初始平均收益和损失（简单平均）
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // 计算第一个 RSI 值
  if (avgLoss === 0) {
    rsiValues[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsiValues[period] = 100 - 100 / (1 + rs);
  }

  // 使用平滑公式（Wilder's smoothing）计算后续 RSI 值
  for (let i = period + 1; i < data.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    // Wilder's smoothing: 前一期平均值 × (period-1) + 当前值，然后除以 period
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiValues[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[i] = 100 - 100 / (1 + rs);
    }
  }

  return data.map((item, index) => ({
    timestamp: item.timestamp,
    rsi: rsiValues[index],
    time: new Date(item.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
}

export function RSIIndicator({
  data,
  period = 14,
  height = 200,
  showOverboughtOversold = true,
}: RSIIndicatorProps) {
  const rsiData = useMemo<RSIDataPoint[]>(() => {
    return calculateRSI(data, period);
  }, [data, period]);

  const currentRSI = rsiData.length > 0 ? rsiData[rsiData.length - 1].rsi : 50;
  const isOverbought = currentRSI > 70;
  const isOversold = currentRSI < 30;

  const stats = useMemo(() => {
    if (rsiData.length === 0) {
      return { max: 50, min: 50, avg: 50 };
    }
    const rsiValues = rsiData.map((d) => d.rsi);
    return {
      max: Math.max(...rsiValues),
      min: Math.min(...rsiValues),
      avg: rsiValues.reduce((sum, v) => sum + v, 0) / rsiValues.length,
    };
  }, [rsiData]);

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">RSI 相对强弱指标</span>
            <span className="text-xs text-gray-400">({period}周期)</span>
          </div>
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

      {/* Chart */}
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

            {/* 超买区域背景 */}
            {showOverboughtOversold && (
              <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.1} />
            )}
            {/* 超卖区域背景 */}
            {showOverboughtOversold && (
              <ReferenceArea y1={0} y2={30} fill="#22c55e" fillOpacity={0.1} />
            )}

            {/* 参考线 */}
            <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />

            {/* RSI 线 */}
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

      {/* Legend */}
      {showOverboughtOversold && (
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
              <span>超买 (&gt;70)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
              <span>超卖 (&lt;30)</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-gray-400" style={{ borderTop: '1px dashed #9ca3af' }} />
              <span>中性线 (50)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { calculateRSI };
export type { RSIDataPoint, RSIIndicatorProps };
