'use client';

import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface StatItemProps {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  compact?: boolean;
}

export function StatItem({
  label,
  value,
  prefix = '',
  suffix = '',
  subValue,
  trend,
  compact = false,
}: StatItemProps) {
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-900';

  if (compact) {
    return (
      <div className="py-0.5">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="flex items-baseline gap-0.5">
          {prefix && <span className="text-xs text-gray-400 font-mono">{prefix}</span>}
          <span className={`text-xl font-bold font-mono ${trendColor}`}>
            {trend === 'up' && (
              <ArrowUpIcon
                className="inline-block w-3.5 h-3.5 mr-0.5 align-text-bottom"
                aria-hidden="true"
              />
            )}
            {trend === 'down' && (
              <ArrowDownIcon
                className="inline-block w-3.5 h-3.5 mr-0.5 align-text-bottom"
                aria-hidden="true"
              />
            )}
            {value}
          </span>
          {suffix && <span className="text-xs text-gray-400 font-mono">{suffix}</span>}
        </div>
        {subValue && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{subValue}</div>}
      </div>
    );
  }

  return (
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-gray-400">{prefix}</span>}
        <span className={`text-2xl font-bold ${trendColor}`}>
          {trend === 'up' && (
            <ArrowUpIcon
              className="inline-block w-5 h-5 mr-1 align-text-bottom"
              aria-hidden="true"
            />
          )}
          {trend === 'down' && (
            <ArrowDownIcon
              className="inline-block w-5 h-5 mr-1 align-text-bottom"
              aria-hidden="true"
            />
          )}
          {value}
        </span>
        {suffix && <span className="text-lg text-gray-400">{suffix}</span>}
      </div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}
