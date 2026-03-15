'use client';

import { memo, ReactNode } from 'react';

interface DashboardCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'flat';
}

export function DashboardCard({
  title,
  children,
  className = '',
  headerAction,
  onClick,
  variant = 'default',
}: DashboardCardProps) {
  const variantClasses = {
    default: 'bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm',
    flat: 'bg-transparent border-0 rounded-none shadow-none',
  };

  const headerClasses = {
    default: 'flex items-center justify-between px-5 py-4 border-b border-gray-100',
    flat: 'flex items-center justify-between py-2 mb-4',
  };

  const contentClasses = {
    default: 'p-5',
    flat: '',
  };

  return (
    <div
      className={`${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className={headerClasses[variant]}>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={contentClasses[variant]}>{children}</div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
}

export function StatCard({ title, value, change, changeType, icon }: StatCardProps) {
  return (
    <DashboardCard className="h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p
            className={`text-xs mt-2 font-medium ${
              changeType === 'positive'
                ? 'text-green-600'
                : changeType === 'negative'
                  ? 'text-red-600'
                  : 'text-gray-500'
            }`}
          >
            {changeType === 'positive' && '↑ '}
            {changeType === 'negative' && '↓ '}
            {changeType === 'neutral' && '→ '}
            {change}
          </p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      </div>
    </DashboardCard>
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
          <p className="text-gray-900 text-lg font-semibold">{value}</p>
          {subValue && <p className="text-gray-400 text-xs mt-1">{subValue}</p>}
        </div>
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
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
        {icon && <div className="p-1.5 bg-gray-50 rounded text-gray-500 flex-shrink-0 ml-2">{icon}</div>}
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

export function FlatSection({
  title,
  children,
  className = '',
  headerAction,
}: FlatSectionProps) {
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
