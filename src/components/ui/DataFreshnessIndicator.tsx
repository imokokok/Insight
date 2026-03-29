'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { Activity, Clock, RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

import { Button } from './Button';
import { Tooltip } from './Tooltip';

export type FreshnessStatus = 'fresh' | 'stale' | 'expired';

export type ConnectionStatusType =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

export interface DataFreshnessIndicatorProps {
  lastUpdate: Date | null;
  connectionStatus?: ConnectionStatusType;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  autoRefreshInterval?: number;
  warningThreshold?: number;
  expiredThreshold?: number;
  showConnectionStatus?: boolean;
  showCountdown?: boolean;
  showManualRefresh?: boolean;
  compact?: boolean;
  className?: string;
}

interface FreshnessConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle;
  pulse: boolean;
}

interface ConnectionConfig {
  label: string;
  icon: typeof Wifi;
  color: string;
  spin?: boolean;
}

function getFreshnessConfig(
  t: ReturnType<typeof useTranslations>,
  status: FreshnessStatus
): FreshnessConfig {
  const configs: Record<FreshnessStatus, FreshnessConfig> = {
    fresh: {
      label: t('freshness.fresh'),
      shortLabel: t('freshness.freshShort'),
      color: semanticColors.success.DEFAULT,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      icon: CheckCircle,
      pulse: false,
    },
    stale: {
      label: t('freshness.stale'),
      shortLabel: t('freshness.staleShort'),
      color: semanticColors.warning.DEFAULT,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: AlertCircle,
      pulse: true,
    },
    expired: {
      label: t('freshness.expired'),
      shortLabel: t('freshness.expiredShort'),
      color: semanticColors.danger.DEFAULT,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: AlertCircle,
      pulse: true,
    },
  };

  return configs[status];
}

function getConnectionConfig(
  t: ReturnType<typeof useTranslations>,
  status: ConnectionStatusType
): ConnectionConfig {
  const configs: Record<ConnectionStatusType, ConnectionConfig> = {
    connected: {
      label: t('connection.connected'),
      icon: Wifi,
      color: semanticColors.success.DEFAULT,
    },
    connecting: {
      label: t('connection.connecting'),
      icon: RefreshCw,
      color: semanticColors.info.DEFAULT,
      spin: true,
    },
    reconnecting: {
      label: t('connection.reconnecting'),
      icon: RefreshCw,
      color: semanticColors.warning.DEFAULT,
      spin: true,
    },
    disconnected: {
      label: t('connection.disconnected'),
      icon: WifiOff,
      color: semanticColors.neutral.DEFAULT,
    },
    error: {
      label: t('connection.error'),
      icon: WifiOff,
      color: semanticColors.danger.DEFAULT,
    },
  };

  return configs[status];
}

function calculateFreshnessStatus(
  lastUpdate: Date | null,
  warningThreshold: number,
  expiredThreshold: number
): FreshnessStatus {
  if (!lastUpdate) return 'expired';

  const now = Date.now();
  const ageInSeconds = (now - lastUpdate.getTime()) / 1000;

  if (ageInSeconds < warningThreshold) return 'fresh';
  if (ageInSeconds < expiredThreshold) return 'stale';
  return 'expired';
}

