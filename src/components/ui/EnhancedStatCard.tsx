'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, TrendingDown, Info } from 'lucide-react';

import { SparklineChart } from '@/components/charts/SparklineChart';
import { cn } from '@/lib/utils';

/**
 * Breakdown 数据项接口
 */
interface BreakdownItem {
  label: string;
  value: string | number;
  percentage: number;
}

/**
 * Change 数据接口
 */
interface ChangeData {
  value: number;
  percentage?: boolean;
  timeframe?: string;
}

/**
 * Benchmark 数据接口
 */
interface BenchmarkData {
  label: string;
  value: number;
}

/**
 * EnhancedStatCard Props 接口
 */
export interface EnhancedStatCardProps {
  /** 标题 */
  title: string;
  /** 主值 */
  value: string | number;
  /** 变化数据 */
  change?: ChangeData;
  /** Sparkline 图表数据 */
  sparklineData?: number[];
  /** 细分数据（hover 时显示） */
  breakdown?: BreakdownItem[];
  /** 基准对比数据 */
  benchmark?: BenchmarkData;
  /** 变体：紧凑或标准 */
  variant?: 'compact' | 'standard';
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化变化值显示
 */
function formatChangeValue(value: number, isPercentage?: boolean): string {
  const sign = value >= 0 ? '+' : '';
  const suffix = isPercentage ? '%' : '';
  return `${sign}${value.toFixed(2)}${suffix}`;
}

/**
 * EnhancedStatCard - 增强型统计卡片组件
 *
 * 显示关键指标的主值、变化趋势、迷你图表，并支持 hover 查看细分数据。
 * 适用于仪表盘、市场概览等场景。
 *
 * @example
 * ```tsx
 * // 基础用法
 * <EnhancedStatCard
 *   title="Total Value"
 *   value="$1.2M"
 *   change={{ value: 5.2, percentage: true, timeframe: '24h' }}
 *   sparklineData={[1, 2, 3, 2, 4, 5, 4, 6]}
 * />
 *
 * // 带细分数据
 * <EnhancedStatCard
 *   title="Volume"
 *   value="8,432"
 *   change={{ value: -2.1, percentage: true }}
 *   breakdown={[
 *     { label: 'Ethereum', value: '5,200', percentage: 61.6 },
 *     { label: 'Arbitrum', value: '2,100', percentage: 24.9 },
 *     { label: 'Others', value: '1,132', percentage: 13.5 },
 *   ]}
 * />
 *
 * // 紧凑模式
 * <EnhancedStatCard
 *   title="Price"
 *   value="$45,230"
 *   variant="compact"
 *   sparklineData={[45, 46, 44, 47, 45, 48]}
 * />
 * ```
 */
export function EnhancedStatCard({
  title,
  value,
  change,
  sparklineData,
  breakdown,
  benchmark,
  variant = 'standard',
  className,
}: EnhancedStatCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isPositive = change ? change.value >= 0 : true;
  const changeColor = isPositive ? 'text-success-500' : 'text-danger-500';
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  const isCompact = variant === 'compact';

  // 计算 sparkline 颜色（基于变化方向）
  const sparklineColor = useMemo(() => {
    if (!change) return undefined;
    return isPositive ? '#10b981' : '#ef4444';
  }, [change, isPositive]);

  return (
    <div
      className={cn(
        // 基础样式
        'relative bg-white rounded-lg border border-gray-200',
        'transition-all duration-200 ease-out',
        'hover:border-gray-300 hover:shadow-md',
        // 尺寸
        isCompact ? 'p-3' : 'p-4',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn('font-medium text-gray-600', isCompact ? 'text-xs' : 'text-sm')}>
          {title}
        </span>
        {breakdown && <Info className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />}
      </div>

      {/* 主值和变化指示器 */}
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={cn(
            'font-semibold text-gray-900 tabular-nums',
            isCompact ? 'text-lg' : 'text-2xl'
          )}
        >
          {value}
        </span>
        {change && (
          <div className={cn('flex items-center gap-0.5', changeColor)}>
            <ChangeIcon
              className={cn('flex-shrink-0', isCompact ? 'w-3 h-3' : 'w-4 h-4')}
              aria-hidden="true"
            />
            <span className={cn('font-medium tabular-nums', isCompact ? 'text-xs' : 'text-sm')}>
              {formatChangeValue(change.value, change.percentage)}
            </span>
          </div>
        )}
      </div>

      {/* 时间范围标签（仅在标准模式下显示） */}
      {!isCompact && change?.timeframe && (
        <div className="text-xs text-gray-500 mb-2">{change.timeframe}</div>
      )}

      {/* Sparkline 图表和基准对比 */}
      <div className="flex items-center justify-between">
        {sparklineData && sparklineData.length > 0 && (
          <SparklineChart
            data={sparklineData}
            width={isCompact ? 80 : 120}
            height={isCompact ? 28 : 40}
            color={sparklineColor}
            fill
            animate={!isCompact}
          />
        )}

        {/* 基准对比 */}
        {benchmark && !isCompact && (
          <div className="text-right ml-4">
            <div className="text-xs text-gray-500">{benchmark.label}</div>
            <div className="text-sm font-medium text-gray-700 tabular-nums">
              {benchmark.value >= 1000000
                ? `${(benchmark.value / 1000000).toFixed(1)}M`
                : benchmark.value >= 1000
                  ? `${(benchmark.value / 1000).toFixed(1)}K`
                  : benchmark.value.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Hover 时的 Breakdown Tooltip */}
      {breakdown && isHovered && (
        <div
          className={cn(
            'absolute z-50 left-0 right-0',
            'bg-white rounded-lg border border-gray-200 shadow-lg',
            'p-3 animate-in fade-in zoom-in-95 duration-150',
            // 位置：根据卡片位置调整
            'top-full mt-2'
          )}
        >
          <div className="text-xs font-medium text-gray-500 mb-2">Breakdown</div>
          <div className="space-y-1.5">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 进度条 */}
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 tabular-nums">
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* 小三角箭头 */}
          <div
            className="absolute -top-1 left-6 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

export default EnhancedStatCard;
