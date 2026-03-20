'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { chartColors, semanticColors, baseColors, animationColors } from '@/lib/config/colors';
import { useTranslations } from 'next-intl';

interface BollingerDataPoint {
  timestamp: number;
  price: number;
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export interface BollingerBandsProps {
  data: Array<{
    timestamp: number;
    price: number;
    high: number;
    low: number;
    close: number;
  }>;
  period?: number;
  multiplier?: number;
  height?: number;
  showBandwidth?: boolean;
}

export function BollingerBands({
  data,
  period = 20,
  multiplier = 2,
  height = 300,
  showBandwidth = true,
}: BollingerBandsProps) {
  const t = useTranslations();
  const processedData = useMemo(() => {
    if (data.length < period) return [];

    const result: BollingerDataPoint[] = [];

    for (let i = period - 1; i < data.length; i++) {
      // Calculate SMA (middle band)
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j].close;
      }
      const sma = sum / period;

      // Calculate standard deviation
      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        varianceSum += Math.pow(data[j].close - sma, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);

      // Calculate bands
      const upper = sma + multiplier * stdDev;
      const lower = sma - multiplier * stdDev;

      // Calculate bandwidth (%)
      const bandwidth = ((upper - lower) / sma) * 100;

      // Calculate %B
      const percentB = ((data[i].close - lower) / (upper - lower)) * 100;

      result.push({
        timestamp: data[i].timestamp,
        price: data[i].close,
        upper,
        middle: sma,
        lower,
        bandwidth,
        percentB: Math.max(0, Math.min(100, percentB)),
      });
    }

    return result;
  }, [data, period, multiplier]);

  const statistics = useMemo(() => {
    if (processedData.length === 0) return null;

    const bandwidths = processedData.map((d) => d.bandwidth);
    const percentBs = processedData.map((d) => d.percentB);

    const avgBandwidth = bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length;
    const currentBandwidth = bandwidths[bandwidths.length - 1];
    const minBandwidth = Math.min(...bandwidths);
    const maxBandwidth = Math.max(...bandwidths);

    const currentPercentB = percentBs[percentBs.length - 1];
    const touchesUpper = percentBs.filter((p) => p >= 95).length;
    const touchesLower = percentBs.filter((p) => p <= 5).length;

    return {
      avgBandwidth,
      currentBandwidth,
      minBandwidth,
      maxBandwidth,
      currentPercentB,
      touchesUpper,
      touchesLower,
      squeeze: currentBandwidth < avgBandwidth * 0.6,
      expansion: currentBandwidth > avgBandwidth * 1.4,
    };
  }, [processedData]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: BollingerDataPoint }>;
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const timestamp = typeof label === 'number' ? label : 0;
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-2">{formatTime(timestamp)}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">{t('charts.bollinger.price')}:</span>
            <span className="text-sm font-mono font-medium">${data.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm" style={{ color: semanticColors.danger.DEFAULT }}>
              {t('charts.bollinger.upperBand')}:
            </span>
            <span className="text-sm font-mono">${data.upper.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm" style={{ color: chartColors.recharts.tick }}>
              {t('charts.bollinger.middleBand')}:
            </span>
            <span className="text-sm font-mono">${data.middle.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm" style={{ color: semanticColors.success.DEFAULT }}>
              {t('charts.bollinger.lowerBand')}:
            </span>
            <span className="text-sm font-mono">${data.lower.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">{t('charts.bollinger.bandwidth')}:</span>
            <span className="text-sm font-mono">{data.bandwidth.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">%B:</span>
            <span className="text-sm font-mono">{data.percentB.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  };

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p>{t('charts.bollinger.insufficientData', { period })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.bollinger.currentBandwidth')}</p>
            <p
              className="text-lg font-bold"
              style={{
                color: statistics.squeeze
                  ? semanticColors.warning.DEFAULT
                  : statistics.expansion
                    ? semanticColors.danger.DEFAULT
                    : baseColors.gray[900],
              }}
            >
              {statistics.currentBandwidth.toFixed(2)}%
            </p>
            {statistics.squeeze && (
              <p className="text-xs" style={{ color: semanticColors.warning.DEFAULT }}>
                {t('charts.bollinger.squeeze')}
              </p>
            )}
            {statistics.expansion && (
              <p className="text-xs" style={{ color: semanticColors.danger.DEFAULT }}>
                {t('charts.bollinger.expansion')}
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">%B {t('charts.bollinger.position')}</p>
            <p
              className="text-lg font-bold"
              style={{
                color:
                  statistics.currentPercentB >= 95
                    ? semanticColors.danger.DEFAULT
                    : statistics.currentPercentB <= 5
                      ? semanticColors.success.DEFAULT
                      : baseColors.gray[900],
              }}
            >
              {statistics.currentPercentB.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.bollinger.touchesUpper')}</p>
            <p className="text-lg font-bold" style={{ color: semanticColors.danger.DEFAULT }}>
              {statistics.touchesUpper} {t('charts.bollinger.times')}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{t('charts.bollinger.touchesLower')}</p>
            <p className="text-lg font-bold" style={{ color: semanticColors.success.DEFAULT }}>
              {statistics.touchesLower} {t('charts.bollinger.times')}
            </p>
          </div>
        </div>
      )}

      {/* Main Chart */}
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
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: animationColors.fade.cursor }} />

            {/* %B reference lines */}
            <ReferenceLine y={0} stroke={chartColors.recharts.grid} strokeDasharray="3 3" />
            <ReferenceLine
              y={processedData[processedData.length - 1]?.upper}
              stroke={semanticColors.danger.DEFAULT}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={processedData[processedData.length - 1]?.lower}
              stroke={semanticColors.success.DEFAULT}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />

            {/* Bollinger Bands Area */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill={baseColors.primary[100]}
              fillOpacity={0.3}
              name={t('charts.bollinger.upperBand')}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="white"
              fillOpacity={1}
              name={t('charts.bollinger.lowerBandArea')}
            />

            {/* Band lines */}
            <Line
              type="monotone"
              dataKey="upper"
              stroke={semanticColors.danger.DEFAULT}
              strokeWidth={1.5}
              dot={false}
              name={t('charts.bollinger.upperBand')}
            />
            <Line
              type="monotone"
              dataKey="middle"
              stroke={chartColors.recharts.tick}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name={t('charts.bollinger.middleBandSMA', { period })}
            />
            <Line
              type="monotone"
              dataKey="lower"
              stroke={semanticColors.success.DEFAULT}
              strokeWidth={1.5}
              dot={false}
              name={t('charts.bollinger.lowerBand')}
            />

            {/* Price line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke={chartColors.recharts.chainlink}
              strokeWidth={2}
              dot={false}
              name={t('charts.bollinger.price')}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: chartColors.recharts.chainlink }} />
          <span className="text-gray-600">{t('charts.bollinger.price')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: semanticColors.danger.DEFAULT }} />
          <span className="text-gray-600">{t('charts.bollinger.upperBand')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: chartColors.recharts.tick }} />
          <span className="text-gray-600">{t('charts.bollinger.middleBandSMA', { period })}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: semanticColors.success.DEFAULT }} />
          <span className="text-gray-600">{t('charts.bollinger.lowerBand')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: baseColors.primary[100] }} />
          <span className="text-gray-600">{t('charts.bollinger.bollingerArea')}</span>
        </div>
      </div>

      {/* Bandwidth Chart */}
      {showBandwidth && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('charts.bollinger.bandwidthIndicator')}
          </p>
          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={processedData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.grid}
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
                  tickLine={false}
                />
                <YAxis
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
                  tickLine={false}
                  width={40}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-lg">
                        <p className="text-xs text-gray-600">
                          {t('charts.bollinger.bandwidth')}: {data.bandwidth.toFixed(2)}%
                        </p>
                      </div>
                    );
                  }}
                  cursor={{ fill: animationColors.fade.cursor }}
                />
                {statistics && (
                  <>
                    <ReferenceLine
                      y={statistics.avgBandwidth}
                      stroke={chartColors.recharts.tick}
                      strokeDasharray="3 3"
                    />
                    <ReferenceLine
                      y={statistics.avgBandwidth * 0.6}
                      stroke={semanticColors.warning.DEFAULT}
                      strokeDasharray="3 3"
                    />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey="bandwidth"
                  stroke={chartColors.recharts.purple}
                  fill={chartColors.recharts.purple}
                  fillOpacity={0.2}
                  name={t('charts.bollinger.bandwidth')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default BollingerBands;
