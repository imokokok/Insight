'use client';

/**
 * @fileoverview 风险趋势折线图组件
 * @description 展示风险评分和异常数量的趋势变化
 */

import { memo, useMemo } from 'react';

import { TrendingUp, AlertCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';

import { chartColors, semanticColors, shadowColors } from '@/lib/config/colors';

// ============================================================================
// 类型定义
// ============================================================================

export interface RiskDataPoint {
  timestamp: number;
  riskScore: number;
  anomalyCount: number;
  event?: string;
}

export type TimeRange = '1H' | '24H' | '7D';

export interface RiskTrendChartProps {
  data: RiskDataPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface ChartDataPoint extends RiskDataPoint {
  timeLabel: string;
  riskLevel: string;
}

interface TooltipPayloadEntry {
  value: number;
  dataKey: string;
  payload: ChartDataPoint;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成模拟数据
 */
function generateMockData(_timeRange: TimeRange): RiskDataPoint[] {
  throw new Error('Mock data is disabled. Please provide real risk data.');
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number, timeRange: TimeRange): string {
  const date = new Date(timestamp);

  switch (timeRange) {
    case '1H':
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '24H':
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '7D':
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    default:
      return date.toLocaleTimeString('zh-CN');
  }
}

/**
 * 获取风险等级
 */
function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * 获取风险等级颜色
 */
function getRiskLevelColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return semanticColors.danger.DEFAULT;
    case 'medium':
      return semanticColors.warning.DEFAULT;
    case 'low':
      return semanticColors.success.DEFAULT;
    default:
      return semanticColors.neutral.DEFAULT;
  }
}

/**
 * 获取风险等级背景色
 */
function getRiskLevelBgColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return semanticColors.danger.light;
    case 'medium':
      return semanticColors.warning.light;
    case 'low':
      return semanticColors.success.light;
    default:
      return semanticColors.neutral.light;
  }
}

