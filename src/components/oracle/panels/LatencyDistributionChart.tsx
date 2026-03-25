'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTranslations } from '@/i18n';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { LatencyDistributionData, LatencyMetrics } from './qualityUtils';


interface LatencyDistributionChartProps {
  data: LatencyDistributionData[];
  metrics: LatencyMetrics;
}

export function LatencyDistributionChart({ data, metrics }: LatencyDistributionChartProps) {
  const t = useTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.latencyDistributionAnalysis')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dataQuality.responseLatencyHistogram')}
          </p>
        </div>
        <div className="p-2 bg-purple-50 border border-purple-100 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-success-50 border border-success-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">P50</p>
          <p className="text-lg font-bold text-success-600">
            {metrics.p50}
            <span className="text-sm text-gray-500 ml-1">ms</span>
          </p>
        </div>
        <div className="bg-warning-50 border border-warning-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">P95</p>
          <p className="text-lg font-bold text-warning-600">
            {metrics.p95}
            <span className="text-sm text-gray-500 ml-1">ms</span>
          </p>
        </div>
        <div className="bg-danger-50 border border-danger-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">P99</p>
          <p className="text-lg font-bold text-danger-600">
            {metrics.p99}
            <span className="text-sm text-gray-500 ml-1">ms</span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            vertical={false}
          />
          <XAxis
            dataKey="range"
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
          />
          <YAxis
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            tickFormatter={(value) => `${value}%`}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0].payload as LatencyDistributionData;
              return (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-medium">
                    {t('dataQuality.latencyRange')}: {item.range}ms
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('dataQuality.percentage')}: {item.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('dataQuality.sampleCount')}: {item.count}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="percentage">
            {data.map((entry, index) => {
              let color: string = chartColors.semantic.success;
              if (index >= 7) color = semanticColors.danger.DEFAULT;
              else if (index >= 5) color = chartColors.semantic.warning;
              else if (index >= 3) color = chartColors.recharts.primary;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.avgValue')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.avg}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.minValue')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.min}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.maxValue')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.max}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.stdDev')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.stdDev}ms</p>
        </div>
      </div>
    </div>
  );
}
