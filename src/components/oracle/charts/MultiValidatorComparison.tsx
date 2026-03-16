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
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';

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
  uptime: { label: '在线率', unit: '%', color: semanticColors.success.DEFAULT },
  staked: { label: '质押量', unit: ' BAND', color: chartColors.recharts.primary },
  commission: { label: '佣金率', unit: '%', color: chartColors.recharts.purple },
};

const VALIDATOR_COLORS = [
  chartColors.recharts.primary,
  semanticColors.success.DEFAULT,
  semanticColors.warning.DEFAULT,
  semanticColors.danger.DEFAULT,
];

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
    <div
      className="p-3 min-w-[180px]"
      style={{
        backgroundColor: baseColors.gray[50],
        border: `1px solid ${baseColors.gray[200]}`,
        boxShadow: shadowColors.tooltip,
      }}
    >
      <p className="text-xs mb-2 font-medium" style={{ color: baseColors.gray[600] }}>
        {label}
      </p>
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
                <span className="w-2 h-2" style={{ backgroundColor: entry.color }} />
                <span className="truncate max-w-[100px]" style={{ color: baseColors.gray[600] }}>
                  {validator.moniker}
                </span>
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
    if (change > 0.1) return `text-[${semanticColors.success.dark}]`;
    if (change < -0.1) return `text-[${semanticColors.danger.dark}]`;
    return `text-[${baseColors.gray[500]}]`;
  };

  return (
    <div className="overflow-x-auto mt-6">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: baseColors.gray[50], textAlign: 'left' }}>
            <th
              className="py-3 px-4 text-xs font-medium uppercase tracking-wider"
              style={{ color: baseColors.gray[500] }}
            >
              验证者
            </th>
            <th
              className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-right"
              style={{ color: baseColors.gray[500] }}
            >
              平均在线率
            </th>
            <th
              className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-right"
              style={{ color: baseColors.gray[500] }}
            >
              最新质押量
            </th>
            <th
              className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-right"
              style={{ color: baseColors.gray[500] }}
            >
              佣金率
            </th>
            <th
              className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-center"
              style={{ color: baseColors.gray[500] }}
            >
              变化趋势
            </th>
          </tr>
        </thead>
        <tbody style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}>
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
              <tr
                key={validator.operatorAddress}
                style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3"
                      style={{ backgroundColor: VALIDATOR_COLORS[index % VALIDATOR_COLORS.length] }}
                    />
                    <span className="font-medium" style={{ color: baseColors.gray[900] }}>
                      {validator.moniker}
                    </span>
                    <span className="text-xs" style={{ color: baseColors.gray[400] }}>
                      #{validator.rank}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium" style={{ color: baseColors.gray[900] }}>
                    {avgUptime.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium" style={{ color: baseColors.gray[900] }}>
                    {formatNumber(validator.tokens, true)} BAND
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium" style={{ color: baseColors.gray[900] }}>
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
          <div
            className="flex items-center gap-1 p-1"
            style={{ backgroundColor: baseColors.gray[100] }}
          >
            {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-2 py-1 text-xs font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: timeRange === range ? baseColors.gray[50] : 'transparent',
                  color: timeRange === range ? baseColors.primary[600] : baseColors.gray[600],
                }}
                onMouseEnter={(e) => {
                  if (timeRange !== range) {
                    e.currentTarget.style.color = baseColors.gray[900];
                  }
                }}
                onMouseLeave={(e) => {
                  if (timeRange !== range) {
                    e.currentTarget.style.color = baseColors.gray[600];
                  }
                }}
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
          <span className="text-xs mr-1" style={{ color: baseColors.gray[500] }}>
            指标:
          </span>
          {(Object.keys(METRIC_CONFIG) as MetricType[]).map((type) => (
            <button
              key={type}
              onClick={() => setMetricType(type)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor:
                  metricType === type ? baseColors.primary[600] : baseColors.gray[100],
                color: metricType === type ? baseColors.gray[50] : baseColors.gray[600],
              }}
              onMouseEnter={(e) => {
                if (metricType !== type) {
                  e.currentTarget.style.backgroundColor = baseColors.gray[200];
                }
              }}
              onMouseLeave={(e) => {
                if (metricType !== type) {
                  e.currentTarget.style.backgroundColor = baseColors.gray[100];
                }
              }}
            >
              {METRIC_CONFIG[type].label}
            </button>
          ))}
        </div>

        {loading ? (
          <ChartSkeleton height={300} showToolbar={false} variant="line" />
        ) : error ? (
          <div
            className="p-6"
            style={{
              height: 300,
              backgroundColor: semanticColors.danger.light,
              border: `1px solid ${baseColors.primary[200]}`,
            }}
          >
            <div className="flex items-center gap-3" style={{ color: semanticColors.danger.dark }}>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke={semanticColors.danger.dark}
                viewBox="0 0 24 24"
              >
                <path
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
            <div className="p-4" style={{ height: 300, backgroundColor: baseColors.gray[50] }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    stroke={chartColors.recharts.secondaryAxis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
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
                    className="w-3 h-3"
                    style={{ backgroundColor: VALIDATOR_COLORS[index % VALIDATOR_COLORS.length] }}
                  />
                  <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                    {validator.moniker}
                  </span>
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
