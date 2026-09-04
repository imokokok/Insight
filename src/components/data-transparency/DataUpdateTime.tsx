'use client';

import { useEffect, useState } from 'react';

import { Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

import { formatCountdown, formatTimeString } from '@/lib/utils/format';
import { getTimeAgoDiff, formatTimeAgo } from '@/lib/utils/timestamp';

interface DataUpdateTimeProps {
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
  const [, setTick] = useState(0);
  const [countdown, setCountdown] = useState(() => {
    if (!autoRefresh || !showCountdown || !lastUpdated) {
      return refreshInterval;
    }
    const elapsed = Date.now() - lastUpdated.getTime();
    return Math.max(0, refreshInterval - elapsed);
  });

  const lastUpdatedTime = lastUpdated?.getTime() ?? null;

  // Consolidated single 1s interval. Previously two separate `setInterval`
  // timers ran in parallel — one unconditionally bumping `tick` to refresh
  // "time ago" text, another conditionally updating `countdown`. Merging them
  // halves the timer count and the per-tick callback overhead with identical
  // update frequency and identical state transitions.
  useEffect(() => {
    const shouldUpdateCountdown = autoRefresh && showCountdown && lastUpdatedTime !== null;

    const tick = () => {
      setTick((prev) => prev + 1);
      if (shouldUpdateCountdown) {
        const elapsed = Date.now() - (lastUpdatedTime as number);
        const remaining = Math.max(0, refreshInterval - elapsed);
        setCountdown(remaining);
      }
    };

    if (shouldUpdateCountdown) {
      // Run an immediate sync so the displayed countdown is correct right
      // after dependencies change (matches the previous `updateCountdown()`
      // call that ran before the interval was started).
      tick();
    }

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // `shouldUpdateCountdown` is derived from the deps below; recomputing it
    // inside the effect keeps the lint rule honest without adding overhead.
  }, [autoRefresh, showCountdown, lastUpdatedTime, refreshInterval]);

  const freshness = getFreshnessStatus(lastUpdated, refreshInterval);
  const timeAgo = lastUpdated ? getTimeAgoDiff(lastUpdated) : null;

  const freshnessConfig = {
    fresh: {
      icon: CheckCircle2,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
      borderColor: 'border-green-200',
      dotColor: 'bg-success-500',
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
      color: 'text-danger-600',
      bgColor: 'bg-danger-50',
      borderColor: 'border-danger-200',
      dotColor: 'bg-danger-500',
    },
  };

  const config = freshnessConfig[freshness];
  const StatusIcon = config.icon;

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <span className="text-xs text-gray-500">
          {timeAgo ? formatTimeAgo(timeAgo) : 'No data'}
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`${config.bgColor} ${config.borderColor} border-l-2 border-y border-r p-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="border border-current/15 bg-white p-2">
              <StatusIcon size={20} className={config.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${config.color}`}>{freshness}</span>
                {isLoading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
              </div>
              <p className="text-xs text-gray-500">
                {timeAgo ? formatTimeAgo(timeAgo) : 'No data'}
              </p>
            </div>
          </div>

          <div className="text-right">
            {lastUpdated && (
              <p className="text-xs text-gray-500">{formatTimeString(lastUpdated, false)}</p>
            )}
            {autoRefresh && showCountdown && (
              <p className="text-xs font-medium text-gray-600">
                Next refresh: {formatCountdown(countdown)}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 pt-3 border-t border-danger-200">
            <p className="text-xs text-danger-600 flex items-center gap-1">
              <AlertCircle size={12} />
              {error.message || 'Error'}
            </p>
          </div>
        )}

        {onRefresh && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Refresh
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 border-l-2 px-2 py-1 ${config.bgColor} ${config.borderColor}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <StatusIcon size={12} className={config.color} />
        <span className={`text-xs font-medium ${config.color}`}>
          {timeAgo ? formatTimeAgo(timeAgo) : 'No data'}
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
          title="Refresh"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}
