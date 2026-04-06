'use client';

/**
 * @fileoverview 质量趋势图表组件
 * @description 展示变异系数/标准差的时间序列变化
 */

import { memo } from 'react';

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
function _generateMockHistory(_currentMetrics: ProfessionalQualityMetrics): TrendDataPoint[] {
  throw new Error('Mock data is disabled. Please provide real quality metrics data.');
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

function QualityTrendChartComponent({ metrics: _metrics, t, className }: QualityTrendChartProps) {
  const data: TrendDataPoint[] = [];

  // 计算阈值线
  const cvThreshold = 0.5; // 0.5% CV阈值

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.quality.trendTitle')}
        </h4>
        <span className="text-xs text-gray-500 ml-auto">
          {t('crossOracle.quality.last10Minutes')}
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
              name={t('crossOracle.quality.cv')}
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
              name={t('crossOracle.quality.stdDev')}
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
          <span className="text-gray-600">{t('crossOracle.quality.cv')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-emerald-500" />
          <span className="text-gray-600">{t('crossOracle.quality.stdDev')}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-4 h-0 border-t border-dashed border-red-400" />
          <span className="text-gray-500">{t('crossOracle.quality.cvThreshold')}</span>
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
