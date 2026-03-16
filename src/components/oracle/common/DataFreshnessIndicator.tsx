'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardCard } from './DashboardCard';
import { isDataStale, formatRelativeTime } from '@/lib/utils/riskUtils';

export interface DataFreshnessIndicatorProps {
  lastUpdated: Date;
  thresholdMinutes?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function DataFreshnessIndicator({
  lastUpdated,
  thresholdMinutes = 5,
  onRefresh,
  isLoading = false,
  className = '',
}: DataFreshnessIndicatorProps) {
  const t = useTranslations();
  const [displayTime, setDisplayTime] = useState<string>('');
  const [isStale, setIsStale] = useState<boolean>(false);

  const updateDisplay = useCallback(() => {
    setDisplayTime(formatRelativeTime(lastUpdated));
    setIsStale(isDataStale(lastUpdated, thresholdMinutes));
  }, [lastUpdated, thresholdMinutes]);

  useEffect(() => {
    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [updateDisplay]);

  const handleRefresh = () => {
    if (onRefresh && !isLoading) {
      onRefresh();
    }
  };

  const getStatusColor = () => {
    if (isStale) return 'text-red-600';
    return 'text-green-600';
  };

  const getStatusBg = () => {
    if (isStale) return 'bg-red-50';
    return 'bg-green-50';
  };

  const getStatusDot = () => {
    if (isStale) return 'bg-red-500';
    return 'bg-green-500';
  };

  return (
    <DashboardCard
      title={t('oracleCommon.dataFreshness.title')}
      className={className}
      headerAction={
        onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('oracleCommon.dataFreshness.refresh')}
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )
      }
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 ${getStatusBg()}`}>
          <div className={`w-2 h-2 ${getStatusDot()} ${!isStale ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{t('oracleCommon.dataFreshness.lastUpdated')}</p>
          <p className={`text-sm font-medium ${getStatusColor()}`}>{displayTime}</p>
        </div>
        {isStale && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium">
            {t('oracleCommon.dataFreshness.stale')}
          </span>
        )}
      </div>
    </DashboardCard>
  );
}

export default DataFreshnessIndicator;
