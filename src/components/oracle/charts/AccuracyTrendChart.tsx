'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { AccuracyTrendPoint } from '@/hooks/usePriceHistory';
import { chartColors, baseColors } from '@/lib/config/colors';

interface AccuracyTrendChartProps {
  data: AccuracyTrendPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AccuracyTrendPoint & { displayDate: string } }>;
  label?: string;
  t: (key: string) => string;
}

function CustomTooltip({ active, payload, label, t }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded border border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-gray-500">{t('pyth.trend.accuracy')}:</span>
            <span className="ml-2 font-bold text-blue-600">{dataPoint.accuracy.toFixed(2)}%</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">{t('pyth.trend.deviation')}:</span>
            <span className="ml-2 font-bold text-red-600">{dataPoint.deviation.toFixed(4)}%</span>
          </p>
          {dataPoint.event && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-sm">
                <span className="text-gray-500">{t('pyth.trend.event')}:</span>
                <span className="ml-2 font-medium text-orange-600">{dataPoint.event}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function AccuracyTrendChart({ data }: AccuracyTrendChartProps) {
  const t = useTranslations();

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      displayDate: point.date,
    }));
  }, [data]);

  const eventPoints = useMemo(() => {
    return data.map((point, index) => ({ ...point, index })).filter((point) => point.event);
  }, [data]);

  const avgAccuracy = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.accuracy, 0) / data.length;
  }, [data]);

  const minAccuracy = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.min(...data.map((d) => d.accuracy));
  }, [data]);

  const maxAccuracy = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((d) => d.accuracy));
  }, [data]);

  return (
    <div className="bg-white rounded border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('pyth.trend.title')}</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-sm text-gray-600">{t('pyth.trend.accuracy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-sm text-gray-600">{t('pyth.trend.deviation')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-blue-50 rounded text-center">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.trend.avgAccuracy')}</p>
          <p className="text-xl font-bold text-blue-600">{avgAccuracy.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-green-50 rounded text-center">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.trend.maxAccuracy')}</p>
          <p className="text-xl font-bold text-green-600">{maxAccuracy.toFixed(2)}%</p>
        </div>
        <div className="p-3 bg-orange-50 rounded text-center">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.trend.minAccuracy')}</p>
          <p className="text-xl font-bold text-orange-600">{minAccuracy.toFixed(2)}%</p>
        </div>
      </div>

      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="displayDate"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              minTickGap={20}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="accuracy"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              domain={[90, 100]}
              tickFormatter={(value) => `${value}%`}
              width={60}
            />
            <YAxis
              yAxisId="deviation"
              orientation="right"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
              width={60}
            />
            <Tooltip content={<CustomTooltip t={t} />} />
            <Legend />
            <Line
              yAxisId="accuracy"
              type="monotone"
              dataKey="accuracy"
              stroke={chartColors.recharts.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: chartColors.recharts.primary }}
              name={t('pyth.trend.accuracy')}
            />
            <Line
              yAxisId="deviation"
              type="monotone"
              dataKey="deviation"
              stroke={chartColors.recharts.danger}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: chartColors.recharts.danger }}
              name={t('pyth.trend.deviation')}
            />
            {eventPoints.map((point, index) => (
              <ReferenceDot
                key={`event-${index}`}
                x={point.date}
                y={point.accuracy}
                yAxisId="accuracy"
                r={8}
                fill={chartColors.recharts.warning}
                stroke={baseColors.gray[50]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {eventPoints.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('pyth.trend.importantEvents')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eventPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{point.event}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {point.date} · {t('pyth.trend.accuracy')}: {point.accuracy.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
