'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { RefreshCw, Clock } from 'lucide-react';

import { DropdownSelect } from '@/components/ui';
import { useTranslations, useLocale } from '@/i18n';

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
  const t = useTranslations('marketOverview.refresh');
  const locale = useLocale();
  const [countdown, setCountdown] = useState<number>(autoRefreshInterval);

  const intervalOptions = useMemo(
    () => [
      { value: 0, label: t('manual') },
      { value: 30, label: t('30s') },
      { value: 60, label: t('1m') },
      { value: 300, label: t('5m') },
      { value: 900, label: t('15m') },
    ],
    [t]
  );

  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

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
    if (!date) return t('never');
    return date.toLocaleTimeString(locale, {
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
      parts.push(t('lastUpdated', { time: formatTime(lastUpdated) }));
    }
    if (autoRefreshInterval > 0 && countdown > 0) {
      parts.push(t('nextRefresh', { time: formatCountdown(countdown) }));
    }
    return parts.join('\n') || t('clickToRefresh');
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
        <span className="hidden sm:inline">{isRefreshing ? t('refreshing') : t('refresh')}</span>
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
