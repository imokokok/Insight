'use client';

import { memo, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'bordered';
}

export function DashboardCard({
  title,
  children,
  className = '',
  headerAction,
  onClick,
  variant = 'default',
}: DashboardCardProps) {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm hover:border-gray-300',
    elevated: 'bg-white border border-gray-200 shadow-md hover:shadow-lg hover:-translate-y-0.5',
    bordered: 'bg-white border-2 border-primary-500 shadow-sm',
  };

  return (
    <div
      className={cn(
        'rounded-lg transition-all duration-200',
        variants[variant],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {headerAction && <div className="flex items-center">{headerAction}</div>}
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
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  isFirst = false,
  iconBgColor,
  iconColor,
}: StatCardProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-success-600 bg-success-50'
      : changeType === 'negative'
        ? 'text-danger-600 bg-danger-50'
        : 'text-gray-600 bg-gray-100';

  const defaultBgColor =
    changeType === 'positive'
      ? 'bg-success-50 border-success-100'
      : changeType === 'negative'
        ? 'bg-danger-50 border-danger-100'
        : 'bg-gray-50 border-gray-100';

  const finalBgColor = iconBgColor
    ? `${iconBgColor} border-${iconBgColor.split('-')[1]}-100`
    : defaultBgColor;
  const finalIconColor = iconColor || 'text-gray-600';

  const changeSymbol = changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→';

  return (
    <div
      className={cn(
        'px-5 py-5 bg-white border border-gray-200 rounded-lg',
        !isFirst && 'lg:border-l-0'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-tabular">{value}</p>
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2',
              changeColor
            )}
          >
            <span>{changeSymbol}</span>
            <span>{change}</span>
          </div>
        </div>
        <div className={cn('p-2.5 border rounded-lg flex-shrink-0', finalBgColor, finalIconColor)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Clean Finance Style - Flat stat grid for consistent border handling
interface StatGridProps {
  children: ReactNode;
  className?: string;
}

export function StatGrid({ children, className = '' }: StatGridProps) {
  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        {children}
      </div>
    </div>
  );
}

interface StatGridItemProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
}

export function StatGridItem({ title, value, change, changeType, icon }: StatGridItemProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-success-600'
      : changeType === 'negative'
        ? 'text-danger-600'
        : 'text-gray-500';

  const changeSymbol = changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→';

  return (
    <div className="px-5 py-5 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1 font-tabular">{value}</p>
          <p className={cn('text-xs mt-1 font-medium', changeColor)}>
            {changeSymbol} {change}
          </p>
        </div>
        <div className="p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 flex-shrink-0">
          {icon}
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
    <div className="bg-white border border-gray-200 p-5 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-gray-900 text-lg font-semibold truncate mt-1">{value}</p>
          {subValue && <p className="text-gray-400 text-xs mt-1 truncate">{subValue}</p>}
        </div>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 flex-shrink-0 ml-3">
          {icon}
        </div>
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
    up: 'text-success-600',
    down: 'text-danger-600',
    neutral: 'text-gray-500',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className={cn('py-2', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-semibold text-gray-900 mt-0.5">{value}</p>
          {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
          {trend && trendValue && (
            <p className={cn('text-xs mt-1 font-medium', trendColors[trend])}>
              {trendIcons[trend]} {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-1.5 bg-primary-50 border border-primary-100 text-primary-600 rounded-lg flex-shrink-0 ml-2">
            {icon}
          </div>
        )}
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
    <div className={cn('py-4', className)}>
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
