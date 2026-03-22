'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Clock, Zap, RefreshCw } from 'lucide-react';

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
  variant: 'success' | 'danger' | 'warning';
}

const statusConfig: Record<ConnectionStatus, StatusConfig> = {
  connected: {
    label: '已连接',
    icon: Wifi,
    variant: 'success',
  },
  disconnected: {
    label: '已断开',
    icon: WifiOff,
    variant: 'danger',
  },
  reconnecting: {
    label: '重连中',
    icon: RefreshCw,
    variant: 'warning',
  },
};

function formatUTCTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function formatLatency(ms?: number): string {
  if (ms === undefined || ms === null) return '-- ms';
  return `${Math.round(ms)} ms`;
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

  const getStatusColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-[var(--success-500)]';
      case 'warning':
        return 'bg-[var(--warning-500)]';
      case 'danger':
        return 'bg-[var(--danger-500)]';
      default:
        return 'bg-[var(--gray-500)]';
    }
  };

  const getStatusTextColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'text-[var(--success-500)]';
      case 'warning':
        return 'text-[var(--warning-500)]';
      case 'danger':
        return 'text-[var(--danger-500)]';
      default:
        return 'text-[var(--gray-500)]';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm',
        className
      )}
    >
      {/* UTC Time */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-mono whitespace-nowrap">{formatUTCTime(currentTime)} UTC</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Latency */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
        <Zap className="w-3.5 h-3.5" />
        <span className="font-mono whitespace-nowrap">{formatLatency(latency)}</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Last Update */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
        <span className="text-gray-400 hidden sm:inline">更新:</span>
        <span className="whitespace-nowrap">{formatLastUpdate(lastUpdate)}</span>
      </div>

      {/* Separator - Hidden on mobile */}
      <div className="hidden sm:block w-px h-3 bg-gray-200" />

      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full', getStatusColor(status.variant))} />
        <StatusIcon
          className={cn(
            'w-3.5 h-3.5',
            connectionStatus === 'reconnecting' && 'animate-spin',
            getStatusTextColor(status.variant)
          )}
        />
        <span className={cn('text-xs font-medium', getStatusTextColor(status.variant))}>
          {status.label}
        </span>
      </div>
    </div>
  );
}

export default LiveStatusBar;
