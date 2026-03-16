'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { chartColors, semanticColors, baseColors, animationColors } from '@/lib/config/colors';
import { useTranslations } from 'next-intl';

interface ATRDataPoint {
  timestamp: number;
  atr: number;
  price: number;
  high: number;
  low: number;
  close: number;
}

export interface ATRIndicatorProps {
  data: ATRDataPoint[];
  period?: number;
  height?: number;
  showThresholds?: boolean;
}

export function ATRIndicator({
  data,
  period = 14,
  height = 200,
  showThresholds = true,
}: ATRIndicatorProps) {
  const t = useTranslations();
  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    // Calculate ATR using Wilder's smoothing method
    const atrData: (ATRDataPoint & { tr: number; atrValue: number })[] = [];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const prev = i > 0 ? data[i - 1] : null;

      // Calculate True Range
      const tr1 = current.high - current.low;
      const tr2 = prev ? Math.abs(current.high - prev.close) : 0;
      const tr3 = prev ? Math.abs(current.low - prev.close) : 0;
      const tr = Math.max(tr1, tr2, tr3);

      atrData.push({
        ...current,
        tr,
        atrValue: 0,
      });
    }

    // Calculate ATR using Wilder's smoothing
    let atrSum = 0;
    for (let i = 0; i < atrData.length; i++) {
      if (i < period) {
        atrSum += atrData[i].tr;
        atrData[i].atrValue = atrSum / (i + 1);
      } else {
        atrData[i].atrValue = (atrData[i - 1].atrValue * (period - 1) + atrData[i].tr) / period;
      }
    }

    return atrData;
  }, [data, period]);

  const statistics = useMemo(() => {
    if (processedData.length === 0) return null;

    const atrValues = processedData.map((d) => d.atrValue);
    const currentATR = atrValues[atrValues.length - 1];
    const avgATR = atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
    const maxATR = Math.max(...atrValues);
    const minATR = Math.min(...atrValues);

    // Calculate volatility levels
    const highVolatilityThreshold = avgATR * 1.5;
    const lowVolatilityThreshold = avgATR * 0.5;

    return {
      currentATR,
      avgATR,
      maxATR,
      minATR,
      highVolatilityThreshold,
      lowVolatilityThreshold,
    };
  }, [processedData]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-2">{formatTime(label)}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">ATR:</span>
            <span
              className="text-sm font-mono font-medium"
              style={{ color: chartColors.recharts.chainlink }}
            >
              {data.atrValue.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">True Range:</span>
            <span className="text-sm font-mono">{data.tr.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">{t('charts.atr.priceRange')}:</span>
            <span className="text-sm font-mono">
              {data.low.toFixed(2)} - {data.high.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p>{t('charts.atr.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.atr.currentATR')}</p>
            <p
              className="text-lg font-bold"
              style={{
                color:
                  statistics.currentATR > statistics.highVolatilityThreshold
                    ? semanticColors.danger.DEFAULT
                    : statistics.currentATR < statistics.lowVolatilityThreshold
                      ? semanticColors.success.DEFAULT
                      : baseColors.gray[900],
              }}
            >
              {statistics.currentATR.toFixed(4)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.atr.avgATR')}</p>
            <p className="text-lg font-bold text-gray-900">{statistics.avgATR.toFixed(4)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.atr.maxATR')}</p>
            <p className="text-lg font-bold" style={{ color: semanticColors.danger.DEFAULT }}>
              {statistics.maxATR.toFixed(4)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.atr.minATR')}</p>
            <p className="text-lg font-bold" style={{ color: semanticColors.success.DEFAULT }}>
              {statistics.minATR.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
            />
            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              width={60}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: animationColors.fade.cursor }} />

            {/* Volatility zones */}
            {showThresholds && statistics && (
              <>
                <ReferenceLine
                  y={statistics.highVolatilityThreshold}
                  stroke={semanticColors.danger.DEFAULT}
                  strokeDasharray="5 5"
                  label={{
                    value: t('charts.atr.highVolatility'),
                    position: 'right',
                    fill: semanticColors.danger.DEFAULT,
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={statistics.lowVolatilityThreshold}
                  stroke={semanticColors.success.DEFAULT}
                  strokeDasharray="5 5"
                  label={{
                    value: t('charts.atr.lowVolatility'),
                    position: 'right',
                    fill: semanticColors.success.DEFAULT,
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={statistics.avgATR}
                  stroke={chartColors.recharts.tick}
                  strokeDasharray="3 3"
                  label={{
                    value: t('charts.atr.average'),
                    position: 'right',
                    fill: chartColors.recharts.tick,
                    fontSize: 10,
                  }}
                />
              </>
            )}

            {/* True Range bars */}
            <Bar dataKey="tr" fill={baseColors.gray[200]} opacity={0.3} name="True Range" />

            {/* ATR line */}
            <Line
              type="monotone"
              dataKey="atrValue"
              stroke={chartColors.recharts.chainlink}
              strokeWidth={2}
              dot={false}
              name={`ATR (${period})`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: chartColors.recharts.chainlink }} />
          <span className="text-gray-600">ATR ({period})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: baseColors.gray[200] }} />
          <span className="text-gray-600">True Range</span>
        </div>
      </div>
    </div>
  );
}

export default ATRIndicator;
