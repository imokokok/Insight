'use client';

import { useState, memo } from 'react';

import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { SparklineChart } from '@/components/ui/SparklineChart';
import { Tooltip } from '@/components/ui/Tooltip';
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
 * EnhancedStatCard Props 接口
 */
export interface EnhancedStatCardProps {
  /** 标题 */
  title: string;
  /** 主值 */
  value: number | string;
  /** 变化百分比（新接口） */
  change?: number;
  /** 变化数据（旧接口兼容） */
  changeData?: {
    value: number;
    percentage?: boolean;
    timeframe?: string;
  };
  /** 趋势方向 */
  trend?: 'up' | 'down' | 'stable';
  /** Sparkline 图表数据 (24小时趋势数据) */
  sparklineData?: number[];
  /** 置信度 (0-100) */
  confidence?: number;
  /** 细分数据（hover 时显示） */
  breakdown?: BreakdownItem[];
  /** 变体：紧凑或标准 */
  variant?: 'compact' | 'standard';
  /** 是否加载中 */
  isLoading?: boolean;
  /** 悬停提示内容 */
  tooltipContent?: string;
  /** 自定义类名 */
  className?: string;
  /** ARIA role */
  role?: string;
  /** ARIA label */
  'aria-label'?: string;
}

/**
 * 格式化数值显示
 */
function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;

  // 处理大数值
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }

  // 处理小数
  if (value < 1 && value > -1) {
    return value.toFixed(4);
  }

  return value.toFixed(2);
}

/**
 * 格式化变化值显示
 */
function formatChangeValue(value: number, isPercentage: boolean = true): string {
  const sign = value >= 0 ? '+' : '';
  const suffix = isPercentage ? '%' : '';
  return `${sign}${value.toFixed(2)}${suffix}`;
}

/**
 * 圆形进度条组件
 */
function CircularProgress({
  value,
  size = 40,
  strokeWidth = 3,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  // 根据置信度确定颜色
  const getColor = () => {
    if (value >= 80) return 'var(--success-500, #10b981)';
    if (value >= 60) return 'var(--warning-500, #f59e0b)';
    return 'var(--danger-500, #ef4444)';
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* 中心文字 */}
      <span className="absolute text-xs font-medium text-gray-600 dark:text-gray-400">
        {Math.round(value)}
      </span>
    </div>
  );
}

/**
 * 线性进度条组件
 */
function LinearProgress({ value, className }: { value: number; className?: string }) {
  // 根据置信度确定颜色
  const getColor = () => {
    if (value >= 80) return 'bg-success-500';
    if (value >= 60) return 'bg-warning-500';
    return 'bg-danger-500';
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">置信度</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {Math.round(value)}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', getColor())}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 加载状态骨架屏
 */
function EnhancedStatCardSkeleton({ variant = 'standard' }: { variant?: 'compact' | 'standard' }) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm',
        isCompact ? 'p-3' : 'p-4'
      )}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" width={isCompact ? 60 : 80} height={isCompact ? 12 : 16} />
        <Skeleton variant="circular" width={isCompact ? 12 : 16} height={isCompact ? 12 : 16} />
      </div>

      {/* 主值 */}
      <div className="flex items-baseline gap-2 mb-3">
        <Skeleton variant="text" width={isCompact ? 80 : 120} height={isCompact ? 24 : 32} />
        {!isCompact && <Skeleton variant="text" width={60} height={20} />}
      </div>

      {/* Sparkline 占位 */}
      <Skeleton variant="rounded" width="100%" height={isCompact ? 28 : 40} className="mb-3" />

      {/* 置信度进度条 */}
      {!isCompact && <Skeleton variant="text" width="100%" height={24} />}
    </div>
  );
}

/**
 * EnhancedStatCard - 增强型统计卡片组件
 *
 * 功能特性：
 * - 大字数值显示和趋势指示（箭头+颜色）
 * - 集成 SparklineChart 迷你趋势图
 * - 置信度进度条指示器（圆形或线性）
 * - 细分数据展示（hover 时显示）
 * - 悬停效果显示详细信息（Tooltip）
 * - 加载状态支持（Skeleton）
 * - 暗色模式支持
 *
 * @example
 * ```tsx
 * // 基础用法（新接口）
 * <EnhancedStatCard
 *   title="总交易量"
 *   value={1234567}
 *   change={5.2}
 *   trend="up"
 *   sparklineData={[1, 2, 3, 2, 4, 5, 4, 6]}
 *   confidence={85}
 * />
 *
 * // 兼容旧接口
 * <EnhancedStatCard
 *   title="TVS"
 *   value="$1.2B"
 *   changeData={{ value: 5.2, percentage: true, timeframe: '24h' }}
 *   sparklineData={[1, 2, 3, 2, 4, 5, 4, 6]}
 *   breakdown={[{ label: 'ETH', value: '1B', percentage: 80 }]}
 *   variant="compact"
 * />
 *
 * // 加载状态
 * <EnhancedStatCard
 *   title="加载中..."
 *   value={0}
 *   isLoading={true}
 * />
 *
 * // 带 Tooltip
 * <EnhancedStatCard
 *   title="预测价格"
 *   value={45230}
 *   change={-2.1}
 *   trend="down"
 *   confidence={72}
 *   tooltipContent="基于过去24小时数据预测的BTC价格"
 * />
 * ```
 */
