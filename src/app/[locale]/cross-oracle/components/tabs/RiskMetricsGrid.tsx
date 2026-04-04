'use client';

/**
 * @fileoverview 核心风险指标卡片组组件
 * @description 展示价格波动率、数据一致性、异常检测敏感度、系统健康度四个核心指标
 */

import { memo } from 'react';

import {
  Activity,
  GitMerge,
  Target,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface RiskMetricsGridProps {
  volatility: number; // 价格波动率 0-100
  consistency: number; // 数据一致性评分 0-100
  sensitivity: number; // 异常检测敏感度 0-100
  health: number; // 系统健康度 0-100
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface MetricItem {
  key: string;
  name: string;
  value: number;
  icon: React.ReactNode;
  unit: string;
  description: string;
  inverseColor: boolean; // 是否为反向颜色逻辑（值越低越好）
  trend: 'up' | 'down' | 'flat';
  trendValue: number; // 趋势百分比
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 根据数值获取颜色配置
 * @param value 数值 0-100
 * @param inverse 是否反向逻辑（越低越好）
 */
function getColorConfig(value: number, inverse: boolean = false) {
  const effectiveValue = inverse ? 100 - value : value;

  if (effectiveValue >= 80) {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      trend: 'text-emerald-600 bg-emerald-50',
    };
  }

  if (effectiveValue >= 60) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100',
      trend: 'text-amber-600 bg-amber-50',
    };
  }

  return {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: 'text-rose-600',
    iconBg: 'bg-rose-100',
    trend: 'text-rose-600 bg-rose-50',
  };
}

/**
 * 格式化趋势百分比
 */
function formatTrendValue(value: number): string {
  const absValue = Math.abs(value);
  return `${value >= 0 ? '+' : '-'}${absValue.toFixed(1)}%`;
}

// ============================================================================
// 指标卡片组件
// ============================================================================

interface MetricCardProps {
  metric: MetricItem;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function MetricCard({ metric, t }: MetricCardProps) {
  const colors = getColorConfig(metric.value, metric.inverseColor);

  const trendIcon =
    metric.trend === 'up' ? (
      <TrendingUp className="w-3.5 h-3.5" />
    ) : metric.trend === 'down' ? (
      <TrendingDown className="w-3.5 h-3.5" />
    ) : (
      <Minus className="w-3.5 h-3.5" />
    );

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-5
        transition-all duration-200 hover:shadow-md
        ${colors.bg} ${colors.border}
      `}
    >
      {/* 图标 */}
      <div className={`inline-flex p-2 rounded-lg ${colors.iconBg} ${colors.icon} mb-4`}>
        {metric.icon}
      </div>

      {/* 指标名称 */}
      <div className={`text-sm font-medium ${colors.text} opacity-80 mb-1`}>{metric.name}</div>

      {/* 数值 */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-3xl font-bold ${colors.text}`}>{metric.value.toFixed(1)}</span>
        <span className={`text-sm ${colors.text} opacity-70`}>{metric.unit}</span>
      </div>

      {/* 描述 */}
      <div className={`text-xs ${colors.text} opacity-60 mb-4`}>{metric.description}</div>

      {/* 趋势指示器 */}
      <div className="flex items-center gap-2">
        <div
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${metric.trend === 'flat' ? 'text-gray-600 bg-white/60' : colors.trend}
          `}
        >
          {trendIcon}
          <span>{formatTrendValue(metric.trendValue)}</span>
        </div>
        <span className={`text-xs ${colors.text} opacity-50`}>
          {t('crossOracle.metrics.vsLastPeriod')}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskMetricsGridComponent({
  volatility,
  consistency,
  sensitivity,
  health,
  t,
}: RiskMetricsGridProps) {
  const metrics: MetricItem[] = [
    {
      key: 'volatility',
      name: t('crossOracle.metrics.volatility'),
      value: volatility,
      icon: <Activity className="w-5 h-5" />,
      unit: '%',
      description: t('crossOracle.metrics.volatilityDesc'),
      inverseColor: true, // 波动率越低越好
      trend: volatility > 50 ? 'up' : 'down',
      trendValue: volatility > 50 ? 5.2 : -3.8,
    },
    {
      key: 'consistency',
      name: t('crossOracle.metrics.consistency'),
      value: consistency,
      icon: <GitMerge className="w-5 h-5" />,
      unit: '%',
      description: t('crossOracle.metrics.consistencyDesc'),
      inverseColor: false,
      trend: consistency > 80 ? 'up' : consistency > 60 ? 'flat' : 'down',
      trendValue: consistency > 80 ? 2.5 : consistency > 60 ? 0 : -4.2,
    },
    {
      key: 'sensitivity',
      name: t('crossOracle.metrics.sensitivity'),
      value: sensitivity,
      icon: <Target className="w-5 h-5" />,
      unit: '%',
      description: t('crossOracle.metrics.sensitivityDesc'),
      inverseColor: false,
      trend: sensitivity > 85 ? 'up' : sensitivity > 70 ? 'flat' : 'down',
      trendValue: sensitivity > 85 ? 1.8 : sensitivity > 70 ? 0.5 : -2.1,
    },
    {
      key: 'health',
      name: t('crossOracle.metrics.health'),
      value: health,
      icon: <HeartPulse className="w-5 h-5" />,
      unit: '%',
      description: t('crossOracle.metrics.healthDesc'),
      inverseColor: false,
      trend: health > 90 ? 'up' : health > 75 ? 'flat' : 'down',
      trendValue: health > 90 ? 3.2 : health > 75 ? 0.8 : -5.5,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} t={t} />
      ))}
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskMetricsGrid = memo(RiskMetricsGridComponent);
RiskMetricsGrid.displayName = 'RiskMetricsGrid';

export default RiskMetricsGrid;
