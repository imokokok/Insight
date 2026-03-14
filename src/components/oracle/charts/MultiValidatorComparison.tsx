'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BandProtocolClient, ValidatorInfo, HistoryPeriod } from '@/lib/oracles/bandProtocol';
import { DashboardCard } from '../common/DashboardCard';
import { formatNumber } from '@/lib/utils/format';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';

type MetricType = 'uptime' | 'staked' | 'commission';
type TimeRange = '7D' | '30D' | '90D';

interface ValidatorHistoryData {
  timestamp: number;
  uptime: number;
  stakedAmount: number;
  commissionRate: number;
}

export interface MultiValidatorComparisonProps {
  validators: ValidatorInfo[];
  client: BandProtocolClient;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  [key: string]: string | number;
}

const TIME_RANGE_CONFIG: Record<TimeRange, { period: HistoryPeriod; label: string }> = {
  '7D': { period: 7, label: '7天' },
  '30D': { period: 30, label: '30天' },
  '90D': { period: 90, label: '90天' },
};

const METRIC_CONFIG: Record<MetricType, { label: string; unit: string; color: string }> = {
  uptime: { label: '在线率', unit: '%', color: '#10b981' },
  staked: { label: '质押量', unit: ' BAND', color: '#3b82f6' },
  commission: { label: '佣金率', unit: '%', color: '#8b5cf6' },
};

const VALIDATOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function CustomTooltip({
  active,
  payload,
  label,
  metricType,
  validators,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  metricType: MetricType;
  validators: ValidatorInfo[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const config = METRIC_CONFIG[metricType];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="text-gray-600 text-xs mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const validator = validators[index];
          if (!validator) return null;

          let value = entry.value;
          if (metricType === 'staked') {
            value = Number((value / 1000000).toFixed(2));
          } else {
            value = Number(value.toFixed(2));
          }

          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600 truncate max-w-[100px]">{validator.moniker}</span>
              </div>
              <span className="font-mono font-medium" style={{ color: entry.color }}>
                {value}
                {config.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonTable({
  validators,
  historyData,
}: {
  validators: ValidatorInfo[];
  historyData: Map<string, ValidatorHistoryData[]>;
}) {
  const getTrendIcon = (change: number) => {
    if (change > 0.1) return '↗';
    if (change < -0.1) return '↘';
    return '→';
  };

  const getTrendColor = (change: number) => {
    if (change > 0.1) return 'text-green-600';
    if (change < -0.1) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="overflow-x-auto mt-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              验证者
            </th>
            <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              平均在线率
            </th>
            <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              最新质押量
            </th>
            <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              佣金率
            </th>
            <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
              变化趋势
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {validators.map((validator, index) => {
            const history = historyData.get(validator.operatorAddress) || [];
            const avgUptime =
              history.length > 0
                ? history.reduce((sum, h) => sum + h.uptime, 0) / history.length
                : validator.uptime;

            const firstUptime = history[0]?.uptime || validator.uptime;
            const lastUptime = history[history.length - 1]?.uptime || validator.uptime;
            const uptimeChange = lastUptime - firstUptime;

            return (
              <tr key={validator.operatorAddress} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: VALIDATOR_COLORS[index % VALIDATOR_COLORS.length] }}
                    />
                    <span className="font-medium text-gray-900">{validator.moniker}</span>
                    <span className="text-xs text-gray-400">#{validator.rank}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium text-gray-900">
                    {avgUptime.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium text-gray-900">
                    {formatNumber(validator.tokens, true)} BAND
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium text-gray-900">
                    {(validator.commissionRate * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-medium ${getTrendColor(uptimeChange)}`}>
                    {getTrendIcon(uptimeChange)} {Math.abs(uptimeChange).toFixed(2)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MultiValidatorComparison({ validators, client }: MultiValidatorComparisonProps) {
  const [metricType, setMetricType] = useState<MetricType>('uptime');
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [historyData, setHistoryData] = useState<Map<string, ValidatorHistoryData[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoryData = useCallback(async () => {
    if (validators.length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const period = TIME_RANGE_CONFIG[timeRange].period;
      const newHistoryData = new Map<string, ValidatorHistoryData[]>();

      await Promise.all(
        validators.map(async (validator) => {
          const history = await client.getValidatorHistory(validator.operatorAddress, period);
          newHistoryData.set(validator.operatorAddress, history);
        })
      );

      setHistoryData(newHistoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch validator history');
    } finally {
      setLoading(false);
    }
  }, [validators, client, timeRange]);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (historyData.size === 0 || validators.length === 0) return [];

    const firstValidator = validators[0];
    const firstHistory = historyData.get(firstValidator.operatorAddress) || [];

    return firstHistory.map((point, index) => {
      const date = new Date(point.timestamp);
      const timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      const dataPoint: ChartDataPoint = {
        time: timeLabel,
        timestamp: point.timestamp,
      };

      validators.forEach((validator, vIndex) => {
        const history = historyData.get(validator.operatorAddress);
        if (history && history[index]) {
          const key = `validator_${vIndex}`;
          switch (metricType) {
            case 'uptime':
              dataPoint[key] = history[index].uptime;
              break;
            case 'staked':
              dataPoint[key] = history[index].stakedAmount;
              break;
            case 'commission':
              dataPoint[key] = history[index].commissionRate * 100;
              break;
          }
        }
      });

      return dataPoint;
    });
  }, [historyData, validators, metricType]);

  const yAxisConfig = useMemo(() => {
    if (chartData.length === 0) {
      switch (metricType) {
        case 'uptime':
          return { min: 95, max: 100, tickFormatter: (v: number) => `${v}%` };
        case 'staked':
          return {
            min: 0,
            max: 10000000,
            tickFormatter: (v: number) => `${(v / 1000000).toFixed(1)}M`,
          };
        case 'commission':
          return { min: 0, max: 30, tickFormatter: (v: number) => `${v}%` };
      }
    }

    const values: number[] = [];
    validators.forEach((_, vIndex) => {
      const key = `validator_${vIndex}`;
      chartData.forEach((d) => {
        if (typeof d[key] === 'number') {
          values.push(d[key] as number);
        }
      });
    });

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;

    switch (metricType) {
      case 'uptime':
        return {
          min: Math.max(0, min - padding),
          max: Math.min(100, max + padding),
          tickFormatter: (v: number) => `${v.toFixed(0)}%`,
        };
      case 'staked':
        return {
          min: Math.max(0, min - padding),
          max: max + padding,
          tickFormatter: (v: number) => `${(v / 1000000).toFixed(1)}M`,
        };
      case 'commission':
        return {
          min: Math.max(0, min - padding),
          max: Math.min(100, max + padding),
          tickFormatter: (v: number) => `${v.toFixed(1)}%`,
        };
    }
  }, [chartData, metricType, validators.length]);

  if (validators.length < 2) return null;

  return (
    <DashboardCard
      title="多验证者历史对比"
      headerAction={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {TIME_RANGE_CONFIG[range].label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">指标:</span>
          {(Object.keys(METRIC_CONFIG) as MetricType[]).map((type) => (
            <button
              key={type}
              onClick={() => setMetricType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                metricType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {METRIC_CONFIG[type].label}
            </button>
          ))}
        </div>

        {loading ? (
          <ChartSkeleton height={300} showToolbar={false} variant="line" />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6" style={{ height: 300 }}>
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-4" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
                    domain={[yAxisConfig.min, yAxisConfig.max]}
                    tickFormatter={yAxisConfig.tickFormatter}
                    width={50}
                  />
                  <Tooltip
                    content={<CustomTooltip metricType={metricType} validators={validators} />}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    iconType="line"
                    wrapperStyle={{ paddingBottom: '10px' }}
                    formatter={(value, entry) => {
                      const index = parseInt(value.replace('validator_', ''));
                      const validator = validators[index];
                      return validator ? validator.moniker : value;
                    }}
                  />
                  {validators.map((validator, index) => (
                    <Line
                      key={validator.operatorAddress}
                      type="monotone"
                      dataKey={`validator_${index}`}
                      name={validator.moniker}
                      stroke={VALIDATOR_COLORS[index % VALIDATOR_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              {validators.map((validator, index) => (
                <div key={validator.operatorAddress} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: VALIDATOR_COLORS[index % VALIDATOR_COLORS.length] }}
                  />
                  <span className="text-xs text-gray-600">{validator.moniker}</span>
                </div>
              ))}
            </div>

            <ComparisonTable validators={validators} historyData={historyData} />
          </>
        )}
      </div>
    </DashboardCard>
  );
}
