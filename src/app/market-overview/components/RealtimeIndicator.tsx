'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { WebSocketStatus } from '@/lib/realtime/websocket';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
} from 'lucide-react';

interface RealtimeIndicatorProps {
  status: WebSocketStatus;
  lastUpdated: Date | null;
  onReconnect: () => void;
  connectedChannels: string[];
  messageCount?: number;
}

export default function RealtimeIndicator({
  status,
  lastUpdated,
  onReconnect,
  connectedChannels,
  messageCount = 0,
}: RealtimeIndicatorProps) {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <SignalHigh className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: isZh ? '已连接' : 'Connected',
          pulse: true,
        };
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: isZh ? '连接中...' : 'Connecting...',
          pulse: false,
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: isZh ? '重连中...' : 'Reconnecting...',
          pulse: false,
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: isZh ? '连接错误' : 'Connection Error',
          pulse: false,
        };
      case 'disconnected':
      default:
        return {
          icon: <SignalZero className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: isZh ? '未连接' : 'Disconnected',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  const formatLastUpdated = () => {
    if (!lastUpdated) return isZh ? '从未更新' : 'Never updated';

    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 5) return isZh ? '刚刚' : 'Just now';
    if (seconds < 60) return isZh ? `${seconds}秒前` : `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return isZh ? `${minutes}分钟前` : `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return isZh ? `${hours}小时前` : `${hours}h ago`;

    return lastUpdated.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConnectionQuality = () => {
    if (status !== 'connected') return null;

    // 根据消息频率模拟连接质量
    if (messageCount > 100) {
      return { label: isZh ? '极佳' : 'Excellent', color: 'text-green-600' };
    } else if (messageCount > 50) {
      return { label: isZh ? '良好' : 'Good', color: 'text-blue-600' };
    } else if (messageCount > 10) {
      return { label: isZh ? '一般' : 'Fair', color: 'text-amber-600' };
    }
    return { label: isZh ? '较弱' : 'Weak', color: 'text-gray-600' };
  };

  const quality = getConnectionQuality();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${config.bgColor} ${config.borderColor} hover:shadow-sm`}
      >
        <div className={`relative ${config.color}`}>
          {config.icon}
          {config.pulse && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        {lastUpdated && status === 'connected' && (
          <span className="text-xs text-gray-400">· {formatLastUpdated()}</span>
        )}
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
          <div className="p-4">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Radio className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {isZh ? '实时连接' : 'Realtime Connection'}
                  </p>
                  <p className={`text-sm ${config.color}`}>{config.label}</p>
                </div>
              </div>
              {status !== 'connected' && status !== 'connecting' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReconnect();
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={isZh ? '重新连接' : 'Reconnect'}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Connection Info */}
            <div className="space-y-3">
              {/* Last Updated */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{isZh ? '最后更新' : 'Last Updated'}</span>
                </div>
                <span className="font-medium text-gray-900">{formatLastUpdated()}</span>
              </div>

              {/* Connection Quality */}
              {quality && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Zap className="w-4 h-4" />
                    <span>{isZh ? '连接质量' : 'Quality'}</span>
                  </div>
                  <span className={`font-medium ${quality.color}`}>{quality.label}</span>
                </div>
              )}

              {/* Message Count */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Wifi className="w-4 h-4" />
                  <span>{isZh ? '消息数' : 'Messages'}</span>
                </div>
                <span className="font-medium text-gray-900">{messageCount.toLocaleString()}</span>
              </div>

              {/* Connected Channels */}
              {connectedChannels.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">
                    {isZh ? '已订阅频道' : 'Subscribed Channels'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {connectedChannels.map((channel) => (
                      <span
                        key={channel}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
              {status === 'connected' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReconnect();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {isZh ? '刷新连接' : 'Refresh'}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReconnect();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {status === 'connecting' || status === 'reconnecting' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                  {status === 'connecting' || status === 'reconnecting'
                    ? isZh
                      ? '连接中...'
                      : 'Connecting...'
                    : isZh
                      ? '连接'
                      : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />}
    </div>
  );
}

// Compact version for header use
interface RealtimeIndicatorCompactProps {
  status: WebSocketStatus;
  lastUpdated: Date | null;
  onReconnect: () => void;
}

export function RealtimeIndicatorCompact({
  status,
  lastUpdated,
  onReconnect,
}: RealtimeIndicatorCompactProps) {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="relative">
            <SignalHigh className="w-4 h-4 text-green-600" />
            <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
          </div>
        );
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'disconnected':
      default:
        return <SignalZero className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onReconnect}
        className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title={isZh ? '重新连接' : 'Reconnect'}
      >
        {getStatusIcon()}
        {lastUpdated && status === 'connected' && <span className="text-xs">{formatTime()}</span>}
      </button>
    </div>
  );
}
