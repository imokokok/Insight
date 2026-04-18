import { memo } from 'react';

import { cn } from '@/lib/utils';

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
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm',
        description && 'group'
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
      {description && (
        <div
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg',
            'whitespace-nowrap pointer-events-none',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
          role="tooltip"
        >
          {description}
          <span
            className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 -mt-1',
              'w-2 h-2 bg-gray-900 border-4 border-gray-900',
              'border-l-transparent border-r-transparent border-b-transparent'
            )}
          />
        </div>
      )}
    </div>
  );
});
