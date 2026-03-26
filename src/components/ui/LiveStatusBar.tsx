'use client';

import { useState, useEffect, useMemo } from 'react';

import { Wifi, WifiOff, Clock, Zap, RefreshCw, Activity } from 'lucide-react';

import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export type DataFreshnessLevel = 'fresh' | 'stale' | 'expired';

export interface LiveStatusBarProps {
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
  color: string;
  bgColor: string;
  pulse: boolean;
}

const statusConfig: Record<ConnectionStatus, StatusConfig> = {
  connected: {
    label: '已连接',
    icon: Wifi,
    color: semanticColors.success.DEFAULT,
  },
  disconnected: {
    label: '已断开',
    icon: WifiOff,
    color: semanticColors.danger.DEFAULT,
  },
  reconnecting: {
    label: '重连中',
    icon: RefreshCw,
    color: semanticColors.warning.DEFAULT,
  },
};

const freshnessConfig: Record<DataFreshnessLevel, FreshnessConfig> = {
  fresh: {
    label: '数据新鲜',
    color: semanticColors.success.DEFAULT,
    bgColor: 'bg-emerald-50',
    pulse: false,
  },
  stale: {
    label: '数据稍旧',
    color: semanticColors.warning.DEFAULT,
    bgColor: 'bg-amber-50',
    pulse: true,
  },
  expired: {
    label: '数据过期',
    color: semanticColors.danger.DEFAULT,
    bgColor: 'bg-red-50',
    pulse: true,
  },
};

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
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return date.toLocaleDateString();
}

function getDataFreshnessLevel(lastUpdate?: Date, threshold: number = 30000): DataFreshnessLevel {
  if (!lastUpdate) return 'expired';

  const now = new Date();
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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

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
    () => getDataFreshnessLevel(lastUpdate, freshnessThreshold),
    [lastUpdate, freshnessThreshold, currentTime]
  );

  const status = statusConfig[connectionStatus];
  const freshness = freshnessConfig[freshnessLevel];
  const StatusIcon = status.icon;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm',
        className
      )}
    >
      {/* UTC Time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-mono whitespace-nowrap">{formatUTCTime(currentTime)}</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Latency */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Zap className="w-3.5 h-3.5" />
        <span className="font-mono whitespace-nowrap">{formatLatency(latency)}</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Last Update */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="hidden sm:inline text-gray-400">更新:</span>
        <span className="whitespace-nowrap">{formatLastUpdate(lastUpdate)}</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Data Freshness Indicator */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs',
          freshness.bgColor
        )}
        title={`数据新鲜度: ${freshness.label}`}
      >
        <Activity
          className={cn('w-3 h-3', freshness.pulse && 'animate-pulse')}
          style={{ color: freshness.color }}
        />
        <span className="font-medium whitespace-nowrap" style={{ color: freshness.color }}>
          {freshness.label}
        </span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
        <StatusIcon
          className={cn('w-3.5 h-3.5', connectionStatus === 'reconnecting' && 'animate-spin')}
          style={{ color: status.color }}
        />
        <span className="text-xs font-medium" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>
    </div>
  );
}

export default LiveStatusBar;
