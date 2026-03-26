'use client';

import { useMemo } from 'react';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}

export interface StatComparisonCardProps {
  title: string;
  stats: StatItem[];
  layout?: 'horizontal' | 'vertical';
  className?: string;
  showDividers?: boolean;
}

function formatChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getChangeColor(change: number): string {
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-500';
}

function getChangeBgColor(change: number): string {
  if (change > 0) return 'bg-green-50';
  if (change < 0) return 'bg-red-50';
  return 'bg-gray-50';
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return <TrendingUp className="w-3 h-3" />;
  }
  if (change < 0) {
    return <TrendingDown className="w-3 h-3" />;
  }
  return <Minus className="w-3 h-3" />;
}

export function StatComparisonCard({
  title,
  stats,
  layout = 'horizontal',
  className = '',
  showDividers = true,
}: StatComparisonCardProps) {
  const hasChanges = useMemo(() => {
    return stats.some((stat) => stat.change !== undefined);
  }, [stats]);

  if (stats.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>
        <p className="text-sm text-gray-500">No stats available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-4">{title}</h3>

      {layout === 'horizontal' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={`stat-${index}`}
              className={`
                ${showDividers && index < stats.length - 1 ? 'border-r border-gray-100' : ''}
                ${showDividers ? 'pr-4' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                {stat.icon && <span className="text-gray-400">{stat.icon}</span>}
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-gray-900">{stat.value}</span>
                {stat.change !== undefined && (
                  <span
                    className={`
                      inline-flex items-center gap-0.5 text-xs font-medium
                      ${getChangeColor(stat.change)}
                    `}
                  >
                    <ChangeIndicator change={stat.change} />
                    {formatChange(stat.change)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div
              key={`stat-${index}`}
              className={`
                flex items-center justify-between py-2
                ${showDividers && index < stats.length - 1 ? 'border-b border-gray-100' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {stat.icon && (
                  <div className="w-8 h-8 rounded-md bg-gray-50 flex items-center justify-center text-gray-500">
                    {stat.icon}
                  </div>
                )}
                <span className="text-sm text-gray-600">{stat.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-900">{stat.value}</span>
                {stat.change !== undefined && (
                  <span
                    className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${getChangeBgColor(stat.change)}
                      ${getChangeColor(stat.change)}
                    `}
                  >
                    <ChangeIndicator change={stat.change} />
                    {formatChange(stat.change)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer if there are changes */}
      {hasChanges && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {stats.filter((s) => (s.change ?? 0) > 0).length} 项上升
            </span>
            <span className="text-gray-500">
              {stats.filter((s) => (s.change ?? 0) < 0).length} 项下降
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatComparisonCard;
