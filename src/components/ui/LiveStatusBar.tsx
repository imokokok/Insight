'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Clock, Zap, RefreshCw } from 'lucide-react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface LiveStatusBarProps {
  isConnected: boolean;
  latency?: number;
  lastUpdate?: Date;
  onReconnect?: () => void;
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

const variantStyles = {
  success: {
    badge: 'bg-success-50 text-success-700 border-success-200',
    dot: 'bg-success-500',
    icon: 'text-success-500',
  },
  danger: {
    badge: 'bg-danger-50 text-danger-700 border-danger-200',
    dot: 'bg-danger-500',
    icon: 'text-danger-500',
  },
  warning: {
    badge: 'bg-warning-50 text-warning-700 border-warning-200',
    dot: 'bg-warning-500',
    icon: 'text-warning-500',
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
  onReconnect,
  className,
}: LiveStatusBarProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleReconnect = useCallback(() => {
    if (onReconnect && !isReconnecting) {
      setIsReconnecting(true);
      onReconnect();
      setTimeout(() => setIsReconnecting(false), 2000);
    }
  }, [onReconnect, isReconnecting]);

  const connectionStatus: ConnectionStatus = isReconnecting
    ? 'reconnecting'
    : isConnected
      ? 'connected'
      : 'disconnected';

  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;
  const styles = variantStyles[status.variant];

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm',
        className
      )}
    >
      {/* UTC Time */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="font-mono">{formatUTCTime(currentTime)} UTC</span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Latency */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Zap className="w-4 h-4 text-gray-400" />
        <span className="font-mono">{formatLatency(latency)}</span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Last Update */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-gray-400">更新:</span>
        <span>{formatLastUpdate(lastUpdate)}</span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Connection Status */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full',
          styles.badge
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
        <StatusIcon
          className={cn(
            'w-3.5 h-3.5',
            connectionStatus === 'reconnecting' && 'animate-spin',
            styles.icon
          )}
        />
        <span>{status.label}</span>
      </div>

      {/* Reconnect Button */}
      {!isConnected && onReconnect && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium',
              'bg-primary-50 text-primary-700 border border-primary-200 rounded-full',
              'hover:bg-primary-100 active:bg-primary-200 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isReconnecting && 'animate-spin')}
            />
            <span>重连</span>
          </button>
        </>
      )}
    </div>
  );
}

export default LiveStatusBar;
