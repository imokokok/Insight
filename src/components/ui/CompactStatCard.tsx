'use client';

import { forwardRef, useMemo } from 'react';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Tooltip } from './Tooltip';

export interface CompactStatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: boolean;
    timeframe?: string;
  };
  breakdown?: {
    label: string;
    value: string | number;
  }[];
  tooltip?: string;
  className?: string;
}

export const CompactStatCard = forwardRef<HTMLDivElement, CompactStatCardProps>(
  ({ title, value, change, breakdown, tooltip, className }, ref) => {
    const trend = useMemo(() => {
      if (!change) return 'neutral';
      if (change.value > 0) return 'up';
      if (change.value < 0) return 'down';
      return 'neutral';
    }, [change]);

    const trendColors = useMemo(() => {
      switch (trend) {
        case 'up':
          return {
            text: 'text-emerald-600',
            bg: 'bg-emerald-50',
          };
        case 'down':
          return {
            text: 'text-red-600',
            bg: 'bg-red-50',
          };
        default:
          return {
            text: 'text-gray-500',
            bg: 'bg-gray-50',
          };
      }
    }, [trend]);

    const TrendIcon = useMemo(() => {
      switch (trend) {
        case 'up':
          return TrendingUp;
        case 'down':
          return TrendingDown;
        default:
          return Minus;
      }
    }, [trend]);

    const formatChangeValue = () => {
      if (!change) return null;
      const sign = change.value > 0 ? '+' : '';
      const suffix = change.percentage ? '%' : '';
      return `${sign}${change.value.toFixed(2)}${suffix}`;
    };

    const cardContent = (
      <div
        ref={ref}
        className={cn(
          'relative flex flex-col',
          'p-4 bg-white rounded-lg border border-gray-200',
          'transition-all duration-200',
          'hover:border-gray-300 hover:shadow-sm',
          className
        )}
      >
        <div className="flex flex-col gap-1.5">
          {/* 标题 */}
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
            {title}
          </span>

          {/* 主数值和趋势 */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-gray-900 font-tabular">{value}</span>

            {change && (
              <div
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium',
                  trendColors.bg,
                  trendColors.text
                )}
              >
                <TrendIcon className="w-3 h-3" />
                <span>{formatChangeValue()}</span>
                {change.timeframe && (
                  <span className="text-gray-400 ml-0.5">({change.timeframe})</span>
                )}
              </div>
            )}
          </div>

          {/* 详细数据 */}
          {breakdown && breakdown.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400">{item.label}:</span>
                  <span className="font-medium text-gray-600 font-tabular">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

    if (tooltip) {
      return (
        <Tooltip content={tooltip} placement="top" delay={300}>
          {cardContent}
        </Tooltip>
      );
    }

    return cardContent;
  }
);

CompactStatCard.displayName = 'CompactStatCard';

export default CompactStatCard;
