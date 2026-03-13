'use client';

import { useState } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { ConnectionStatus } from '@/lib/supabase/realtime';

interface ConnectionStatusIndicatorProps {
  showLabel?: boolean;
  showReconnectButton?: boolean;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  { color: string; bgColor: string; label: string; icon: string }
> = {
  connected: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: '已连接',
    icon: '●',
  },
  connecting: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: '连接中',
    icon: '◐',
  },
  disconnected: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: '已断开',
    icon: '○',
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: '连接错误',
    icon: '✕',
  },
};

export function ConnectionStatusIndicator({
  showLabel = true,
  showReconnectButton = true,
  className = '',
}: ConnectionStatusIndicatorProps) {
  const { connectionStatus, reconnect } = useRealtime();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const config = statusConfig[connectionStatus];

  const handleReconnect = async () => {
    setIsReconnecting(true);
    reconnect();
    setTimeout(() => setIsReconnecting(false), 2000);
  };

  const isDisconnected = connectionStatus === 'disconnected' || connectionStatus === 'error';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
      >
        <span className={`text-sm ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}>
          {config.icon}
        </span>
        {showLabel && <span>{config.label}</span>}
      </div>

      {showReconnectButton && isDisconnected && (
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isReconnecting ? '重连中...' : '重新连接'}
        </button>
      )}
    </div>
  );
}

export function ConnectionStatusBadge({ className = '' }: { className?: string }) {
  const { connectionStatus } = useRealtime();
  const config = statusConfig[connectionStatus];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color} ${className}`}
      title={`实时连接状态: ${config.label}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected'
            ? 'bg-green-500'
            : connectionStatus === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
        }`}
      />
      <span>{config.label}</span>
    </div>
  );
}

export function ConnectionStatusDot({ className = '' }: { className?: string }) {
  const { connectionStatus } = useRealtime();

  return (
    <div
      className={`relative ${className}`}
      title={`实时连接状态: ${statusConfig[connectionStatus].label}`}
    >
      <span
        className={`absolute w-3 h-3 rounded-full ${
          connectionStatus === 'connected'
            ? 'bg-green-500'
            : connectionStatus === 'connecting'
              ? 'bg-yellow-500 animate-ping'
              : 'bg-red-500'
        }`}
      />
      <span
        className={`absolute w-3 h-3 rounded-full ${
          connectionStatus === 'connected'
            ? 'bg-green-500'
            : connectionStatus === 'connecting'
              ? 'bg-yellow-500'
              : 'bg-red-500'
        }`}
      />
    </div>
  );
}

export default ConnectionStatusIndicator;
