'use client';

import { useState, useEffect, useRef } from 'react';
import { useConnectionStatus, useRealtimeActions } from '@/stores/realtimeStore';
import { ConnectionStatus } from '@/lib/supabase/realtime';
import { useTranslations } from '@/i18n';

interface ConnectionStatusIndicatorProps {
  showLabel?: boolean;
  showReconnectButton?: boolean;
  className?: string;
}

const statusConfig: Record<ConnectionStatus, { color: string; bgColor: string; icon: string }> = {
  connected: {
    color: 'text-success-600',
    bgColor: 'bg-success-100',
    icon: '●',
  },
  connecting: {
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    icon: '◐',
  },
  disconnected: {
    color: 'text-danger-600',
    bgColor: 'bg-danger-100',
    icon: '○',
  },
  error: {
    color: 'text-danger-600',
    bgColor: 'bg-danger-100',
    icon: '✕',
  },
};

export function ConnectionStatusIndicator({
  showLabel = true,
  showReconnectButton = true,
  className = '',
}: ConnectionStatusIndicatorProps) {
  const connectionStatus = useConnectionStatus();
  const { reconnect } = useRealtimeActions();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const t = useTranslations();

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
        className={`flex items-center gap-1.5 px-2 py-1  text-xs font-medium ${config.bgColor} ${config.color}`}
      >
        <span className={`text-sm ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}>
          {config.icon}
        </span>
        {showLabel && <span>{t(`connectionStatus.${connectionStatus}`)}</span>}
      </div>

      {showReconnectButton && isDisconnected && (
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isReconnecting ? t('connectionStatus.reconnecting') : t('connectionStatus.reconnect')}
        </button>
      )}
    </div>
  );
}

export function ConnectionStatusBadge({ className = '' }: { className?: string }) {
  const connectionStatus = useConnectionStatus();
  const t = useTranslations();
  const config = statusConfig[connectionStatus];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5  text-xs ${config.bgColor} ${config.color} ${className}`}
      title={`${t('connectionStatus.title')} ${t(`connectionStatus.${connectionStatus}`)}`}
    >
      <span
        className={`w-2 h-2  ${
          connectionStatus === 'connected'
            ? 'bg-success-500'
            : connectionStatus === 'connecting'
              ? 'bg-warning-500 animate-pulse'
              : 'bg-danger-500'
        }`}
      />
      <span>{t(`connectionStatus.${connectionStatus}`)}</span>
    </div>
  );
}

export function ConnectionStatusDot({ className = '' }: { className?: string }) {
  const connectionStatus = useConnectionStatus();
  const t = useTranslations();

  return (
    <div
      className={`relative ${className}`}
      title={`${t('connectionStatus.title')} ${t(`connectionStatus.${connectionStatus}`)}`}
    >
      <span
        className={`absolute w-3 h-3  ${
          connectionStatus === 'connected'
            ? 'bg-success-500'
            : connectionStatus === 'connecting'
              ? 'bg-warning-500 animate-ping'
              : 'bg-danger-500'
        }`}
      />
      <span
        className={`absolute w-3 h-3  ${
          connectionStatus === 'connected'
            ? 'bg-success-500'
            : connectionStatus === 'connecting'
              ? 'bg-warning-500'
              : 'bg-danger-500'
        }`}
      />
    </div>
  );
}

export default ConnectionStatusIndicator;
