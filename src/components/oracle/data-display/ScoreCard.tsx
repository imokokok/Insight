'use client';

import { type ReactNode, forwardRef, memo } from 'react';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getScoreColor, getScoreBarColor } from '@/lib/utils/riskUtils';

export type ScoreTrend = 'up' | 'down' | 'stable' | 'neutral';
export type ScoreVariant = 'default' | 'compact' | 'minimal';

export interface ScoreCardProps {
  title: string;
  score: number;
  description?: string;
  trend?: ScoreTrend;
  trendValue?: string;
  icon?: ReactNode;
  label?: string;
  showProgress?: boolean;
  showMaxScore?: boolean;
  variant?: ScoreVariant;
  className?: string;
  scoreFormatter?: (score: number) => string;
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: 'text-success-600',
    bgColor: 'bg-success-50',
  },
  down: {
    icon: TrendingDown,
    color: 'text-danger-600',
    bgColor: 'bg-danger-50',
  },
  stable: {
    icon: Minus,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  neutral: {
    icon: Minus,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

const ScoreCard = forwardRef<HTMLDivElement, ScoreCardProps>(
  (
    {
      title,
      score,
      description,
      trend,
      trendValue,
      icon,
      label,
      showProgress = true,
      showMaxScore = true,
      variant = 'default',
      className,
      scoreFormatter,
    },
    ref
  ) => {
    const clampedScore = Math.min(Math.max(score, 0), 100);
    const scoreColorClass = getScoreColor(clampedScore);
    const barColorClass = getScoreBarColor(clampedScore);
    const formattedScore = scoreFormatter ? scoreFormatter(clampedScore) : clampedScore.toFixed(1);

    const trendInfo = trend ? trendConfig[trend] : null;
    const TrendIcon = trendInfo?.icon;

    if (variant === 'minimal') {
      return (
        <div ref={ref} className={cn('py-2', className)}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
              <p className={cn('text-xl font-semibold mt-0.5', scoreColorClass)}>
                {formattedScore}
                {showMaxScore && <span className="text-gray-400 text-sm">/100</span>}
              </p>
              {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
              {trend && trendValue && (
                <p className={cn('text-xs mt-1 font-medium', trendInfo?.color)}>
                  {TrendIcon && <TrendIcon className="w-3 h-3 inline mr-0.5" />}
                  {trendValue}
                </p>
              )}
            </div>
            {icon && (
              <div className="p-1.5 bg-primary-50 border border-primary-100 text-primary-600 rounded-lg flex-shrink-0 ml-2">
                {icon}
              </div>
            )}
          </div>
          {showProgress && (
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
                style={{ width: `${clampedScore}%` }}
              />
            </div>
          )}
        </div>
      );
    }

    if (variant === 'compact') {
      return (
        <div ref={ref} className={cn('bg-gray-50 rounded-lg p-3', className)}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{title}</p>
            {label && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded">
                {label}
              </span>
            )}
          </div>
          <p className={cn('text-lg font-bold', scoreColorClass)}>{formattedScore}</p>
          {showProgress && (
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
                style={{ width: `${clampedScore}%` }}
              />
            </div>
          )}
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1 mt-2', trendInfo?.color)}>
              {TrendIcon && <TrendIcon className="w-3 h-3" />}
              <span className="text-xs">{trendValue}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-gray-200 p-5 hover:border-gray-300 transition-colors duration-200',
          className
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
            <p className={cn('text-3xl font-bold', scoreColorClass)}>
              {formattedScore}
              {showMaxScore && <span className="text-gray-400 text-lg">/100</span>}
            </p>
          </div>
          {icon && (
            <div
              className={cn(
                'p-3 rounded-lg',
                clampedScore >= 90
                  ? 'bg-success-50'
                  : clampedScore >= 70
                    ? 'bg-warning-50'
                    : 'bg-danger-50'
              )}
            >
              {icon}
            </div>
          )}
        </div>

        {showProgress && (
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
              style={{ width: `${clampedScore}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1', trendInfo?.color)}>
              {TrendIcon && <TrendIcon className="w-4 h-4" />}
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
          {label && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
              {label}
            </span>
          )}
        </div>

        {description && <p className="text-sm text-gray-600 mt-3">{description}</p>}
      </div>
    );
  }
);

ScoreCard.displayName = 'ScoreCard';

const MemoizedScoreCard = memo(ScoreCard);
MemoizedScoreCard.displayName = 'ScoreCard';

export default MemoizedScoreCard;
export { MemoizedScoreCard as ScoreCard };
