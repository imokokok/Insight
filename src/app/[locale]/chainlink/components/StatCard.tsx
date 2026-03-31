'use client';

import { type ReactNode } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
  color?: string;
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  change,
  trend,
  subtitle,
  color = 'blue',
  className = '',
}: StatCardProps) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`text-${color}-600`}>{icon}</div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {change && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive && <TrendingUp className="w-3 h-3 text-emerald-500" />}
          {isNegative && <TrendingDown className="w-3 h-3 text-red-500" />}
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {change}
          </span>
          {subtitle && <span className="text-[10px] text-gray-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
