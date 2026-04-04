'use client';

/**
 * @fileoverview 专业质量指标头部组件
 * @description 紧凑展示核心统计指标：CV、SEM、置信区间、样本数
 */

import { memo } from 'react';

import { Activity, BarChart2, TrendingUp, Database, Info } from 'lucide-react';

import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

import type { ProfessionalQualityMetrics } from '../../hooks/useDataQualityScore';

// ============================================================================
// 类型定义
// ============================================================================

interface QualityMetricsHeaderProps {
  metrics: ProfessionalQualityMetrics;
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化变异系数显示
 */
function formatCV(cv: number): string {
  return `${(cv * 100).toFixed(2)}%`;
}

/**
 * 格式化标准误差显示
 */
function formatSEM(sem: number): string {
  return sem.toFixed(4);
}

/**
 * 格式化价格显示
 */
function formatPrice(price: number): string {
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/**
 * 获取变异系数颜色
 */
function getCVColorClass(cv: number): string {
  if (cv < 0.001) return 'text-emerald-600';
  if (cv < 0.005) return 'text-blue-600';
  if (cv < 0.01) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 获取变异系数背景色
 */
function getCVBgClass(cv: number): string {
  if (cv < 0.001) return 'bg-emerald-50';
  if (cv < 0.005) return 'bg-blue-50';
  if (cv < 0.01) return 'bg-yellow-50';
  return 'bg-red-50';
}

// ============================================================================
// 指标项组件
// ============================================================================

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  tooltip: string;
  colorClass?: string;
  bgClass?: string;
}

function MetricItem({
  icon,
  label,
  value,
  subValue,
  tooltip,
  colorClass = 'text-gray-900',
  bgClass = 'bg-gray-50',
}: MetricItemProps) {
  return (
    <Tooltip content={tooltip} placement="bottom" delay={100}>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200',
          'hover:shadow-sm cursor-help',
          bgClass,
          'border-gray-200'
        )}
      >
        <div className="p-2 rounded-md bg-white shadow-sm">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-lg font-bold tabular-nums', colorClass)}>{value}</span>
            {subValue && <span className="text-xs text-gray-400">{subValue}</span>}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function QualityMetricsHeaderComponent({ metrics, t, className }: QualityMetricsHeaderProps) {
  const cvColorClass = getCVColorClass(metrics.coefficientOfVariation);
  const cvBgClass = getCVBgClass(metrics.coefficientOfVariation);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3', className)}>
      {/* 变异系数 CV */}
      <MetricItem
        icon={<Activity className={cn('w-4 h-4', cvColorClass)} />}
        label={t('crossOracle.quality.cv')}
        value={formatCV(metrics.coefficientOfVariation)}
        tooltip={
          t('crossOracle.quality.cvTooltip') ||
          '变异系数 = 标准差 / 平均值。衡量数据离散程度的相对指标，值越小表示数据越一致。'
        }
        colorClass={cvColorClass}
        bgClass={cvBgClass}
      />

      {/* 标准误差 SEM */}
      <MetricItem
        icon={<BarChart2 className="w-4 h-4 text-blue-600" />}
        label={t('crossOracle.quality.sem')}
        value={formatSEM(metrics.standardError)}
        tooltip={
          t('crossOracle.quality.semTooltip') ||
          '标准误差 = 标准差 / √n。衡量样本均值估计精度的指标，值越小表示估计越精确。'
        }
        colorClass="text-blue-600"
        bgClass="bg-blue-50"
      />

      {/* 95%置信区间 */}
      <MetricItem
        icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
        label={t('crossOracle.quality.ci')}
        value={`${formatPrice(metrics.confidenceIntervalLower)} - ${formatPrice(
          metrics.confidenceIntervalUpper
        )}`}
        tooltip={
          t('crossOracle.quality.ciTooltip') ||
          '95%置信区间表示真实均值有95%的概率落在此范围内。区间越窄表示估计越精确。'
        }
        colorClass="text-purple-600"
        bgClass="bg-purple-50"
      />

      {/* 样本数量 */}
      <MetricItem
        icon={<Database className="w-4 h-4 text-gray-600" />}
        label={t('crossOracle.quality.sampleSize')}
        value={metrics.sampleSize.toString()}
        tooltip={
          t('crossOracle.quality.sampleSizeTooltip') ||
          '参与统计计算的有效数据点数量。样本量越大，统计结果越可靠。'
        }
        colorClass="text-gray-700"
        bgClass="bg-gray-50"
      />

      {/* 中位数价格 */}
      <MetricItem
        icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        label={t('crossOracle.quality.medianPrice')}
        value={formatPrice(metrics.median)}
        subValue={`μ=${formatPrice(metrics.mean)}`}
        tooltip={
          t('crossOracle.quality.medianTooltip') ||
          '中位数价格是所有价格排序后的中间值，不受极端值影响。μ表示平均值。'
        }
        colorClass="text-emerald-600"
        bgClass="bg-emerald-50"
      />
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const QualityMetricsHeader = memo(QualityMetricsHeaderComponent);
QualityMetricsHeader.displayName = 'QualityMetricsHeader';

export default QualityMetricsHeader;
