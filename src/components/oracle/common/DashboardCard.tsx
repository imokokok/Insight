'use client';

import { memo, ReactNode } from 'react';

interface DashboardCardProps {
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  onClick?: () => void;
}

export function DashboardCard({
  title,
  children,
  className = '',
  headerAction,
  onClick,
}: DashboardCardProps) {
  return (
    <div className={`bg-white border border-gray-200 ${className}`} onClick={onClick}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  isFirst?: boolean;
}

export function StatCard({ title, value, change, changeType, icon, isFirst = false }: StatCardProps) {
  const changeColor =
    changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-gray-500';

  const changeSymbol = changeType === 'positive' ? '+' : changeType === 'negative' ? '-' : '';

  return (
    <div className={`px-4 py-2 ${isFirst ? '' : 'border-l border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <div className="text-gray-400">{icon}</div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          <p className={`text-xs ${changeColor}`}>
            {changeSymbol}
            {change}
          </p>
        </div>
      </div>
    </div>
  );
}

const MemoizedStatCard = memo(StatCard, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.changeType === nextProps.changeType
  );
});

export { MemoizedStatCard };

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: ReactNode;
}

export function MetricCard({ label, value, subValue, icon }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
          <p className="text-gray-900 text-lg font-semibold">{value}</p>
          {subValue && <p className="text-gray-400 text-xs mt-1">{subValue}</p>}
        </div>
        <div className="p-2 bg-gray-100 text-gray-600">{icon}</div>
      </div>
    </div>
  );
}

const MemoizedMetricCard = memo(MetricCard);

export { MemoizedMetricCard };

interface FlatStatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function FlatStatItem({
  label,
  value,
  subValue,
  icon,
  trend,
  trendValue,
  className = '',
}: FlatStatItemProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className={`py-2 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-xl font-semibold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
          {trend && trendValue && (
            <p className={`text-xs mt-1 font-medium ${trendColors[trend]}`}>
              {trendIcons[trend]} {trendValue}
            </p>
          )}
        </div>
        {icon && <div className="p-1.5 bg-gray-100 text-gray-500 flex-shrink-0 ml-2">{icon}</div>}
      </div>
    </div>
  );
}

interface FlatSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export function FlatSection({ title, children, className = '', headerAction }: FlatSectionProps) {
  return (
    <div className={`py-4 ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
