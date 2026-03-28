'use client';

import { Database, BarChart3, Table, PieChart, TrendingUp, RefreshCw } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

export type EmptyStateType = 'chart' | 'table' | 'stats';

interface EmptyStateProps {
  type: EmptyStateType;
  message?: string;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

const iconMap = {
  chart: BarChart3,
  table: Table,
  stats: PieChart,
};

const defaultIconMap = {
  chart: Database,
  table: Database,
  stats: TrendingUp,
};

export default function EmptyState({
  type,
  message,
  onRefresh,
  className,
  compact = false,
}: EmptyStateProps) {
  const t = useTranslations('marketOverview.emptyState');
  const Icon = iconMap[type];
  const DefaultIcon = defaultIconMap[type];

  const defaultMessages = {
    chart: t('noChartData'),
    table: t('noTableData'),
    stats: t('noStatsData'),
  };

  const titles = {
    chart: t('chartTitle'),
    table: t('tableTitle'),
    stats: t('statsTitle'),
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 px-4',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-100 mb-4',
          compact ? 'w-12 h-12' : 'w-16 h-16'
        )}
      >
        <Icon className={cn('text-gray-400', compact ? 'w-6 h-6' : 'w-8 h-8')} />
      </div>
      <h3 className={cn('font-semibold text-gray-900 mb-1', compact ? 'text-base' : 'text-lg')}>
        {titles[type]}
      </h3>
      <p className={cn('text-gray-500 max-w-sm', compact ? 'text-sm' : 'text-base')}>
        {message || defaultMessages[type]}
      </p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors',
            compact ? 'mt-3' : 'mt-5'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          {t('refresh')}
        </button>
      )}
    </div>
  );
}

export function EmptyChartState({
  message,
  onRefresh,
  className,
  compact,
}: Omit<EmptyStateProps, 'type'>) {
  return (
    <EmptyState
      type="chart"
      message={message}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  );
}

export function EmptyTableState({
  message,
  onRefresh,
  className,
  compact,
}: Omit<EmptyStateProps, 'type'>) {
  return (
    <EmptyState
      type="table"
      message={message}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  );
}

export function EmptyStatsState({
  message,
  onRefresh,
  className,
  compact,
}: Omit<EmptyStateProps, 'type'>) {
  return (
    <EmptyState
      type="stats"
      message={message}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  );
}
