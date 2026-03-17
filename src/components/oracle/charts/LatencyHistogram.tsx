'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { chartColors, baseColors } from '@/lib/config/colors';
import { HistogramDataPoint } from './latencyUtils';

interface LatencyHistogramProps {
  histogramData: HistogramDataPoint[];
}

export function LatencyHistogram({ histogramData }: LatencyHistogramProps) {
  const t = useTranslations();

  return (
    <div className="p-4" style={{ backgroundColor: baseColors.gray[50] }}>
      <h4 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[900] }}>
        {t('charts.latency.histogramTitle')}
      </h4>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              vertical={false}
            />
            <XAxis
              dataKey="range"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              angle={-45}
              textAnchor="end"
              height={50}
              interval={0}
              label={{
                value: t('charts.latency.latencyRange'),
                position: 'insideBottom',
                offset: -10,
                fill: chartColors.recharts.axis,
                fontSize: 11,
              }}
            />
            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              label={{
                value: t('charts.latency.frequency'),
                angle: -90,
                position: 'insideLeft',
                fill: chartColors.recharts.axis,
                fontSize: 11,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload as HistogramDataPoint;
                return (
                  <div
                    className="p-2"
                    style={{
                      backgroundColor: baseColors.gray[50],
                      border: `1px solid ${baseColors.gray[200]}`,
                    }}
                  >
                    <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
                      {t('charts.latency.latencyRangeLabel')}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: baseColors.gray[900] }}>
                      {data.range} ms
                    </p>
                    <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
                      {t('charts.latency.frequency')}
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: chartColors.recharts.primary }}
                    >
                      {data.count}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              fill={chartColors.recharts.primary}
              stroke={chartColors.recharts.primaryDark}
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
