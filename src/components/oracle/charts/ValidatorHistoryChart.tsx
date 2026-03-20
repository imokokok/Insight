'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BandProtocolClient, ValidatorHistory, HistoryPeriod } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { chartColors } from '@/lib/config/colors';


type TimeRange = '7D' | '30D' | '90D';

interface ChartDataPoint {
  time: string;
  timestamp: number;
  uptime: number;
  stakedAmount: number;
  commissionRate: number;
}

interface ValidatorHistoryChartProps {
  client: BandProtocolClient;
  validatorAddress: string;
  height?: number;
  showToolbar?: boolean;
}

const TIME_RANGE_CONFIG: Record<TimeRange, { period: HistoryPeriod; label: string }> = {
  '7D': { period: 7, label: '7天' },
  '30D': { period: 30, label: '30天' },
  '90D': { period: 90, label: '90天' },
};

function convertHistoryData(history: ValidatorHistory[]): ChartDataPoint[] {
  return history.map((point) => {
    const date = new Date(point.timestamp);
    const timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

    return {
      time: timeLabel,
      timestamp: point.timestamp,
      uptime: point.uptime,
      stakedAmount: point.stakedAmount,
      commissionRate: point.commissionRate * 100,
    };
  });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <p className="text-gray-600 text-xs mb-2 font-medium">{label}</p>

      <div className="space-y-2">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">在线率:</span>
          <span className="text-success-600 font-mono font-medium">{data.uptime.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">质押量:</span>
          <span className="text-primary-600 font-mono font-medium">
            {formatNumber(data.stakedAmount, true)} BAND
          </span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">佣金率:</span>
          <span className="text-purple-600 font-mono font-medium">
            {data.commissionRate.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function ValidatorHistoryChart({
  client,
  validatorAddress,
  height = 350,
  showToolbar = true,
}: ValidatorHistoryChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const period = TIME_RANGE_CONFIG[timeRange].period;
      const history = await client.getValidatorHistory(validatorAddress, period);
      const chartData = convertHistoryData(history);
      setData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch validator history');
    } finally {
      setLoading(false);
    }
  }, [client, validatorAddress, timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        avgUptime: 0,
        avgStaked: 0,
        avgCommission: 0,
        uptimeChange: 0,
        stakeChange: 0,
      };
    }

    const avgUptime = data.reduce((sum, d) => sum + d.uptime, 0) / data.length;
    const avgStaked = data.reduce((sum, d) => sum + d.stakedAmount, 0) / data.length;
    const avgCommission = data.reduce((sum, d) => sum + d.commissionRate, 0) / data.length;

    const firstUptime = data[0]?.uptime || 0;
    const lastUptime = data[data.length - 1]?.uptime || 0;
    const uptimeChange = lastUptime - firstUptime;

    const firstStake = data[0]?.stakedAmount || 0;
    const lastStake = data[data.length - 1]?.stakedAmount || 0;
    const stakeChange = ((lastStake - firstStake) / firstStake) * 100;

    return {
      avgUptime,
      avgStaked,
      avgCommission,
      uptimeChange,
      stakeChange,
    };
  }, [data]);

  const yAxisDomains = useMemo(() => {
    if (data.length === 0) {
      return {
        uptime: { min: 95, max: 100 },
        staked: { min: 0, max: 10000000 },
      };
    }

    const uptimes = data.map((d) => d.uptime);
    const stakedAmounts = data.map((d) => d.stakedAmount);

    const uptimeMin = Math.min(...uptimes);
    const uptimeMax = Math.max(...uptimes);
    const uptimePadding = (uptimeMax - uptimeMin) * 0.1;

    const stakedMin = Math.min(...stakedAmounts);
    const stakedMax = Math.max(...stakedAmounts);
    const stakedPadding = (stakedMax - stakedMin) * 0.1;

    return {
      uptime: {
        min: Math.max(0, uptimeMin - uptimePadding),
        max: Math.min(100, uptimeMax + uptimePadding),
      },
      staked: {
        min: Math.max(0, stakedMin - stakedPadding),
        max: stakedMax + stakedPadding,
      },
    };
  }, [data]);

  if (loading) {
    return <ChartSkeleton height={height} showToolbar={showToolbar} variant="area" />;
  }

  if (error) {
    return (
      <div className="bg-white border border-danger-200 rounded-lg p-6" style={{ height }}>
        <div className="flex items-center gap-3 text-danger-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {showToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wider">平均在线率</p>
              <p className="text-lg font-bold text-gray-900">{stats.avgUptime.toFixed(2)}%</p>
              <p
                className={`text-xs ${stats.uptimeChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}
              >
                {stats.uptimeChange >= 0 ? '+' : ''}
                {stats.uptimeChange.toFixed(2)}%
              </p>
            </div>
            <div className="w-px h-10 bg-gray-200 hidden sm:block" />
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wider">平均质押量</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(stats.avgStaked, true)}
              </p>
              <p
                className={`text-xs ${stats.stakeChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}
              >
                {stats.stakeChange >= 0 ? '+' : ''}
                {stats.stakeChange.toFixed(2)}%
              </p>
            </div>
            <div className="w-px h-10 bg-gray-200 hidden sm:block" />
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wider">平均佣金率</p>
              <p className="text-lg font-bold text-gray-900">{stats.avgCommission.toFixed(2)}%</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
            {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {TIME_RANGE_CONFIG[range].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-gray-50 rounded p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={height - (showToolbar ? 80 : 0)}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              minTickGap={30}
            />

            <YAxis
              yAxisId="uptime"
              orientation="left"
              stroke={chartColors.recharts.success}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              domain={[yAxisDomains.uptime.min, yAxisDomains.uptime.max]}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              width={50}
            />

            <YAxis
              yAxisId="staked"
              orientation="right"
              stroke={chartColors.recharts.primary}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              domain={[yAxisDomains.staked.min, yAxisDomains.staked.max]}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              width={50}
            />

            <RechartsTooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={30}
              iconType="line"
              wrapperStyle={{ paddingBottom: '10px' }}
            />

            <Area
              yAxisId="uptime"
              type="monotone"
              dataKey="uptime"
              name="在线率 (%)"
              stroke={chartColors.recharts.success}
              strokeWidth={2}
              fill={chartColors.recharts.success}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: chartColors.recharts.success }}
            />

            <Line
              yAxisId="staked"
              type="monotone"
              dataKey="stakedAmount"
              name="质押量 (BAND)"
              stroke={chartColors.recharts.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: chartColors.recharts.primary }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-success-500" />
          <span className="text-xs text-gray-500">在线率 (%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-primary-500 rounded" />
          <span className="text-xs text-gray-500">质押量 (BAND)</span>
        </div>
      </div>
    </div>
  );
}
