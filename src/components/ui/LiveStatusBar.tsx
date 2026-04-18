'use client';

import { useState, useEffect, useMemo } from 'react';

import { Wifi, WifiOff, Clock, RefreshCw, Activity } from 'lucide-react';

import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format';

import { Tooltip } from './Tooltip';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

type DataFreshnessLevel = 'fresh' | 'stale' | 'expired';

interface LiveStatusBarProps {
  isConnected: boolean;
  latency?: number;
  lastUpdate?: Date;
  isReconnecting?: boolean;
  className?: string;
  freshnessThreshold?: number;
}

interface StatusConfig {
  label: string;
  icon: typeof Wifi;
  color: string;
}

interface FreshnessConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  pulse: boolean;
}

function getStatusConfig(): Record<ConnectionStatus, StatusConfig> {
  return {
    connected: {
      label: 'Connected',
      icon: Wifi,
      color: semanticColors.success.DEFAULT,
    },
    disconnected: {
      label: 'Disconnected',
      icon: WifiOff,
      color: semanticColors.danger.DEFAULT,
    },
    reconnecting: {
      label: 'Reconnecting',
      icon: RefreshCw,
      color: semanticColors.warning.DEFAULT,
    },
  };
}

function getFreshnessConfig(): Record<DataFreshnessLevel, FreshnessConfig> {
  return {
    fresh: {
      label: 'Data Fresh',
      shortLabel: 'Fresh',
      color: semanticColors.success.DEFAULT,
      bgColor: 'bg-emerald-50',
      pulse: false,
    },
    stale: {
      label: 'Data Stale',
      shortLabel: 'Stale',
      color: semanticColors.warning.DEFAULT,
      bgColor: 'bg-amber-50',
      pulse: true,
    },
    expired: {
      label: 'Data Expired',
      shortLabel: 'Expired',
      color: semanticColors.danger.DEFAULT,
      bgColor: 'bg-red-50',
      pulse: true,
    },
  };
}

function formatUTCTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds} UTC`;
}

function formatLatency(ms?: number): string {
  if (ms === undefined || ms === null) return '--ms';
  return `${Math.round(ms)}ms`;
}

function formatLastUpdate(date?: Date): string {
  if (!date) return '--';
  return formatRelativeTime(date, { style: 'long' });
}

function getDataFreshnessLevel(
  lastUpdate?: Date,
  threshold: number = 30000,
  now: Date = new Date()
): DataFreshnessLevel {
  if (!lastUpdate) return 'expired';

  const diff = now.getTime() - lastUpdate.getTime();

  if (diff < threshold) return 'fresh';
  if (diff < threshold * 2) return 'stale';
  return 'expired';
}

export function LiveStatusBar({
  isConnected,
  latency,
  lastUpdate,
  isReconnecting = false,
  className,
  freshnessThreshold = 30000,
}: LiveStatusBarProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      return new Date();
    }
    return null;
  });
  const isMounted = typeof window !== 'undefined';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const connectionStatus: ConnectionStatus = isReconnecting
    ? 'reconnecting'
    : isConnected
      ? 'connected'
      : 'disconnected';

  const freshnessLevel = useMemo(
    () => getDataFreshnessLevel(lastUpdate, freshnessThreshold, currentTime ?? undefined),
    [lastUpdate, freshnessThreshold, currentTime]
  );

  const displayTime = currentTime ?? new Date();

  const statusConfig = getStatusConfig();
  const freshnessConfig = getFreshnessConfig();
  const status = statusConfig[connectionStatus];
  const freshness = freshnessConfig[freshnessLevel];
  const StatusIcon = status.icon;

  const tooltipContent = isMounted ? (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-gray-400" />
        <span className="font-mono">{formatUTCTime(displayTime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>Response Time: {formatLatency(latency)}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
        <span style={{ color: status.color }}>{status.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3" style={{ color: freshness.color }} />
        <span style={{ color: freshness.color }}>{freshness.label}</span>
      </div>
    </div>
  ) : (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-gray-400" />
        <span className="font-mono">--:--:-- UTC</span>
      </div>
      <div className="flex items-center gap-2">
        <span>Latency: {formatLatency(latency)}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
        <span style={{ color: status.color }}>{status.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3" style={{ color: freshness.color }} />
        <span style={{ color: freshness.color }}>{freshness.label}</span>
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <div
        className={cn(
          'inline-flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm cursor-help',
          className
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs',
            freshness.bgColor
          )}
        >
          <Activity
            className={cn('w-3 h-3', freshness.pulse && 'animate-pulse')}
            style={{ color: freshness.color }}
          />
          <span
            className="hidden sm:inline font-medium whitespace-nowrap"
            style={{ color: freshness.color }}
          >
            {freshness.label}
          </span>
          <span
            className="sm:hidden font-medium whitespace-nowrap"
            style={{ color: freshness.color }}
          >
            {freshness.shortLabel}
          </span>
        </div>

        <div className="w-px h-3 bg-gray-200" />

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span className="whitespace-nowrap">
            {isMounted ? formatLastUpdate(lastUpdate) : '--'}
          </span>
        </div>

        <div className="hidden sm:block w-px h-3 bg-gray-200" />

        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          <StatusIcon
            className={cn('w-3.5 h-3.5', connectionStatus === 'reconnecting' && 'animate-spin')}
            style={{ color: status.color }}
          />
          <span className="hidden sm:inline text-xs font-medium" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>
    </Tooltip>
  );
}
