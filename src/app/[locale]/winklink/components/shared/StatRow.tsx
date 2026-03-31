'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

interface StatRowProps {
  stats: StatItem[];
  className?: string;
  layout?: 'horizontal' | 'grid';
  columns?: number;
}

export function StatRow({
  stats,
  className = '',
  layout = 'horizontal',
  columns = 4,
}: StatRowProps) {
  if (layout === 'grid') {
    return (
      <div
        className={cn('grid gap-3', className)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-y-2 py-2', className)}>
      {stats.map((stat, index) => {
        const isLast = index === stats.length - 1;
        const isUp = stat.trend === 'up';
        const isDown = stat.trend === 'down';

        return (
          <div key={index} className="flex items-center">
            <div className="flex items-center gap-1.5 px-3 first:pl-0">
              <div className="text-gray-400">{stat.icon}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <span className="text-xs font-semibold text-gray-900">{stat.value}</span>
                {stat.change && (
                  <span
                    className={cn(
                      'text-[10px] font-medium flex items-center gap-0.5',
                      isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-gray-500'
                    )}
                  >
                    {isUp && <TrendingUp className="w-2.5 h-2.5" />}
                    {isDown && <TrendingDown className="w-2.5 h-2.5" />}
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
            {!isLast && <div className="w-px h-3 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ stat }: { stat: StatItem }) {
  const isUp = stat.trend === 'up';
  const isDown = stat.trend === 'down';

  return (
    <div className="relative p-3 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-lg bg-gray-100/50">
          <div className="w-4 h-4 text-gray-600">{stat.icon}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
      <div className="text-lg font-bold text-gray-900 tracking-tight">{stat.value}</div>
      {stat.change && (
        <div className="flex items-center gap-1 mt-1">
          <span
            className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {isUp && <TrendingUp className="w-3 h-3" />}
            {isDown && <TrendingDown className="w-3 h-3" />}
            {stat.change}
          </span>
          {stat.subtitle && <span className="text-[10px] text-gray-400">{stat.subtitle}</span>}
        </div>
      )}
    </div>
  );
}
