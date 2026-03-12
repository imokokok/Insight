'use client';

import { memo, ReactNode } from 'react';

interface DashboardCardProps {
  title?: string;
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
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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