// ============================================================================
// Tooltip 组件
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function CustomTooltip({ active, payload, label, t }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const riskLevel = getRiskLevel(dataPoint.riskScore);
  const riskColor = getRiskLevelColor(riskLevel);
  const riskBgColor = getRiskLevelBgColor(riskLevel);

  return (
    <div
      className="bg-white p-3 border border-gray-200 rounded-lg min-w-[180px]"
      style={{ boxShadow: shadowColors.tooltip }}
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t('crossOracle.risk.riskScore')}</span>
          <span
            className="text-sm font-bold px-2 py-0.5 rounded"
            style={{ color: riskColor, backgroundColor: riskBgColor }}
          >
            {dataPoint.riskScore}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t('crossOracle.risk.anomalyCount')}</span>
          <span className="text-sm font-medium text-gray-900">{dataPoint.anomalyCount}</span>
        </div>
        {dataPoint.event && (
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">{t('crossOracle.risk.event')}</span>
            <p className="text-xs font-medium text-red-600 mt-0.5">{dataPoint.event}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 时间范围切换按钮组件
// ============================================================================

interface TimeRangeButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TimeRangeButton({ label, isActive, onClick }: TimeRangeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
        ${
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskTrendChartComponent({ data, timeRange, onTimeRangeChange, t }: RiskTrendChartProps) {
  // 如果没有数据，不使用模拟数据
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return [];
    }
    return data.map((point) => ({
      ...point,
      timeLabel: formatTimestamp(point.timestamp, timeRange),
      riskLevel: getRiskLevel(point.riskScore),
    }));
  }, [data, timeRange]);

  // 统计数据
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgRisk: 0,
        maxRisk: 0,
        totalAnomalies: 0,
        currentRisk: 0,
      };
    }

    const riskScores = chartData.map((d) => d.riskScore);
    const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
    const maxRisk = Math.max(...riskScores);
    const totalAnomalies = chartData.reduce((a, b) => a + b.anomalyCount, 0);
    const currentRisk = riskScores[riskScores.length - 1];

    return {
      avgRisk: Math.round(avgRisk),
      maxRisk,
      totalAnomalies,
      currentRisk,
    };
  }, [chartData]);

  // 当前风险等级
  const currentRiskLevel = getRiskLevel(stats.currentRisk);
  const currentRiskColor = getRiskLevelColor(currentRiskLevel);

  // 事件点数据
  const eventPoints = useMemo(() => {
    return chartData.filter((d) => d.event);
  }, [chartData]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: currentRiskColor + '20' }}>
            <TrendingUp className="w-4 h-4" style={{ color: currentRiskColor }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t('crossOracle.risk.trendTitle')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('crossOracle.risk.currentScore')}:{' '}
              <span className="font-medium" style={{ color: currentRiskColor }}>
                {stats.currentRisk}
              </span>
            </p>
          </div>
        </div>

        {/* 时间范围切换按钮组 */}
        <div className="flex items-center gap-1">
          <TimeRangeButton
            label={t('crossOracle.timeRange.1H') || '1H'}
            isActive={timeRange === '1H'}
            onClick={() => onTimeRangeChange('1H')}
          />
          <TimeRangeButton
            label={t('crossOracle.timeRange.24H') || '24H'}
            isActive={timeRange === '24H'}
            onClick={() => onTimeRangeChange('24H')}
          />
          <TimeRangeButton
            label={t('crossOracle.timeRange.7D') || '7D'}
            isActive={timeRange === '7D'}
            onClick={() => onTimeRangeChange('7D')}
          />
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-500">{t('crossOracle.risk.avgScore')}</p>
          <p
            className="text-lg font-bold"
            style={{ color: getRiskLevelColor(getRiskLevel(stats.avgRisk)) }}
          >
            {stats.avgRisk}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-500">{t('crossOracle.risk.maxScore')}</p>
          <p
            className="text-lg font-bold"
            style={{ color: getRiskLevelColor(getRiskLevel(stats.maxRisk)) }}
          >
            {stats.maxRisk}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-500">{t('crossOracle.risk.totalAnomalies')}</p>
          <p className="text-lg font-bold text-gray-900">{stats.totalAnomalies}</p>
        </div>
      </div>

      {/* 图表区域 */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {/* 高风险区域渐变 */}
              <linearGradient id="riskGradientHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={semanticColors.danger.DEFAULT} stopOpacity={0.3} />
                <stop offset="95%" stopColor={semanticColors.danger.DEFAULT} stopOpacity={0.05} />
              </linearGradient>
              {/* 中风险区域渐变 */}
              <linearGradient id="riskGradientMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={semanticColors.warning.DEFAULT} stopOpacity={0.3} />
                <stop offset="95%" stopColor={semanticColors.warning.DEFAULT} stopOpacity={0.05} />
              </linearGradient>
              {/* 低风险区域渐变 */}
              <linearGradient id="riskGradientLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={semanticColors.success.DEFAULT} stopOpacity={0.3} />
                <stop offset="95%" stopColor={semanticColors.success.DEFAULT} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              vertical={false}
            />

            <XAxis
              dataKey="timeLabel"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              minTickGap={30}
            />

            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}`}
            />

            <RechartsTooltip content={<CustomTooltip t={t} />} />

            {/* 风险等级参考线 */}
            <ReferenceLine
              y={70}
              stroke={semanticColors.danger.DEFAULT}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={40}
              stroke={semanticColors.warning.DEFAULT}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            {/* 风险评分区域 */}
            <Area
              type="monotone"
              dataKey="riskScore"
              stroke={chartColors.recharts.primary}
              strokeWidth={2}
              fill="url(#riskGradientHigh)"
              fillOpacity={1}
              dot={(props: { cx?: number; cy?: number; payload?: { riskScore: number } }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload) return null;

                const riskLevel = getRiskLevel(payload.riskScore);
                const color = getRiskLevelColor(riskLevel);
                const r = riskLevel === 'high' ? 4 : riskLevel === 'medium' ? 3 : 2;

                return <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={1} />;
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />

            {/* 事件标记点 */}
            {eventPoints.map((point, index) => (
              <ReferenceDot
                key={`event-${index}`}
                x={point.timeLabel}
                y={point.riskScore}
                r={6}
                fill={semanticColors.danger.DEFAULT}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 图例说明 */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: semanticColors.success.DEFAULT }}
          />
          <span className="text-xs text-gray-500">{t('crossOracle.risk.low')} (&lt;40)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: semanticColors.warning.DEFAULT }}
          />
          <span className="text-xs text-gray-500">{t('crossOracle.risk.medium')} (40-70)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: semanticColors.danger.DEFAULT }}
          />
          <span className="text-xs text-gray-500">{t('crossOracle.risk.high')} (&gt;70)</span>
        </div>
        {eventPoints.length > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-gray-500">{t('crossOracle.risk.eventMarker')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskTrendChart = memo(RiskTrendChartComponent);
RiskTrendChart.displayName = 'RiskTrendChart';

export default RiskTrendChart;
