'use client';

import { useEffect, useState } from 'react';

import { Wifi } from 'lucide-react';

import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';

interface RealtimeIndicatorProps {
  isConnected?: boolean;
  latency?: number;
  onReconnect?: () => void;
}

export default function RealtimeIndicator({
  isConnected = true,
  latency,
  onReconnect,
}: RealtimeIndicatorProps) {
  const locale = useLocale();
  const [pulse, setPulse] = useState(false);

  // 脉冲动画效果
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const getStatusColor = () => {
    if (!isConnected) return 'bg-danger-500';
    if (latency && latency > 1000) return 'bg-warning-500';
    return 'bg-success-500';
  };

  const getStatusText = () => {
    if (!isConnected) return isChineseLocale(locale) ? '已断开' : 'Disconnected';
    if (latency && latency > 1000) return isChineseLocale(locale) ? '延迟高' : 'High Latency';
    return isChineseLocale(locale) ? '实时' : 'Live';
  };

  return (
    <div className="flex items-center gap-2">
      {/* 状态指示器 */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 ${getStatusColor()} ${pulse && isConnected ? 'animate-pulse' : ''}`}
        />
        <span className="text-xs text-gray-500">{getStatusText()}</span>
      </div>

      {/* 延迟显示 */}
      {latency !== undefined && isConnected && (
        <span className="text-xs text-gray-400">{latency}ms</span>
      )}

      {/* 断开连接时的重连按钮 */}
      {!isConnected && onReconnect && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Wifi className="w-3 h-3" />
          {isChineseLocale(locale) ? '重连' : 'Reconnect'}
        </button>
      )}
    </div>
  );
}
