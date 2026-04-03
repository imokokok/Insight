'use client';

import { type ReactNode, forwardRef, memo } from 'react';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Skeleton } from './Skeleton';
import { SparklineChart } from './SparklineChart';
import { Tooltip } from './Tooltip';

export interface StatCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 变化率文本 */
  change?: string;
  /** 变化类型 */
  changeType?: 'positive' | 'negative' | 'neutral';
  /** 图标 */
  icon: ReactNode;
  /** 副标题 */
  subtitle?: string;
  /** Sparkline 图表数据 */
  sparklineData?: number[];
  /** 是否加载中 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * StatCard - 增强统计卡片组件
 *
 * 显示标题、图标、数值、变化率和趋势，支持 Sparkline 迷你趋势图和加载状态。
 * 适用于仪表盘、数据概览等场景。
 *
 * @example
 * ```tsx
 * // 基础用法
 * <StatCard
 *   title="总收入"
 *   value="¥128,430"
 *   change="+12.5%"
 *   changeType="positive"
 *   icon={<DollarSign className="w-5 h-5" />}
 * />
 *
 * // 带 Sparkline 图表
 * <StatCard
 *   title="活跃用户"
 *   value="24,521"
 *   change="+8.2%"
 *   changeType="positive"
 *   icon={<Users className="w-5 h-5" />}
 *   sparklineData={[10, 15, 12, 18, 20, 25, 22, 28, 30]}
 * />
 *
 * // 加载状态
 * <StatCard
 *   title="加载中"
 *   value="-"
 *   icon={<Loader className="w-5 h-5" />}
 *   isLoading
 * />
 * ```
 */
const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      change,
      changeType = 'neutral',
      icon,
      subtitle,
      sparklineData,
      isLoading = false,
      className,
      ...props
    },
    ref
  ) => {
    // 变化类型对应的样式
    const changeStyles = {
      positive: {
        text: 'text-success-600',
        bg: 'bg-success-50',
        icon: TrendingUp,
      },
      negative: {
        text: 'text-danger-600',
        bg: 'bg-danger-50',
        icon: TrendingDown,
      },
      neutral: {
        text: 'text-gray-600',
        bg: 'bg-gray-100',
        icon: Minus,
      },
    };

    const { text: changeTextColor, bg: changeBgColor, icon: ChangeIcon } = changeStyles[changeType];

    // 加载状态渲染
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative bg-white rounded-xl border border-gray-200 p-5',
            'transition-all duration-200',
            className
          )}
          {...props}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton variant="text" width={80} height={14} />
              <Skeleton variant="text" width={120} height={32} />
              <Skeleton variant="text" width={60} height={20} />
            </div>
            <Skeleton variant="circular" width={44} height={44} />
          </div>
          {sparklineData && (
            <div className="mt-4">
              <Skeleton variant="rounded" width="100%" height={40} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          // 基础样式
          'relative bg-white rounded-xl border border-gray-200 p-5',
          // 过渡动画
          'transition-all duration-300 ease-out',
          // 悬停效果：阴影和轻微上移
          'hover:shadow-lg hover:-translate-y-1 hover:border-gray-300',
          className
        )}
        {...props}
      >
        {/* 头部：标题和图标 */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <Tooltip content={title} placement="top" delay={300} className="w-full">
              <p className="text-sm font-medium text-gray-500 truncate cursor-default">{title}</p>
            </Tooltip>

            {/* 数值 */}
            <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums tracking-tight">
              {value}
            </p>

            {/* 变化率和趋势 */}
            {change && (
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    changeTextColor,
                    changeBgColor
                  )}
                >
                  <ChangeIcon className="w-3 h-3" aria-hidden="true" />
                  <span>{change}</span>
                </span>
                {subtitle && (
                  <Tooltip
                    content={subtitle}
                    placement="bottom"
                    delay={300}
                    className="flex-1 min-w-0"
                  >
                    <span className="text-xs text-gray-400 truncate cursor-default block">
                      {subtitle}
                    </span>
                  </Tooltip>
                )}
              </div>
            )}

            {/* 仅副标题（无变化率时） */}
            {!change && subtitle && (
              <Tooltip content={subtitle} placement="bottom" delay={300} className="w-full">
                <p className="text-xs text-gray-400 mt-2 truncate cursor-default">{subtitle}</p>
              </Tooltip>
            )}
          </div>

          {/* 图标 */}
          <div
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0',
              'bg-gray-50 text-gray-600',
              'transition-colors duration-200',
              'group-hover:bg-gray-100'
            )}
          >
            {icon}
          </div>
        </div>

        {/* Sparkline 迷你趋势图 */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <SparklineChart
                data={sparklineData}
                width={120}
                height={40}
                fill
                animate
                className="flex-1"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

const MemoizedStatCard = memo(StatCard);
MemoizedStatCard.displayName = 'StatCard';

export default MemoizedStatCard;
export { MemoizedStatCard as StatCard };
