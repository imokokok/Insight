'use client';

import { useMemo } from 'react';
import { useTranslations } from '@/i18n';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
  BarChart,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { ComparisonChartData } from './types';
import { chartColors, baseColors } from '@/lib/config/colors';


interface TimeComparisonChartProps {
  data: ComparisonChartData[];
  title?: string;
  height?: number;
  showDifference?: boolean;
  primaryLabel?: string;
  comparisonLabel?: string;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (timestamp: number) => string;
}

export function TimeComparisonChart({
  data,
  title,
  height = 400,
  showDifference = true,
  primaryLabel,
  comparisonLabel,
  valueFormatter = (v) => `$${v.toFixed(2)}`,
  dateFormatter,
}: TimeComparisonChartProps) {
  const t = useTranslations('comparison.timeComparison');
  const locale = zhCN;

  const defaultPrimaryLabel = primaryLabel || t('currentPeriod');
  const defaultComparisonLabel = comparisonLabel || t('comparisonPeriod');

  const defaultDateFormatter = (timestamp: number) => {
    return format(timestamp, 'MM-dd HH:mm', { locale });
  };

  const formatDate = dateFormatter || defaultDateFormatter;

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const primaryValues = data.map((d) => d.primary);
    const comparisonValues = data.map((d) => d.comparison);

    const primaryAvg = primaryValues.reduce((a, b) => a + b, 0) / primaryValues.length;
    const comparisonAvg = comparisonValues.reduce((a, b) => a + b, 0) / comparisonValues.length;

    const primaryChange =
      ((primaryValues[primaryValues.length - 1] - primaryValues[0]) / primaryValues[0]) * 100;
    const comparisonChange =
      ((comparisonValues[comparisonValues.length - 1] - comparisonValues[0]) /
        comparisonValues[0]) *
      100;

    return {
      primaryAvg,
      comparisonAvg,
      primaryChange,
      comparisonChange,
      difference: primaryAvg - comparisonAvg,
      percentDiff: ((primaryAvg - comparisonAvg) / comparisonAvg) * 100,
    };
  }, [data]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const primaryValue = payload.find((p) => p.dataKey === 'primary')?.value;
    const comparisonValue = payload.find((p) => p.dataKey === 'comparison')?.value;
    const difference =
      primaryValue !== undefined && comparisonValue !== undefined
        ? primaryValue - comparisonValue
        : null;
    const percentDiff =
      difference !== null && comparisonValue && comparisonValue !== 0
        ? (difference / comparisonValue) * 100
        : null;

    return (
      <div className="bg-white border border-gray-200 p-3 shadow-lg">
        <div className="text-sm font-semibold text-gray-900 mb-2">{formatDate(label || 0)}</div>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600">
                  {entry.dataKey === 'primary' ? defaultPrimaryLabel : defaultComparisonLabel}
                </span>
              </div>
              <span className="font-mono font-medium text-gray-900">
                {valueFormatter(entry.value)}
              </span>
            </div>
          ))}
          {difference !== null && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('difference')}</span>
                <span
                  className={`font-mono font-medium ${
                    difference >= 0 ? 'text-success-600' : 'text-danger-600'
                  }`}
                >
                  {difference >= 0 ? '+' : ''}
                  {valueFormatter(difference)}
                </span>
              </div>
              {percentDiff !== null && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-400">{t('percentChange')}</span>
                  <span
                    className={`font-mono ${percentDiff >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                  >
                    {percentDiff >= 0 ? '+' : ''}
                    {percentDiff.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('currentAvg')}</p>
            <p className="text-lg font-semibold text-primary-600">
              {valueFormatter(stats.primaryAvg)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('comparisonAvg')}</p>
            <p className="text-lg font-semibold text-purple-600">
              {valueFormatter(stats.comparisonAvg)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('difference')}</p>
            <p
              className={`text-lg font-semibold ${stats.difference >= 0 ? 'text-success-600' : 'text-danger-600'}`}
            >
              {stats.difference >= 0 ? '+' : ''}
              {valueFormatter(stats.difference)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('percentChange')}</p>
            <p
              className={`text-lg font-semibold ${stats.percentDiff >= 0 ? 'text-success-600' : 'text-danger-600'}`}
            >
              {stats.percentDiff >= 0 ? '+' : ''}
              {stats.percentDiff.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="comparisonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.recharts.purple} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chartColors.recharts.purple} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              stroke={baseColors.gray[500]}
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke={baseColors.gray[500]}
              fontSize={11}
              tickLine={false}
              tickFormatter={valueFormatter}
              domain={['auto', 'auto']}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="comparison"
              stroke="none"
              fill="url(#comparisonGradient)"
              name={defaultComparisonLabel}
            />
            <Area
              type="monotone"
              dataKey="primary"
              stroke="none"
              fill="url(#primaryGradient)"
              name={defaultPrimaryLabel}
            />
            <Line
              type="monotone"
              dataKey="comparison"
              stroke={chartColors.recharts.purple}
              strokeWidth={2}
              dot={false}
              name={defaultComparisonLabel}
            />
            <Line
              type="monotone"
              dataKey="primary"
              stroke={chartColors.recharts.primary}
              strokeWidth={2}
              dot={false}
              name={defaultPrimaryLabel}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showDifference && (
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={() => ''}
                stroke={baseColors.gray[500]}
                tickLine={false}
              />
              <YAxis
                stroke={baseColors.gray[500]}
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
              />
              <RechartsTooltip
                formatter={(value) => [
                  `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`,
                  t('difference'),
                ]}
                labelFormatter={(label) => formatDate(label as number)}
              />
              <ReferenceLine y={0} stroke={baseColors.gray[400]} />
              <Bar
                dataKey="difference"
                fill={chartColors.recharts.primary}
                name={t('difference')}
                radius={[2, 2, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.difference >= 0
                        ? chartColors.semantic.positive
                        : chartColors.semantic.negative
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default TimeComparisonChart;
