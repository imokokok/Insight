'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { Activity, Zap, TrendingUp, Clock } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';
import { formatCompactNumberWithDecimals } from '@/lib/utils/format';

interface ThroughputDataPoint {
  timestamp: string;
  rps: number;
  successRate: number;
  avgLatency: number;
}

interface ThroughputStats {
  currentRps: number;
  peakRps: number;
  avgSuccessRate: number;
  avgLatency: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface RealtimeThroughputMonitorProps {
  className?: string;
  autoUpdate?: boolean;
  updateInterval?: number;
}

const generateThroughputData = (points: number = 60): ThroughputDataPoint[] => {
  const data: ThroughputDataPoint[] = [];
  const now = new Date();
  const baseRps = 12500;

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 1000);
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;

    const trend = Math.sin(i / 10) * 0.2;
    const randomFactor = (Math.random() - 0.5) * 0.3;
    const rps = Math.round(baseRps * (1 + trend + randomFactor));

    const successRate = 99.5 + Math.random() * 0.5;
    const avgLatency = 140 + Math.random() * 60;

    data.push({
      timestamp: timeStr,
      rps: Math.max(rps, 8000),
      successRate: Number(successRate.toFixed(2)),
      avgLatency: Number(avgLatency.toFixed(1)),
    });
  }

  return data;
};

