'use client';

/**
 * @fileoverview 多预言机价格走势对比图组件
 * @description 展示多个预言机的价格走势对比
 */

import { memo, useMemo, useState } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import { chartColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/format';
import type { OracleProvider } from '@/types/oracle';

import { oracleNames } from '../../constants';

interface TrendDataPoint {
  timestamp: number;
  [key: string]: number;
}

interface MultiOracleTrendChartProps {
  historicalData: Partial<Record<OracleProvider, Array<{ timestamp: number; price: number }>>>;
  oracleColors: Record<OracleProvider, string>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function MultiOracleTrendChartComponent({
  historicalData,
  oracleColors,
  t,
}: MultiOracleTrendChartProps) {
  const [hiddenOracles, setHiddenOracles] = useState<Set<OracleProvider>>(new Set());

  // 处理图表数据
  const chartData = useMemo(() => {
    const oracles = Object.keys(historicalData) as OracleProvider[];
    if (oracles.length === 0) return [];

    // 收集所有时间点
    const allTimestamps = new Set<number>();
    oracles.forEach((oracle) => {
      historicalData[oracle]?.forEach((point) => {
        allTimestamps.add(point.timestamp);
      });
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // 构建数据点
    return sortedTimestamps.map((timestamp) => {
      const point: TrendDataPoint = { timestamp };
      oracles.forEach((oracle) => {
        const dataPoint = historicalData[oracle]?.find((p) => p.timestamp === timestamp);
        point[oracle] = dataPoint?.price || 0;
      });
      return point;
    });
  }, [historicalData]);

  const oracles = useMemo(() => Object.keys(historicalData) as OracleProvider[], [historicalData]);

  const toggleOracle = (oracle: OracleProvider) => {
    setHiddenOracles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(oracle)) {
        newSet.delete(oracle);
      } else {
        newSet.add(oracle);
      }
      return newSet;
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.charts.trendTitle')}
        </h4>
      </div>

      {/* 预言机切换按钮 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {oracles.map((oracle) => (
          <button
            key={oracle}
            onClick={() => toggleOracle(oracle)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
              transition-all duration-200 border
              ${
                hiddenOracles.has(oracle)
                  ? 'bg-gray-100 text-gray-400 border-gray-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: hiddenOracles.has(oracle)
                  ? chartColors.recharts.axis
                  : oracleColors[oracle],
              }}
            />
            {oracleNames[oracle] || oracle}
          </button>
        ))}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              cursor={{ stroke: chartColors.recharts.axis, strokeDasharray: '3 3' }}
              formatter={(value, name) => [
                formatPrice(value as number),
                oracleNames[name as OracleProvider] || name,
              ]}
              labelFormatter={(label) => formatTime(label as number)}
              contentStyle={{
                backgroundColor: chartColors.recharts.white,
                border: `1px solid ${chartColors.recharts.border}`,
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            {oracles.map(
              (oracle) =>
                !hiddenOracles.has(oracle) && (
                  <Line
                    key={oracle}
                    type="monotone"
                    dataKey={oracle}
                    stroke={oracleColors[oracle]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: chartColors.recharts.white }}
                    connectNulls
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const MultiOracleTrendChart = memo(MultiOracleTrendChartComponent);
MultiOracleTrendChart.displayName = 'MultiOracleTrendChart';

export default MultiOracleTrendChart;
