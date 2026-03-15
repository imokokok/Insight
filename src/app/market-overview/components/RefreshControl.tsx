'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { RefreshCw, Clock, Check, AlertCircle } from 'lucide-react';

interface RefreshControlProps {
  lastUpdated?: Date;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  autoRefreshInterval?: number; // seconds
  onAutoRefreshChange?: (interval: number) => void;
}

export default function RefreshControl({
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  autoRefreshInterval = 0,
  onAutoRefreshChange,
}: RefreshControlProps) {
  const { locale } = useI18n();
  const [countdown, setCountdown] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // 自动刷新倒计时
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    setCountdown(autoRefreshInterval);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRefresh?.();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, onRefresh]);

  // 显示刷新成功提示
  useEffect(() => {
    if (!isRefreshing && lastUpdated) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing, lastUpdated]);

  const handleRefresh = () => {
    onRefresh?.();
    if (autoRefreshInterval > 0) {
      setCountdown(autoRefreshInterval);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return locale === 'zh-CN' ? '从未' : 'Never';
    return date.toLocaleTimeString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* 刷新按钮 */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">
          {isRefreshing
            ? locale === 'zh-CN'
              ? '刷新中...'
              : 'Refreshing...'
            : locale === 'zh-CN'
            ? '刷新'
            : 'Refresh'}
        </span>
      </button>

      {/* 自动刷新选择 */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <select
          value={autoRefreshInterval}
          onChange={(e) => onAutoRefreshChange?.(parseInt(e.target.value))}
          className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>{locale === 'zh-CN' ? '手动' : 'Manual'}</option>
          <option value={30}>{locale === 'zh-CN' ? '30秒' : '30s'}</option>
          <option value={60}>{locale === 'zh-CN' ? '1分钟' : '1m'}</option>
          <option value={300}>{locale === 'zh-CN' ? '5分钟' : '5m'}</option>
          <option value={900}>{locale === 'zh-CN' ? '15分钟' : '15m'}</option>
        </select>
      </div>

      {/* 倒计时 */}
      {autoRefreshInterval > 0 && countdown > 0 && (
        <div className="text-xs text-gray-500">
          {formatCountdown(countdown)}
        </div>
      )}

      {/* 最后更新时间 */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {showSuccess ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-600">
              {locale === 'zh-CN' ? '已更新' : 'Updated'}
            </span>
          </>
        ) : (
          <>
            <span>{locale === 'zh-CN' ? '更新于:' : 'Updated:'}</span>
            <span>{formatTime(lastUpdated)}</span>
          </>
        )}
      </div>
    </div>
  );
}
