'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { DashboardCard } from '../common/DashboardCard';
import { formatCompactNumberWithDecimals } from '@/lib/utils/format';
import { useTranslations } from 'next-intl';
import { createLogger } from '@/lib/utils/logger';
import { chartColors } from '@/lib/config/colors';


const logger = createLogger('RequestTrendChart');

type TimeRange = '24h' | '7d' | '30d';

interface RequestTrendChartProps {
  client: BandProtocolClient;
  autoUpdate?: boolean;
  updateInterval?: number;
}

interface TrendDataPoint {
  timestamp: number;
  time: string;
  requests: number;
  avgLatency: number;
  successRate: number;
}

interface TrendStats {
  avgRequests: number;
  peakRequests: number;
  growthRate: number;
  totalRequests: number;
  avgSuccessRate: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TrendDataPoint;
  }>;
  label?: string;
}

const generateMockTrendData = (range: TimeRange): TrendDataPoint[] => {
  const now = Date.now();
  const data: TrendDataPoint[] = [];

  const config = {
    '24h': { points: 24, intervalMs: 60 * 60 * 1000, format: 'hour' },
    '7d': { points: 7 * 24, intervalMs: 60 * 60 * 1000, format: 'hour' },
    '30d': { points: 30, intervalMs: 24 * 60 * 60 * 1000, format: 'day' },
  };

  const { points, intervalMs, format } = config[range];
  const baseRequests = range === '24h' ? 350 : range === '7d' ? 8000 : 55000;

  for (let i = 0; i < points; i++) {
    const timestamp = now - (points - 1 - i) * intervalMs;
    const date = new Date(timestamp);

    let time: string;
    if (format === 'hour') {
      time = `${date.getHours().toString().padStart(2, '0')}:00`;
    } else {
      time = `${date.getMonth() + 1}/${date.getDate()}`;
    }

    const trend = Math.sin(i / (points / 4)) * 0.15;
    const randomFactor = (Math.random() - 0.5) * 0.3;
    const divisor = range === '24h' ? 1 : range === '7d' ? 24 : 1;
    const requests = Math.round((baseRequests * (1 + trend + randomFactor)) / divisor);
    const avgLatency = 150 + Math.random() * 100;
    const successRate = 98 + Math.random() * 2;

    data.push({
      timestamp,
      time,
      requests: Math.max(requests, 10),
      avgLatency: Number(avgLatency.toFixed(1)),
      successRate: Number(successRate.toFixed(2)),
    });
  }

  return data;
};

export function RequestTrendChart({
  client: _client,
  autoUpdate = false,
  updateInterval = 30000,
}: RequestTrendChartProps) {
  const t = useTranslations();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getTimeUnit = useCallback(
    (range: TimeRange): string => {
      return range === '30d' ? t('requestTrend.day') : t('requestTrend.hour');
    },
    [t]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const mockData = generateMockTrendData(timeRange);
      setData(mockData);
    } catch (error) {
      logger.error(
        'Failed to fetch request trend data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(fetchData, updateInterval);
    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval, fetchData]);

  const stats = useMemo<TrendStats>(() => {
    if (data.length === 0) {
      return {
        avgRequests: 0,
        peakRequests: 0,
        growthRate: 0,
        totalRequests: 0,
        avgSuccessRate: 0,
      };
    }

    const totalRequests = data.reduce((sum, d) => sum + d.requests, 0);
    const avgRequests = Math.round(totalRequests / data.length);
    const peakRequests = Math.max(...data.map((d) => d.requests));
    const avgSuccessRate = data.reduce((sum, d) => sum + d.successRate, 0) / data.length;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.requests, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.requests, 0) / secondHalf.length;
    const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
      avgRequests,
      peakRequests,
      growthRate: Number(growthRate.toFixed(2)),
      totalRequests,
      avgSuccessRate: Number(avgSuccessRate.toFixed(2)),
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200   p-3 min-w-[160px]">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t('requestTrend.requests')}</span>
              <span className="text-xs font-semibold text-primary-600">
                {formatCompactNumberWithDecimals(dataPoint.requests)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t('requestTrend.avgLatency')}</span>
              <span className="text-xs font-semibold text-purple-600">
                {dataPoint.avgLatency}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t('requestTrend.successRate')}</span>
              <span className="text-xs font-semibold text-success-600">{dataPoint.successRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const timeRangeButtons = [
    { key: '24h' as TimeRange, label: t('requestTrend.timeRange24h') },
    { key: '7d' as TimeRange, label: t('requestTrend.timeRange7d') },
    { key: '30d' as TimeRange, label: t('requestTrend.timeRange30d') },
  ];

  return (
    <DashboardCard
      title={t('requestTrend.title')}
      headerAction={
        <div className="flex items-center gap-2">
          {timeRangeButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setTimeRange(btn.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === btn.key
                  ? 'bg-primary-500 text-white '
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-100 border border-gray-200 ">
            <p className="text-xs text-gray-600 mb-1">{t('requestTrend.avgRequests')}</p>
            <p className="text-xl font-bold text-primary-700">
              {formatCompactNumberWithDecimals(stats.avgRequests)}
            </p>
            <p className="text-xs text-primary-600 mt-0.5">
              {t('requestTrend.per')}
              {getTimeUnit(timeRange)}
            </p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200 ">
            <p className="text-xs text-gray-600 mb-1">{t('requestTrend.peakRequests')}</p>
            <p className="text-xl font-bold text-purple-700">
              {formatCompactNumberWithDecimals(stats.peakRequests)}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">{t('requestTrend.peakRecord')}</p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200 ">
            <p className="text-xs text-gray-600 mb-1">{t('requestTrend.growthRate')}</p>
            <p className="text-xl font-bold text-success-700">
              {stats.growthRate >= 0 ? '+' : ''}
              {stats.growthRate}%
            </p>
            <p className="text-xs text-success-600 mt-0.5">{t('requestTrend.secondHalfPeriod')}</p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200 ">
            <p className="text-xs text-gray-600 mb-1">{t('requestTrend.totalRequests')}</p>
            <p className="text-xl font-bold text-orange-700">
              {formatCompactNumberWithDecimals(stats.totalRequests)}
            </p>
            <p className="text-xs text-warning-600 mt-0.5">{t('requestTrend.cumulativeRequests')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent  animate-spin" />
              <p className="text-sm text-gray-500">{t('requestTrend.loading')}</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.recharts.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.recharts.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.gridLight}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: chartColors.recharts.tickLight }}
                  axisLine={{ stroke: chartColors.recharts.gridLight }}
                  tickLine={false}
                  interval={timeRange === '7d' ? 5 : 'preserveStartEnd'}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.recharts.tickLight }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCompactNumberWithDecimals(value)}
                  width={50}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  name={t('requestTrend.requests')}
                  stroke={chartColors.recharts.primary}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: chartColors.recharts.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3  bg-primary-500" />
              <span className="text-xs text-gray-600">{t('requestTrend.requests')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoUpdate && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2  bg-success-500 animate-pulse" />
                <span className="text-xs text-gray-500">{t('requestTrend.realtimeUpdate')}</span>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-500">{t('requestTrend.avgSuccessRate')}</p>
              <p className="text-sm font-bold text-success-600">{stats.avgSuccessRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
