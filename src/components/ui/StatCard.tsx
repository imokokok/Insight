import { memo } from 'react';

import { cn } from '@/lib/utils';

import { Tooltip } from './Tooltip';

interface StatCardProps {
  icon?: React.ElementType;
  iconColor?: string;
  title: string;
  value: React.ReactNode;
  description?: string;
  rating?: { label: string; color: string; bgColor: string } | null;
}

export const StatCard = memo(function StatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  description,
  rating,
}: StatCardProps) {
  const cardContent = (
    <div
      className={cn(
        'relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm',
        description && 'cursor-help'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={cn('w-3.5 h-3.5', iconColor)} />}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className={cn(rating && 'flex items-baseline gap-2 flex-wrap')}>
        <p
          className={cn('text-lg font-bold text-gray-900 font-mono', !rating && 'truncate')}
          title={typeof value === 'string' ? value : undefined}
        >
          {value}
        </p>
        {rating && (
          <span
            className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded"
            style={{ color: rating.color, backgroundColor: rating.bgColor }}
          >
            {rating.label}
          </span>
        )}
      </div>
    </div>
  );

  if (description) {
    return (
      <Tooltip content={description} placement="top" delay={300}>
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
});