function formatTimeAgo(seconds: number, t: ReturnType<typeof useTranslations>): string {
  if (seconds < 1) return t('time.justNow');
  if (seconds < 60) return t('time.secondsAgo', { count: Math.floor(seconds) });
  if (seconds < 3600) return t('time.minutesAgo', { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('time.hoursAgo', { count: Math.floor(seconds / 3600) });
  return t('time.daysAgo', { count: Math.floor(seconds / 86400) });
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function useCurrentTime(updateInterval: number = 1000): Date | null {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const updateTime = () => {
      if (isMountedRef.current) {
        setCurrentTime(new Date());
      }
    };

    updateTime();

    const timer = setInterval(updateTime, updateInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [updateInterval]);

  return currentTime;
}

export function DataFreshnessIndicator({
  lastUpdate,
  connectionStatus = 'connected',
  onRefresh,
  isRefreshing = false,
  autoRefreshInterval,
  warningThreshold = 30,
  expiredThreshold = 120,
  showConnectionStatus = true,
  showCountdown = true,
  showManualRefresh = true,
  compact = false,
  className,
}: DataFreshnessIndicatorProps) {
  const t = useTranslations('ui');
  const currentTime = useCurrentTime(1000);

  const freshnessStatus = useMemo(
    () => calculateFreshnessStatus(lastUpdate, warningThreshold, expiredThreshold),
    [lastUpdate, warningThreshold, expiredThreshold]
  );

  const ageInSeconds = useMemo(() => {
    if (!lastUpdate || !currentTime) return 0;
    return (currentTime.getTime() - lastUpdate.getTime()) / 1000;
  }, [lastUpdate, currentTime]);

  const countdownSeconds = useMemo(() => {
    if (!autoRefreshInterval || !lastUpdate || !currentTime) return null;
    const nextRefresh = lastUpdate.getTime() + autoRefreshInterval * 1000;
    const remaining = (nextRefresh - currentTime.getTime()) / 1000;
    return Math.max(0, remaining);
  }, [autoRefreshInterval, lastUpdate, currentTime]);

  const freshnessConfig = getFreshnessConfig(t, freshnessStatus);
  const connectionConfig = getConnectionConfig(t, connectionStatus);
  const FreshnessIcon = freshnessConfig.icon;
  const ConnectionIcon = connectionConfig.icon;

  const handleRefresh = useCallback(() => {
    if (!isRefreshing && onRefresh) {
      onRefresh();
    }
  }, [isRefreshing, onRefresh]);

  const isMounted = currentTime !== null;

  const tooltipContent = (
    <div className="space-y-2 min-w-48">
      <div className="font-medium text-gray-900">{t('freshness.title')}</div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">{t('freshness.lastUpdate')}:</span>
          <span className="font-medium">
            {isMounted && lastUpdate ? lastUpdate.toLocaleTimeString('zh-CN') : '--:--:--'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">{t('freshness.age')}:</span>
          <span className="font-medium">{isMounted ? formatTimeAgo(ageInSeconds, t) : '--'}</span>
        </div>
        {showCountdown && countdownSeconds !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{t('freshness.nextRefresh')}:</span>
            <span className="font-medium">{formatCountdown(countdownSeconds)}</span>
          </div>
        )}
        {showConnectionStatus && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{t('freshness.connection')}:</span>
            <span className="font-medium" style={{ color: connectionConfig.color }}>
              {connectionConfig.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Tooltip content={tooltipContent}>
        <div className={cn('inline-flex items-center gap-1.5', className)}>
          <span
            className={cn('w-2 h-2 rounded-full', freshnessConfig.pulse && 'animate-pulse')}
            style={{ backgroundColor: freshnessConfig.color }}
          />
          {showConnectionStatus && (
            <ConnectionIcon
              className={cn('w-3.5 h-3.5', connectionConfig.spin && 'animate-spin')}
              style={{ color: connectionConfig.color }}
            />
          )}
          <span className="text-xs text-gray-500 tabular-nums">
            {isMounted ? formatTimeAgo(ageInSeconds, t) : '--'}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltipContent}>
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white shadow-sm',
          freshnessConfig.borderColor,
          className
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
            freshnessConfig.bgColor
          )}
        >
          <FreshnessIcon
            className={cn('w-3.5 h-3.5', freshnessConfig.pulse && 'animate-pulse')}
            style={{ color: freshnessConfig.color }}
          />
          <span style={{ color: freshnessConfig.color }}>{freshnessConfig.shortLabel}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">{isMounted ? formatTimeAgo(ageInSeconds, t) : '--'}</span>
        </div>

        {showCountdown && countdownSeconds !== null && countdownSeconds > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <Activity className="w-3.5 h-3.5" />
            <span className="tabular-nums">{formatCountdown(countdownSeconds)}</span>
          </div>
        )}

        {showConnectionStatus && (
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-gray-200">
            <ConnectionIcon
              className={cn('w-3.5 h-3.5', connectionConfig.spin && 'animate-spin')}
              style={{ color: connectionConfig.color }}
            />
          </div>
        )}

        {showManualRefresh && onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0 ml-1"
            aria-label={t('freshness.refresh')}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </Button>
        )}
      </div>
    </Tooltip>
  );
}

export default DataFreshnessIndicator;
