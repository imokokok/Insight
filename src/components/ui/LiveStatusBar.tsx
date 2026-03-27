'use client';

import { useState, useEffect, useMemo } from 'react';

import { Wifi, WifiOff, Clock, Zap, RefreshCw, Activity } from 'lucide-react';

import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

import { Tooltip } from './Tooltip';

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
  shortLabel: string;
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
    shortLabel: '新鲜',
    color: semanticColors.success.DEFAULT,
    bgColor: 'bg-emerald-50',
    pulse: false,
  },
  stale: {
    label: '数据稍旧',
    shortLabel: '稍旧',
    color: semanticColors.warning.DEFAULT,
    bgColor: 'bg-amber-50',
    pulse: true,
  },
  expired: {
    label: '数据过期',
    shortLabel: '过期',
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
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
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

  const displayTime = currentTime ?? new Date();

  const status = statusConfig[connectionStatus];
  const freshness = freshnessConfig[freshnessLevel];
  const StatusIcon = status.icon;

  // Tooltip 内容 - 只在客户端挂载后显示动态内容
  const tooltipContent = isMounted ? (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-gray-400" />
        <span className="font-mono">{formatUTCTime(displayTime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="w-3 h-3 text-gray-400" />
        <span>延迟: {formatLatency(latency)}</span>
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
        <Zap className="w-3 h-3 text-gray-400" />
        <span>延迟: {formatLatency(latency)}</span>
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
        {/* 数据新鲜度 - Pill 样式 */}
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

        {/* 分隔线 */}
        <div className="w-px h-3 bg-gray-200" />

        {/* 最后更新时间 */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span className="whitespace-nowrap">
            {isMounted ? formatLastUpdate(lastUpdate) : '--'}
          </span>
        </div>

        {/* 分隔线 - 小屏幕隐藏 */}
        <div className="hidden sm:block w-px h-3 bg-gray-200" />

        {/* 连接状态 - 小屏幕只显示图标 */}
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

export default LiveStatusBar;