function EnhancedStatCard({
  title,
  value,
  change,
  changeData,
  trend = 'stable',
  sparklineData,
  confidence,
  breakdown,
  variant = 'standard',
  isLoading = false,
  tooltipContent,
  className,
  role,
  'aria-label': ariaLabel,
}: EnhancedStatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompact = variant === 'compact';

  // 加载状态
  if (isLoading) {
    return <EnhancedStatCardSkeleton variant={variant} />;
  }

  // 确定变化值（兼容新旧接口）
  const changeValue = change !== undefined ? change : changeData?.value;
  const isPercentage = changeData?.percentage ?? true;

  // 确定趋势方向和颜色
  const isPositive = changeValue ? changeValue > 0 : trend === 'up';
  const isNegative = changeValue ? changeValue < 0 : trend === 'down';

  // 趋势颜色
  const trendColorClass = isPositive
    ? 'text-success-500'
    : isNegative
      ? 'text-danger-500'
      : 'text-gray-500';

  // 趋势图标
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  // Sparkline 颜色
  const sparklineColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280';

  // 卡片内容
  const cardContent = (
    <div
      className={cn(
        // 基础样式
        'relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'shadow-sm hover:shadow-md transition-all duration-200 ease-out',
        'hover:border-gray-300 dark:hover:border-gray-600',
        isCompact ? 'p-3' : 'p-4',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={role}
      aria-label={ariaLabel}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'font-medium text-gray-600 dark:text-gray-400',
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {title}
        </span>
        {(breakdown || tooltipContent) && (
          <Info
            className={cn(
              'text-gray-400 dark:text-gray-500',
              isCompact ? 'w-3 h-3' : 'w-4 h-4',
              tooltipContent && 'cursor-help'
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* 主值和变化指示器 */}
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={cn(
            'font-bold text-gray-900 dark:text-white tabular-nums',
            isCompact ? 'text-lg' : 'text-2xl'
          )}
        >
          {formatValue(value)}
        </span>
        {changeValue !== undefined && (
          <div className={cn('flex items-center gap-0.5', trendColorClass)}>
            <TrendIcon
              className={cn('flex-shrink-0', isCompact ? 'w-3 h-3' : 'w-4 h-4')}
              aria-hidden="true"
            />
            <span className={cn('font-medium tabular-nums', isCompact ? 'text-xs' : 'text-sm')}>
              {formatChangeValue(changeValue, isPercentage)}
            </span>
          </div>
        )}
      </div>

      {/* 时间范围标签（仅在标准模式下显示） */}
      {!isCompact && changeData?.timeframe && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{changeData.timeframe}</div>
      )}

      {/* Sparkline 图表 */}
      {sparklineData && sparklineData.length > 0 && (
        <div className={cn('flex items-center justify-between', !isCompact && 'mb-3')}>
          <SparklineChart
            data={sparklineData}
            width={isCompact ? 80 : 120}
            height={isCompact ? 28 : 40}
            color={sparklineColor}
            fill
            animate={!isCompact}
          />
        </div>
      )}

      {/* 置信度指示器（仅在标准模式下显示） */}
      {!isCompact && confidence !== undefined && (
        <LinearProgress value={Math.max(0, Math.min(100, confidence))} />
      )}

      {/* Hover 时的 Breakdown Tooltip */}
      {breakdown && isHovered && (
        <div
          className={cn(
            'absolute z-50 left-0 right-0',
            'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg',
            'p-3 animate-in fade-in zoom-in-95 duration-150',
            'top-full mt-2'
          )}
        >
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Breakdown</div>
          <div className="space-y-1.5">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 进度条 */}
                  <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-200 tabular-nums">
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-10 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* 小三角箭头 */}
          <div
            className="absolute -top-1 left-6 w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );

  // 如果有 tooltipContent 且没有 breakdown，包裹在 Tooltip 组件中
  if (tooltipContent && !breakdown) {
    return (
      <Tooltip content={tooltipContent} placement="top">
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
}

const MemoizedEnhancedStatCard = memo(EnhancedStatCard);
MemoizedEnhancedStatCard.displayName = 'EnhancedStatCard';

export default MemoizedEnhancedStatCard;
export { MemoizedEnhancedStatCard as EnhancedStatCard };
