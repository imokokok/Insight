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
import { DashboardCard } from '../common/DashboardCard';
import { chartColors, semanticColors, chainColors, shadowColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';
import { formatCompactNumberWithDecimals } from '@/lib/utils/format';
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, Fuel } from 'lucide-react';

import { Icon } from '@/components/ui';

const logger = createLogger('CrossChainTrendChart');

// ============================================
// 类型定义
// ============================================

export type TimeRange = '24h' | '7d' | '30d';
export type MetricType = 'price' | 'requests' | 'gas';

export interface CrossChainTrendChartProps {
  client: unknown;
  chains: string[];
  defaultMetric?: MetricType;
  defaultTimeRange?: TimeRange;
  height?: number;
}

export interface TrendDataPoint {
  time: string;
  timestamp: number;
  [chain: string]: number | string;
}

export interface ChainMetricData {
  chain: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MetricStats {
  totalValue: number;
  avgValue: number;
  maxValue: number;
  minValue: number;
  chainsData: ChainMetricData[];
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  payload: TrendDataPoint;
}

// ============================================
// 常量配置
// ============================================

const TIME_RANGE_CONFIG: Record<
  TimeRange,
  { points: number; intervalHours: number; label: string }
> = {
  '24h': { points: 24, intervalHours: 1, label: '24小时' },
  '7d': { points: 7, intervalHours: 24, label: '7天' },
  '30d': { points: 30, intervalHours: 24, label: '30天' },
};

const METRIC_CONFIG: Record<
  MetricType,
  { label: string; unit: string; icon: typeof Activity; color: string }
> = {
  price: { label: '价格', unit: '$', icon: DollarSign, color: chartColors.recharts.primary },
  requests: { label: '请求量', unit: '', icon: Activity, color: semanticColors.success.DEFAULT },
  gas: { label: 'Gas费用', unit: 'Gwei', icon: Fuel, color: semanticColors.warning.DEFAULT },
};

// 链颜色映射
const CHAIN_COLORS: Record<string, string> = {
  Ethereum: chainColors.ethereum,
  'BNB Chain': chainColors.bnbChain,
  Polygon: chainColors.polygon,
  Arbitrum: chainColors.arbitrum,
  Optimism: chainColors.optimism,
  Avalanche: chainColors.avalanche,
  Fantom: chainColors.fantom,
  Base: chainColors.base,
  zkSync: chainColors.zkSync,
  Linea: chainColors.linea,
};

// ============================================
// 数据生成函数
// ============================================

/**
 * 生成跨链趋势数据
 */
function generateCrossChainTrendData(
  chains: string[],
  timeRange: TimeRange,
  metric: MetricType
): TrendDataPoint[] {
  const now = Date.now();
  const config = TIME_RANGE_CONFIG[timeRange];
  const dataPoints: TrendDataPoint[] = [];

  // 为每个链生成基础值
  const baseValues: Record<string, number> = {};
  chains.forEach((chain) => {
    switch (metric) {
      case 'price':
        baseValues[chain] = 100 + Math.random() * 900; // $100 - $1000
        break;
      case 'requests':
        baseValues[chain] = 1000 + Math.random() * 9000; // 1000 - 10000
        break;
      case 'gas':
        baseValues[chain] = 10 + Math.random() * 90; // 10 - 100 Gwei
        break;
    }
  });

  for (let i = 0; i < config.points; i++) {
    const timestamp = now - (config.points - 1 - i) * config.intervalHours * 60 * 60 * 1000;
    const date = new Date(timestamp);

    let timeLabel: string;
    if (timeRange === '24h') {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    const point: TrendDataPoint = {
      time: timeLabel,
      timestamp,
    };

    // 为每个链生成数据点
    chains.forEach((chain) => {
      const baseValue = baseValues[chain];
      const volatility = metric === 'price' ? 0.02 : metric === 'requests' ? 0.1 : 0.15;
      const trend = Math.sin((i / config.points) * Math.PI * 2) * 0.1;
      const randomFactor = (Math.random() - 0.5) * volatility * 2;

      let value = baseValue * (1 + trend + randomFactor);

      // 确保数值合理
      value = Math.max(value, metric === 'gas' ? 1 : 0);

      // 根据指标类型格式化
      if (metric === 'price') {
        point[chain] = Number(value.toFixed(4));
      } else if (metric === 'requests') {
        point[chain] = Math.round(value);
      } else {
        point[chain] = Number(value.toFixed(2));
      }
    });

    dataPoints.push(point);
  }

  return dataPoints;
}

/**
 * 计算统计数据
 */
function calculateStats(data: TrendDataPoint[], chains: string[], metric: MetricType): MetricStats {
  if (data.length === 0) {
    return {
      totalValue: 0,
      avgValue: 0,
      maxValue: 0,
      minValue: 0,
      chainsData: [],
    };
  }

  const chainsData: ChainMetricData[] = [];
  let totalValue = 0;
  let globalMax = -Infinity;
  let globalMin = Infinity;

  chains.forEach((chain) => {
    const values = data.map((d) => d[chain] as number);
    const currentValue = values[values.length - 1];
    const previousValue = values[0];
    const changePercent =
      previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

    const _avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    globalMax = Math.max(globalMax, maxValue);
    globalMin = Math.min(globalMin, minValue);
    totalValue += currentValue;

    let trend: 'up' | 'down' | 'stable';
    if (changePercent > 2) trend = 'up';
    else if (changePercent < -2) trend = 'down';
    else trend = 'stable';

    chainsData.push({
      chain,
      currentValue,
      previousValue,
      changePercent: Number(changePercent.toFixed(2)),
      trend,
    });
  });

  return {
    totalValue: Number(totalValue.toFixed(metric === 'price' ? 4 : 2)),
    avgValue: Number((totalValue / chains.length).toFixed(metric === 'price' ? 4 : 2)),
    maxValue: Number(globalMax.toFixed(metric === 'price' ? 4 : 2)),
    minValue: Number(globalMin.toFixed(metric === 'price' ? 4 : 2)),
    chainsData,
  };
}

// ============================================
// 子组件
// ============================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  metric: MetricType;
}

function CustomTooltip({ active, payload, label, metric }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const config = METRIC_CONFIG[metric];

  return (
    <div
      className="bg-white border border-gray-200 p-3 min-w-[180px]"
      style={{ boxShadow: shadowColors.tooltip }}
    >
      <p className="text-xs text-gray-500 mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        {payload
          .filter((item) => item.value !== undefined)
          .sort((a, b) => (b.value as number) - (a.value as number))
          .map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.dataKey}</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {metric === 'price' && config.unit}
                {metric === 'requests'
                  ? formatCompactNumberWithDecimals(item.value as number)
                  : (item.value as number).toFixed(metric === 'price' ? 4 : 2)}
                {metric !== 'price' && config.unit}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

interface MetricButtonProps {
  metric: MetricType;
  currentMetric: MetricType;
  onClick: (metric: MetricType) => void;
}

function MetricButton({ metric, currentMetric, onClick }: MetricButtonProps) {
  const config = METRIC_CONFIG[metric];
  const Icon = config.icon;
  const isActive = currentMetric === metric;

  return (
    <button
      onClick={() => onClick(metric)}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
        isActive ? 'bg-white ring-1 ring-gray-200' : 'hover:bg-gray-100 text-gray-600'
      }`}
      style={{
        color: isActive ? config.color : undefined,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </button>
  );
}

interface TimeRangeButtonProps {
  range: TimeRange;
  currentRange: TimeRange;
  onClick: (range: TimeRange) => void;
}

function TimeRangeButton({ range, currentRange, onClick }: TimeRangeButtonProps) {
  const isActive = currentRange === range;
  const label = TIME_RANGE_CONFIG[range].label;

  return (
    <button
      onClick={() => onClick(range)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
        isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

interface ChainLegendItemProps {
  chain: string;
  color: string;
  data: ChainMetricData | undefined;
  metric: MetricType;
}

function ChainLegendItem({ chain, color, data, metric }: ChainLegendItemProps) {
  if (!data) return null;

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    data.trend === 'up'
      ? 'text-success-600'
      : data.trend === 'down'
        ? 'text-danger-600'
        : 'text-gray-500';

  const config = METRIC_CONFIG[metric];

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-gray-700">{chain}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-900">
          {metric === 'price' && config.unit}
          {metric === 'requests'
            ? formatCompactNumberWithDecimals(data.currentValue)
            : data.currentValue.toFixed(metric === 'price' ? 4 : 2)}
          {metric !== 'price' && config.unit}
        </span>
        <div className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>
            {data.changePercent >= 0 ? '+' : ''}
            {data.changePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function CrossChainTrendChart({
  client: _client,
  chains,
  defaultMetric = 'price',
  defaultTimeRange = '7d',
  height = 350,
}: CrossChainTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [metric, setMetric] = useState<MetricType>(defaultMetric);
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取链的颜色
  const getChainColor = useCallback((chain: string, index: number): string => {
    return CHAIN_COLORS[chain] || chartColors.sequence[index % chartColors.sequence.length];
  }, []);

  // 获取Y轴范围
  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return [0, 100];

    let min = Infinity;
    let max = -Infinity;

    chains.forEach((chain) => {
      const values = data.map((d) => d[chain] as number).filter((v) => v !== undefined);
      if (values.length > 0) {
        min = Math.min(min, ...values);
        max = Math.max(max, ...values);
      }
    });

    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [data, chains]);

  // 格式化Y轴刻度
  const formatYAxisTick = useCallback(
    (value: number): string => {
      if (metric === 'requests') {
        return formatCompactNumberWithDecimals(value);
      }
      return value.toFixed(metric === 'price' ? 2 : 0);
    },
    [metric]
  );

  // 加载数据
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockData = generateCrossChainTrendData(chains, timeRange, metric);
      setData(mockData);
    } catch (error) {
      logger.error(
        'Failed to fetch cross chain trend data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsLoading(false);
    }
  }, [chains, timeRange, metric]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 计算统计数据
  const stats = useMemo(() => calculateStats(data, chains, metric), [data, chains, metric]);

  // 当前指标配置
  const currentMetricConfig = METRIC_CONFIG[metric];

  // 标题内容
  const headerContent = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-100 p-1">
          {(Object.keys(METRIC_CONFIG) as MetricType[]).map((m) => (
            <MetricButton key={m} metric={m} currentMetric={metric} onClick={setMetric} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map((range) => (
          <TimeRangeButton
            key={range}
            range={range}
            currentRange={timeRange}
            onClick={setTimeRange}
          />
        ))}
      </div>
    </div>
  );

  return (
    <DashboardCard title={`各链${currentMetricConfig.label}趋势`} headerAction={headerContent}>
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-100 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">当前总和</p>
            <p className="text-lg font-bold text-primary-700">
              {metric === 'price' && currentMetricConfig.unit}
              {metric === 'requests'
                ? formatCompactNumberWithDecimals(stats.totalValue)
                : stats.totalValue.toFixed(metric === 'price' ? 4 : 2)}
              {metric !== 'price' && currentMetricConfig.unit}
            </p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">平均值</p>
            <p className="text-lg font-bold text-purple-700">
              {metric === 'price' && currentMetricConfig.unit}
              {metric === 'requests'
                ? formatCompactNumberWithDecimals(stats.avgValue)
                : stats.avgValue.toFixed(metric === 'price' ? 4 : 2)}
              {metric !== 'price' && currentMetricConfig.unit}
            </p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">最高值</p>
            <p className="text-lg font-bold text-success-700">
              {metric === 'price' && currentMetricConfig.unit}
              {metric === 'requests'
                ? formatCompactNumberWithDecimals(stats.maxValue)
                : stats.maxValue.toFixed(metric === 'price' ? 4 : 2)}
              {metric !== 'price' && currentMetricConfig.unit}
            </p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">最低值</p>
            <p className="text-lg font-bold text-orange-700">
              {metric === 'price' && currentMetricConfig.unit}
              {metric === 'requests'
                ? formatCompactNumberWithDecimals(stats.minValue)
                : stats.minValue.toFixed(metric === 'price' ? 4 : 2)}
              {metric !== 'price' && currentMetricConfig.unit}
            </p>
          </div>
        </div>

        {/* 图表 */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500">加载中...</p>
            </div>
          </div>
        ) : (
          <div style={{ height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.recharts.tickLight }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatYAxisTick}
                  domain={yAxisDomain}
                  width={metric === 'requests' ? 50 : 60}
                />
                <RechartsTooltip
                  content={<CustomTooltip metric={metric} />}
                  cursor={{
                    stroke: chartColors.recharts.border,
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="line"
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
                {chains.map((chain, index) => (
                  <Line
                    key={chain}
                    type="monotone"
                    dataKey={chain}
                    name={chain}
                    stroke={getChainColor(chain, index)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 链详情 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-gray-100">
          {chains.map((chain, index) => (
            <ChainLegendItem
              key={chain}
              chain={chain}
              color={getChainColor(chain, index)}
              data={stats.chainsData.find((d) => d.chain === chain)}
              metric={metric}
            />
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

export default CrossChainTrendChart;
