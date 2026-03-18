'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface DataUpdateTimeProps {
  lastUpdated: Date | null;
  refreshInterval?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  autoRefresh?: boolean;
  className?: string;
  variant?: 'compact' | 'detailed' | 'minimal';
  showCountdown?: boolean;
}

interface TimeAgo {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

function getTimeAgo(timestamp: number): TimeAgo {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return { value: seconds, unit: 'seconds' };
  }
  if (seconds < 3600) {
    return { value: Math.floor(seconds / 60), unit: 'minutes' };
  }
  if (seconds < 86400) {
    return { value: Math.floor(seconds / 3600), unit: 'hours' };
  }
  return { value: Math.floor(seconds / 86400), unit: 'days' };
}

function formatTimeAgo(timeAgo: TimeAgo, t: ReturnType<typeof useTranslations>): string {
  const { value, unit } = timeAgo;

  if (value === 0 && unit === 'seconds') {
    return t('common.time.justNow');
  }

  switch (unit) {
    case 'seconds':
      return t('common.time.secondsAgo', { seconds: value });
    case 'minutes':
      return t('common.time.minutesAgo', { minutes: value });
    case 'hours':
      return t('common.time.hoursAgo', { hours: value });
    case 'days':
      return t('common.time.daysAgo', { days: value });
    default:
      return '';
  }
}

function getFreshnessStatus(
  lastUpdated: Date | null,
  refreshInterval: number
): 'fresh' | 'stale' | 'expired' {
  if (!lastUpdated) return 'expired';

  const age = Date.now() - lastUpdated.getTime();
  const interval = refreshInterval || 60000;

  if (age < interval) return 'fresh';
  if (age < interval * 2) return 'stale';
  return 'expired';
}

export function DataUpdateTime({
  lastUpdated,
  refreshInterval = 60000,
  onRefresh,
  isLoading = false,
  error = null,
  autoRefresh = false,
  className = '',
  variant = 'compact',
  showCountdown = true,
}: DataUpdateTimeProps) {
  const t = useTranslations();
  const [, setTick] = useState(0);
  const [countdown, setCountdown] = useState(() => {
    // Initialize countdown based on conditions
    if (!autoRefresh || !showCountdown || !lastUpdated) {
      return refreshInterval;
    }
    const elapsed = Date.now() - lastUpdated.getTime();
    return Math.max(0, refreshInterval - elapsed);
  });

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown for auto-refresh
  useEffect(() => {
    if (!autoRefresh || !showCountdown || !lastUpdated) {
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - lastUpdated.getTime();
      const remaining = Math.max(0, refreshInterval - elapsed);
      setCountdown(remaining);

      if (remaining === 0 && onRefresh && !isLoading) {
        onRefresh();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, showCountdown, lastUpdated, refreshInterval, onRefresh, isLoading]);

  const freshness = getFreshnessStatus(lastUpdated, refreshInterval);
  const timeAgo = lastUpdated ? getTimeAgo(lastUpdated.getTime()) : null;

  const freshnessConfig = {
    fresh: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      dotColor: 'bg-green-500',
    },
    stale: {
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    expired: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      dotColor: 'bg-red-500',
    },
  };

  const config = freshnessConfig[freshness];
  const StatusIcon = config.icon;

  const formatCountdown = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <span className="text-xs text-gray-500">
          {timeAgo ? formatTimeAgo(timeAgo, t) : t('common.status.noData')}
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-white`}>
              <StatusIcon size={20} className={config.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${config.color}`}>
                  {t(`dataTransparency.freshness.${freshness}`)}
                </span>
                {isLoading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
              </div>
              <p className="text-xs text-gray-500">
                {timeAgo ? formatTimeAgo(timeAgo, t) : t('common.status.noData')}
              </p>
            </div>
          </div>

          <div className="text-right">
            {lastUpdated && (
              <p className="text-xs text-gray-500">{lastUpdated.toLocaleTimeString()}</p>
            )}
            {autoRefresh && showCountdown && (
              <p className="text-xs font-medium text-gray-600">
                {t('dataTransparency.nextRefresh')}: {formatCountdown(countdown)}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} />
              {error.message || t('common.status.error')}
            </p>
          </div>
        )}

        {onRefresh && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {t('common.status.loading')}
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  {t('common.actions.refresh')}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor} ${config.borderColor} border`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <StatusIcon size={12} className={config.color} />
        <span className={`text-xs font-medium ${config.color}`}>
          {timeAgo ? formatTimeAgo(timeAgo, t) : t('common.status.noData')}
        </span>
      </div>

      {autoRefresh && showCountdown && countdown < 10000 && (
        <span className="text-xs text-gray-400">{formatCountdown(countdown)}</span>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={t('common.actions.refresh')}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}

export default DataUpdateTime;
