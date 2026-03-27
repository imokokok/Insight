'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { RefreshCw, Clock } from 'lucide-react';

import { DropdownSelect } from '@/components/ui';
import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';

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

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    if (autoRefreshInterval > 0) {
      setCountdown(autoRefreshInterval);
    }
  }, [onRefresh, autoRefreshInterval]);

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

  const getTooltipText = () => {
    const parts: string[] = [];
    if (lastUpdated) {
      parts.push(
        isChineseLocale(locale)
          ? `最后更新: ${formatTime(lastUpdated)}`
          : `Last updated: ${formatTime(lastUpdated)}`
      );
    }
    if (autoRefreshInterval > 0 && countdown > 0) {
      parts.push(
        isChineseLocale(locale)
          ? `下次刷新: ${formatCountdown(countdown)}`
          : `Next refresh: ${formatCountdown(countdown)}`
      );
    }
    return parts.join('\n') || (isChineseLocale(locale) ? '点击刷新数据' : 'Click to refresh data');
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        title={getTooltipText()}
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
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

      <div className="flex items-center gap-1 px-1">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <DropdownSelect
          options={intervalOptions}
          value={autoRefreshInterval}
          onChange={(value) => onAutoRefreshChange?.(value)}
          className="w-20"
        />
      </div>
    </div>
  );
}
