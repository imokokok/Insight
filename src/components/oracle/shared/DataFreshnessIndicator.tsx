'use client';

import { useTranslations } from '@/i18n';
import { type DataFreshnessStatus } from '@/hooks/useDataFreshness';

interface DataFreshnessIndicatorProps {
  status: DataFreshnessStatus;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  themeColor?: string;
  className?: string;
}

export function DataFreshnessIndicator({ status, lastUpdated, onRefresh, themeColor = 'blue', className = '' }: DataFreshnessIndicatorProps) {
  const t = useTranslations();

  const getStatusConfig = () => {
    switch (status) {
      case 'fresh':
        return {
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100',
          borderColor: 'border-emerald-200',
          icon: '✓',
          label: t('dataFreshness.fresh'),
        };
      case 'stale':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-200',
          icon: '⚠',
          label: t('dataFreshness.stale'),
        };
      case 'expired':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          icon: '!',
          label: t('dataFreshness.expired'),
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          icon: '?',
          label: t('dataFreshness.unknown'),
        };
    }
  };

  const statusConfig = getStatusConfig();
  const isExpired = status === 'expired';

  return (
    <div className={`inline-flex items-center gap-2 ${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-md px-3 py-1.5 text-sm ${className}`}>
      <span className={`font-bold ${statusConfig.color}`}>{statusConfig.icon}</span>
      <span className={`${statusConfig.color} font-medium`}>{statusConfig.label}</span>
      {lastUpdated && (
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {lastUpdated.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
      {isExpired && onRefresh && (
        <button
          onClick={onRefresh}
          className={`ml-2 text-xs font-medium ${themeColor === 'blue' ? 'text-blue-600 hover:text-blue-700' : 'text-primary-600 hover:text-primary-700'}`}
          aria-label={t('actions.refresh')}
        >
          {t('actions.refresh')}
        </button>
      )}
    </div>
  );
}
