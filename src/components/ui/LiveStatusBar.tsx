'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Clock, Zap, RefreshCw } from 'lucide-react';
import { baseColors, semanticColors } from '@/lib/config/colors';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface LiveStatusBarProps {
  isConnected: boolean;
  latency?: number;
  lastUpdate?: Date;
  isReconnecting?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: typeof Wifi;
  color: string;
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

export function LiveStatusBar({
  isConnected,
  latency,
  lastUpdate,
  isReconnecting = false,
  className,
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

  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm',
        className
      )}
    >
      {/* UTC Time */}
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{ color: baseColors.gray[500] }}
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="font-mono whitespace-nowrap">
          {formatUTCTime(currentTime)}
        </span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div
        className="hidden sm:block w-px h-3"
        style={{ backgroundColor: baseColors.gray[200] }}
      />

      {/* Latency */}
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{ color: baseColors.gray[500] }}
      >
        <Zap className="w-3.5 h-3.5" />
        <span className="font-mono whitespace-nowrap">
          {formatLatency(latency)}
        </span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div
        className="hidden sm:block w-px h-3"
        style={{ backgroundColor: baseColors.gray[200] }}
      />

      {/* Last Update */}
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{ color: baseColors.gray[500] }}
      >
        <span
          className="hidden sm:inline"
          style={{ color: baseColors.gray[400] }}
        >
          更新:
        </span>
        <span className="whitespace-nowrap">{formatLastUpdate(lastUpdate)}</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div
        className="hidden sm:block w-px h-3"
        style={{ backgroundColor: baseColors.gray[200] }}
      />

      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <StatusIcon
          className={cn(
            'w-3.5 h-3.5',
            connectionStatus === 'reconnecting' && 'animate-spin'
          )}
          style={{ color: status.color }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: status.color }}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}

export default LiveStatusBar;