export function RealtimeThroughputMonitor({
  className,
  autoUpdate = true,
  updateInterval = 2000,
}: RealtimeThroughputMonitorProps) {
  const t = useTranslations();
  const [data, setData] = useState<ThroughputDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'rps' | 'successRate' | 'latency'>('rps');

  const fetchData = useCallback(() => {
    setIsLoading(true);
    const newData = generateThroughputData(60);
    setData(newData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(() => {
      setData((prevData) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const baseRps = 12500;
        const trend = Math.sin(Date.now() / 10000) * 0.2;
        const randomFactor = (Math.random() - 0.5) * 0.3;
        const rps = Math.round(baseRps * (1 + trend + randomFactor));

        const newPoint: ThroughputDataPoint = {
          timestamp: timeStr,
          rps: Math.max(rps, 8000),
          successRate: Number((99.5 + Math.random() * 0.5).toFixed(2)),
          avgLatency: Number((140 + Math.random() * 60).toFixed(1)),
        };

        return [...prevData.slice(1), newPoint];
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval]);

  const stats = useMemo<ThroughputStats>(() => {
    if (data.length === 0) {
      return {
        currentRps: 0,
        peakRps: 0,
        avgSuccessRate: 0,
        avgLatency: 0,
        trend: 'stable',
        trendValue: 0,
      };
    }

    const currentRps = data[data.length - 1].rps;
    const peakRps = Math.max(...data.map((d) => d.rps));
    const avgSuccessRate = data.reduce((sum, d) => sum + d.successRate, 0) / data.length;
    const avgLatency = data.reduce((sum, d) => sum + d.avgLatency, 0) / data.length;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.rps, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.rps, 0) / secondHalf.length;
    const trendValue = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (trendValue > 2) trend = 'up';
    else if (trendValue < -2) trend = 'down';

    return {
      currentRps,
      peakRps,
      avgSuccessRate: Number(avgSuccessRate.toFixed(2)),
      avgLatency: Number(avgLatency.toFixed(1)),
      trend,
      trendValue: Number(trendValue.toFixed(2)),
    };
  }, [data]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ThroughputDataPoint }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-[180px]">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t('chainlink.network.rps')}</span>
              <span className="text-xs font-semibold text-blue-600">
                {formatCompactNumberWithDecimals(dataPoint.rps)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t('chainlink.network.successRate')}</span>
              <span className="text-xs font-semibold text-emerald-600">
                {dataPoint.successRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t('chainlink.network.latency')}</span>
              <span className="text-xs font-semibold text-purple-600">
                {dataPoint.avgLatency}ms
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const metricButtons = [
    { key: 'rps' as const, label: t('chainlink.network.rps'), color: 'blue' },
    { key: 'successRate' as const, label: t('chainlink.network.successRate'), color: 'emerald' },
    { key: 'latency' as const, label: t('chainlink.network.latency'), color: 'purple' },
  ];

  const getChartColor = () => {
    switch (selectedMetric) {
      case 'rps':
        return chartColors.recharts.primary;
      case 'successRate':
        return semanticColors.success.DEFAULT;
      case 'latency':
        return chartColors.recharts.purple;
      default:
        return chartColors.recharts.primary;
    }
  };

  const getChartDataKey = () => {
    switch (selectedMetric) {
      case 'rps':
        return 'rps';
      case 'successRate':
        return 'successRate';
      case 'latency':
        return 'avgLatency';
      default:
        return 'rps';
    }
  };

  const getYAxisDomain = () => {
    switch (selectedMetric) {
      case 'rps':
        return [8000, 16000];
      case 'successRate':
        return [99, 100];
      case 'latency':
        return [100, 250];
      default:
        return ['auto', 'auto'];
    }
  };

  return (
    <DashboardCard
      title={
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <span>{t('chainlink.network.realtimeThroughputMonitor')}</span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2">
          {metricButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setSelectedMetric(btn.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                selectedMetric === btn.key
                  ? `bg-${btn.color}-600 text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">{t('chainlink.network.currentRps')}</span>
            </div>
            <p className="text-xl font-bold text-blue-700">
              {formatCompactNumberWithDecimals(stats.currentRps)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp
                className={cn(
                  'w-3 h-3',
                  stats.trend === 'up'
                    ? 'text-emerald-500'
                    : stats.trend === 'down'
                      ? 'text-red-500'
                      : 'text-gray-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  stats.trend === 'up'
                    ? 'text-emerald-600'
                    : stats.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-500'
                )}
              >
                {stats.trendValue >= 0 ? '+' : ''}
                {stats.trendValue}%
              </span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600">{t('chainlink.network.peakRps')}</span>
            </div>
            <p className="text-xl font-bold text-amber-700">
              {formatCompactNumberWithDecimals(stats.peakRps)}
            </p>
            <p className="text-xs text-amber-600 mt-1">{t('chainlink.network.lastHour')}</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-600">
                {t('chainlink.network.avgSuccessRate')}
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-700">{stats.avgSuccessRate}%</p>
            <p className="text-xs text-emerald-600 mt-1">{t('chainlink.network.excellent')}</p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600">{t('chainlink.network.avgLatency')}</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{stats.avgLatency}ms</p>
            <p className="text-xs text-purple-600 mt-1">{t('chainlink.network.optimal')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">{t('chainlink.network.loading')}</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={getChartColor()} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.gridLight}
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: chartColors.recharts.tickLight }}
                  axisLine={{ stroke: chartColors.recharts.gridLight }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.recharts.tickLight }}
                  axisLine={false}
                  tickLine={false}
                  domain={getYAxisDomain()}
                  tickFormatter={(value) =>
                    selectedMetric === 'rps'
                      ? formatCompactNumberWithDecimals(value)
                      : selectedMetric === 'successRate'
                        ? `${value}%`
                        : `${value}ms`
                  }
                  width={50}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={
                    selectedMetric === 'rps' ? 12500 : selectedMetric === 'successRate' ? 99.5 : 170
                  }
                  stroke={chartColors.recharts.gridLight}
                  strokeDasharray="5 5"
                />
                <Area
                  type="monotone"
                  dataKey={getChartDataKey()}
                  stroke={getChartColor()}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                  dot={false}
                  activeDot={{ r: 5, fill: getChartColor(), stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getChartColor() }} />
              <span className="text-xs text-gray-600">
                {selectedMetric === 'rps'
                  ? t('chainlink.network.requestsPerSecond')
                  : selectedMetric === 'successRate'
                    ? t('chainlink.network.successRatePercentage')
                    : t('chainlink.network.responseTimeMs')}
              </span>
            </div>
          </div>
          {autoUpdate && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-500">{t('chainlink.network.realtime')}</span>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
