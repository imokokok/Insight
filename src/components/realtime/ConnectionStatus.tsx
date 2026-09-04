'use client';

import { useState, useEffect, useRef } from 'react';

import { type ConnectionStatus } from '@/lib/supabase/realtime';
import { useConnectionStatus, useRealtimeStore } from '@/stores/realtimeStore';

interface ConnectionStatusIndicatorProps {
  showLabel?: boolean;
  showReconnectButton?: boolean;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  { color: string; bgColor: string; icon: string; label: string }
> = {
  connected: {
    color: 'text-success-600',
    bgColor: 'bg-success-100',
    icon: '●',
    label: 'Connected',
  },
  connecting: {
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    icon: '◐',
    label: 'Connecting',
  },
  disconnected: {
    color: 'text-danger-600',
    bgColor: 'bg-danger-100',
    icon: '○',
    label: 'Disconnected',
  },
  error: {
    color: 'text-danger-600',
    bgColor: 'bg-danger-100',
    icon: '✕',
    label: 'Error',
  },
};

export function ConnectionStatusIndicator({
  showLabel = true,
  showReconnectButton = true,
  className = '',
}: ConnectionStatusIndicatorProps) {
  const connectionStatus = useConnectionStatus();
  const reconnect = useRealtimeStore((state) => state.reconnect);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const config = statusConfig[connectionStatus];

  const handleReconnect = async () => {
    setIsReconnecting(true);
    reconnect();
    reconnectTimerRef.current = setTimeout(() => setIsReconnecting(false), 2000);
  };

  const isDisconnected = connectionStatus === 'disconnected' || connectionStatus === 'error';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 border-l-2 px-2 py-1 font-mono text-xs font-medium ${config.bgColor} ${config.color}`}
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
          className="border border-primary-600 bg-primary-600 px-2 py-1 text-xs text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
        </button>
      )}
    </div>
  );
}
