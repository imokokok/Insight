'use client';

import { forwardRef, useMemo } from 'react';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

import { SparklineChart } from './SparklineChart';
import { Tooltip } from './Tooltip';

export interface CompactStatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: boolean;
    timeframe?: string;
  };
  sparklineData?: number[];
  breakdown?: {
    label: string;
    value: string | number;
  }[];
  tooltip?: string;
  className?: string;
}

export const CompactStatCard = forwardRef<HTMLDivElement, CompactStatCardProps>(
  ({ title, value, change, sparklineData, breakdown, tooltip, className }, ref) => {
    const trend = useMemo(() => {
      if (!change) return 'neutral';
      if (change.value > 0) return 'up';
      if (change.value < 0) return 'down';
      return 'neutral';
    }, [change]);

    const trendColor = useMemo(() => {
      switch (trend) {
        case 'up':
          return semanticColors.success;
        case 'down':
          return semanticColors.danger;
        default:
          return semanticColors.neutral;
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
      return `${sign}${change.value}${suffix}`;
    };

    const cardContent = (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center justify-between',
          'p-4 bg-white rounded-lg border border-gray-200',
          'transition-all duration-200',
          'hover:border-gray-300 hover:shadow-sm',
          className
        )}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
            {title}
          </span>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900 font-tabular truncate">{value}</span>

            {change && (
              <div
                className="inline-flex items-center gap-0.5 text-xs font-medium"
                style={{ color: trendColor.DEFAULT }}
              >
                <TrendIcon className="w-3 h-3" />
                <span>{formatChangeValue()}</span>
                {change.timeframe && (
                  <span className="text-gray-400 ml-0.5">({change.timeframe})</span>
                )}
              </div>
            )}
          </div>

          {breakdown && breakdown.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400">{item.label}:</span>
                  <span className="font-medium text-gray-600 font-tabular">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="flex-shrink-0 ml-4">
            <SparklineChart
              data={sparklineData}
              width={80}
              height={32}
              fill={true}
              animate={true}
            />
          </div>
        )}
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
