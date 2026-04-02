'use client';

/**
 * @fileoverview 质量趋势图表组件
 * @description 展示变异系数/标准差的时间序列变化
 */

import { memo, useMemo } from 'react';

import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { cn } from '@/lib/utils';

import type { ProfessionalQualityMetrics } from '../../hooks/useDataQualityScore';

// ============================================================================
// 类型定义
// ============================================================================

interface QualityTrendChartProps {
  metrics: ProfessionalQualityMetrics;
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// 模拟历史数据点（实际项目中应从API获取）
interface TrendDataPoint {
  time: string;
  cv: number;
  stdDev: number;
  sampleSize: number;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成模拟历史数据
 * 实际项目中应替换为真实历史数据
 */
function generateMockHistory(currentMetrics: ProfessionalQualityMetrics): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const now = new Date();

  // 生成最近10个时间点的数据
  for (let i = 9; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 每分钟一个点
    const timeStr = time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 添加一些随机波动
    const randomFactor = 0.8 + Math.random() * 0.4;
    const cv = currentMetrics.coefficientOfVariation * randomFactor;
    const stdDev = currentMetrics.standardDeviation * randomFactor;

    data.push({
      time: timeStr,
      cv: Number((cv * 100).toFixed(3)), // 转为百分比
      stdDev: Number(stdDev.toFixed(4)),
      sampleSize: currentMetrics.sampleSize,
    });
  }

  return data;
}

/**
 * 格式化Y轴数值
 */
function formatYAxis(value: number): string {
  return value.toFixed(2);
}

// ============================================================================
// 自定义Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-mono font-medium text-gray-900">
            {entry.name.includes('CV') ? `${entry.value}%` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function QualityTrendChartComponent({ metrics, t, className }: QualityTrendChartProps) {
  // 生成历史数据
  const data = useMemo(() => generateMockHistory(metrics), [metrics]);

  // 计算阈值线
  const cvThreshold = 0.5; // 0.5% CV阈值

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.quality.trendTitle') || '一致性趋势'}
        </h4>
        <span className="text-xs text-gray-500 ml-auto">
          {t('crossOracle.quality.last10Minutes') || '最近10分钟'}
        </span>
      </div>

      {/* 图表 */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `${value}%`}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={formatYAxis}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* CV阈值线 */}
            <ReferenceLine
              yAxisId="left"
              y={cvThreshold}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={1}
            />

            {/* 变异系数线 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cv"
              name={t('crossOracle.quality.cv') || '变异系数 (%)'}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#3b82f6' }}
            />

            {/* 标准差线 */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="stdDev"
              name={t('crossOracle.quality.stdDev') || '标准差'}
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-blue-500" />
          <span className="text-gray-600">{t('crossOracle.quality.cv') || '变异系数 (%)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-emerald-500" />
          <span className="text-gray-600">{t('crossOracle.quality.stdDev') || '标准差'}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-4 h-0 border-t border-dashed border-red-400" />
          <span className="text-gray-500">
            {t('crossOracle.quality.cvThreshold') || 'CV阈值 (0.5%)'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const QualityTrendChart = memo(QualityTrendChartComponent);
QualityTrendChart.displayName = 'QualityTrendChart';

export default QualityTrendChart;
