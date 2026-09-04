'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ label, value, trend = 'neutral', className }: MetricCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        'border-b border-r border-slate-900/10 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/70 last:border-r-0',
        className
      )}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-base font-semibold text-slate-900 font-mono">{value}</div>
        <TrendIcon
          className={cn(
            'w-3.5 h-3.5',
            trend === 'up'
              ? 'text-red-500'
              : trend === 'down'
                ? 'text-emerald-500'
                : 'text-slate-300'
          )}
        />
      </div>
    </div>
  );
}
