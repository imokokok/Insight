'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { TooltipProps } from '@/types/ui/recharts';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { useTranslations } from '@/i18n';


interface TrendDataPoint {
  month: string;
  monthShort: string;
  newSources: number;
  cumulative: number;
}

function getMockTrendData(t: (key: string) => string): TrendDataPoint[] {
  return [
    {
      month: '2025-03',
      monthShort: t('charts.dataSourceTrend.months.mar'),
      newSources: 18,
      cumulative: 380,
    },
    {
      month: '2025-04',
      monthShort: t('charts.dataSourceTrend.months.apr'),
      newSources: 22,
      cumulative: 402,
    },
    {
      month: '2025-05',
      monthShort: t('charts.dataSourceTrend.months.may'),
      newSources: 15,
      cumulative: 417,
    },
    {
      month: '2025-06',
      monthShort: t('charts.dataSourceTrend.months.jun'),
      newSources: 28,
      cumulative: 445,
    },
    {
      month: '2025-07',
      monthShort: t('charts.dataSourceTrend.months.jul'),
      newSources: 32,
      cumulative: 477,
    },
    {
      month: '2025-08',
      monthShort: t('charts.dataSourceTrend.months.aug'),
      newSources: 25,
      cumulative: 502,
    },
    {
      month: '2025-09',
      monthShort: t('charts.dataSourceTrend.months.sep'),
      newSources: 20,
      cumulative: 522,
    },
    {
      month: '2025-10',
      monthShort: t('charts.dataSourceTrend.months.oct'),
      newSources: 18,
      cumulative: 540,
    },
    {
      month: '2025-11',
      monthShort: t('charts.dataSourceTrend.months.nov'),
      newSources: 24,
      cumulative: 564,
    },
    {
      month: '2025-12',
      monthShort: t('charts.dataSourceTrend.months.dec'),
      newSources: 30,
      cumulative: 594,
    },
    {
      month: '2026-01',
      monthShort: t('charts.dataSourceTrend.months.jan'),
      newSources: 35,
      cumulative: 629,
    },
    {
      month: '2026-02',
      monthShort: t('charts.dataSourceTrend.months.feb'),
      newSources: 28,
      cumulative: 657,
    },
  ];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<TrendDataPoint>) => {
  const t = useTranslations();
  if (active && payload && payload.length) {
    return (
      <div
        className="p-3"
        style={{ backgroundColor: 'white', border: `1px solid ${baseColors.gray[200]}` }}
      >
        <p className="text-sm font-medium mb-2" style={{ color: baseColors.gray[900] }}>
          {label}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.purple }} />
            <span className="text-xs" style={{ color: baseColors.gray[600] }}>
              {t('charts.dataSourceTrend.newSources')}:
            </span>
            <span className="text-xs font-semibold" style={{ color: baseColors.gray[900] }}>
              {payload[0].value}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.primary }} />
            <span className="text-xs" style={{ color: baseColors.gray[600] }}>
              {t('charts.dataSourceTrend.cumulativeSources')}:
            </span>
            <span className="text-xs font-semibold" style={{ color: baseColors.gray[900] }}>
              {payload[1].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function DataSourceTrend() {
  const t = useTranslations();
  const mockTrendData = getMockTrendData(t);

  const stats = useMemo(() => {
    const totalNew = mockTrendData.reduce((sum, item) => sum + item.newSources, 0);
    const avgMonthly = Math.round(totalNew / mockTrendData.length);
    const lastMonth = mockTrendData[mockTrendData.length - 1];
    const prevMonth = mockTrendData[mockTrendData.length - 2];
    const growth = prevMonth
      ? (((lastMonth.newSources - prevMonth.newSources) / prevMonth.newSources) * 100).toFixed(1)
      : '0';

    return {
      totalNew,
      avgMonthly,
      lastMonthNew: lastMonth.newSources,
      growth: parseFloat(growth),
      currentTotal: lastMonth.cumulative,
    };
  }, [mockTrendData]);

  return (
    <DashboardCard title={t('charts.dataSourceTrend.title')}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div
            className="p-3"
            style={{
              backgroundColor: baseColors.gray[100],
              border: `1px solid ${baseColors.gray[200]}`,
            }}
          >
            <p className="text-xs mb-1" style={{ color: baseColors.gray[600] }}>
              {t('charts.dataSourceTrend.yearlyNew')}
            </p>
            <p className="text-xl font-bold" style={{ color: chartColors.recharts.purpleDark }}>
              {stats.totalNew}
            </p>
            <p className="text-xs mt-0.5" style={{ color: chartColors.recharts.purple }}>
              {t('charts.dataSourceTrend.sources')}
            </p>
          </div>
          <div
            className="p-3"
            style={{
              backgroundColor: baseColors.gray[100],
              border: `1px solid ${baseColors.gray[200]}`,
            }}
          >
            <p className="text-xs mb-1" style={{ color: baseColors.gray[600] }}>
              {t('charts.dataSourceTrend.monthlyAvg')}
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.primary[700] }}>
              {stats.avgMonthly}
            </p>
            <p className="text-xs mt-0.5" style={{ color: baseColors.primary[600] }}>
              {t('charts.dataSourceTrend.sources')}
            </p>
          </div>
          <div
            className="p-3"
            style={{
              backgroundColor: baseColors.gray[100],
              border: `1px solid ${baseColors.gray[200]}`,
            }}
          >
            <p className="text-xs mb-1" style={{ color: baseColors.gray[600] }}>
              {t('charts.dataSourceTrend.monthOverMonth')}
            </p>
            <p className="text-xl font-bold" style={{ color: semanticColors.success.dark }}>
              {stats.growth >= 0 ? '+' : ''}
              {stats.growth}%
            </p>
            <p className="text-xs mt-0.5" style={{ color: semanticColors.success.DEFAULT }}>
              {t('charts.dataSourceTrend.vsLastMonth')}
            </p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.recharts.purple} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.recharts.purple} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.recharts.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.recharts.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} vertical={false} />
              <XAxis
                dataKey="monthShort"
                tick={{ fontSize: 11, fill: baseColors.gray[500] }}
                axisLine={{ stroke: baseColors.gray[200] }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: baseColors.gray[500] }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: baseColors.gray[500] }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                    {value}
                  </span>
                )}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="newSources"
                name={t('charts.dataSourceTrend.newSources')}
                stroke={chartColors.recharts.purple}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNew)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name={t('charts.dataSourceTrend.cumulativeSources')}
                stroke={chartColors.recharts.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCumulative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.purple }} />
              <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                {t('charts.dataSourceTrend.newSources')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.primary }} />
              <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                {t('charts.dataSourceTrend.cumulativeSources')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.dataSourceTrend.currentTotal')}
            </p>
            <p className="text-sm font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.currentTotal} {t('charts.dataSourceTrend.sources')}
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
