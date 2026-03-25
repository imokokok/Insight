'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { RefreshCw, Clock, Check } from 'lucide-react';
import { DropdownSelect } from '@/components/ui';

interface RefreshControlProps {
  lastUpdated?: Date;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  autoRefreshInterval?: number;
  onAutoRefreshChange?: (interval: number) => void;
}

export default function RefreshControl({
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  autoRefreshInterval = 0,
  onAutoRefreshChange,
}: RefreshControlProps) {
  const locale = useLocale();
  const [countdown, setCountdown] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const intervalOptions = useMemo(
    () => [
      { value: 0, label: isChineseLocale(locale) ? '手动' : 'Manual' },
      { value: 30, label: isChineseLocale(locale) ? '30秒' : '30s' },
      { value: 60, label: isChineseLocale(locale) ? '1分钟' : '1m' },
      { value: 300, label: isChineseLocale(locale) ? '5分钟' : '5m' },
      { value: 900, label: isChineseLocale(locale) ? '15分钟' : '15m' },
    ],
    [locale]
  );

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
    if (!date) return isChineseLocale(locale) ? '从未' : 'Never';
    return date.toLocaleTimeString(isChineseLocale(locale) ? 'zh-CN' : 'en-US', {
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
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">
          {isRefreshing
            ? isChineseLocale(locale)
              ? '刷新中...'
              : 'Refreshing...'
            : isChineseLocale(locale)
              ? '刷新'
              : 'Refresh'}
        </span>
      </button>

      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <DropdownSelect
          options={intervalOptions}
          value={autoRefreshInterval}
          onChange={(value) => onAutoRefreshChange?.(value)}
          className="w-24"
        />
      </div>

      {autoRefreshInterval > 0 && countdown > 0 && (
        <div className="text-xs text-gray-500">{formatCountdown(countdown)}</div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {showSuccess ? (
          <>
            <Check className="w-3.5 h-3.5 text-success-500" />
            <span className="text-success-600">{isChineseLocale(locale) ? '已更新' : 'Updated'}</span>
          </>
        ) : (
          <>
            <span>{isChineseLocale(locale) ? '更新于:' : 'Updated:'}</span>
            <span>{formatTime(lastUpdated)}</span>
          </>
        )}
      </div>
    </div>
  );
}
