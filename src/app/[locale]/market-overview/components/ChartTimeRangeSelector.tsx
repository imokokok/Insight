'use client';

import { cn } from '@/lib/utils';

import { TIME_RANGES } from '../types';

interface ChartTimeRangeSelectorProps {
  selectedTimeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export default function ChartTimeRangeSelector({
  selectedTimeRange,
  onTimeRangeChange,
}: ChartTimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0 overflow-x-auto scrollbar-hide">
      {TIME_RANGES.map((range) => (
        <button
          key={range.key}
          onClick={() => onTimeRangeChange(range.key)}
          className={cn(
            'px-2 py-1 text-xs font-medium transition-all duration-200 whitespace-nowrap',
            selectedTimeRange === range.key
              ? 'text-primary-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
