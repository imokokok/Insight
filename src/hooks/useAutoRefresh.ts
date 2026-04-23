'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export type RefreshInterval = 0 | 10000 | 30000 | 60000 | 300000;

export const REFRESH_INTERVALS: { value: RefreshInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
];

export function refreshIntervalToMs(interval: RefreshInterval): number | false {
  return interval === 0 ? false : interval;
}

interface UseAutoRefreshOptions {
  enabled: boolean;
  intervalMs: RefreshInterval;
  onRefresh: () => Promise<void>;
}

interface UseAutoRefreshReturn {
  isAutoRefreshEnabled: boolean;
  refreshInterval: RefreshInterval;
  lastRefreshedAt: Date | null;
  nextRefreshAt: Date | null;
  setRefreshInterval: (interval: RefreshInterval) => void;
  toggleAutoRefresh: () => void;
  isRefreshing: boolean;
}

function useAutoRefresh({
  enabled,
  intervalMs,
  onRefresh,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(intervalMs);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => {
    if (typeof document !== 'undefined') {
      return !document.hidden;
    }
    return true;
  });

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const isRefreshingRef = useRef(false);

  const isAutoRefreshEnabled = enabled && refreshInterval !== 0;

  const nextRefreshAt = useMemo(() => {
    if (!isAutoRefreshEnabled || !isDocumentVisible || !lastRefreshedAt) return null;
    return new Date(lastRefreshedAt.getTime() + (refreshInterval as number));
  }, [isAutoRefreshEnabled, isDocumentVisible, lastRefreshedAt, refreshInterval]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsDocumentVisible(visible);

      if (visible && enabled) {
        const ms = refreshInterval as number;
        if (ms > 0 && !isRefreshingRef.current) {
          isRefreshingRef.current = true;
          setIsRefreshing(true);
          onRefreshRef
            .current()
            .then(() => {
              setLastRefreshedAt(new Date());
            })
            .catch(() => {})
            .finally(() => {
              isRefreshingRef.current = false;
              setIsRefreshing(false);
            });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, refreshInterval]);

  useEffect(() => {
    if (!isAutoRefreshEnabled || !isDocumentVisible) return;

    const ms = refreshInterval as number;

    const timer = setInterval(() => {
      if (isRefreshingRef.current) return;

      isRefreshingRef.current = true;
      setIsRefreshing(true);
      onRefreshRef
        .current()
        .then(() => {
          setLastRefreshedAt(new Date());
        })
        .catch(() => {})
        .finally(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        });
    }, ms);

    return () => clearInterval(timer);
  }, [isAutoRefreshEnabled, isDocumentVisible, refreshInterval]);

  const toggleAutoRefresh = useCallback(() => {
    setRefreshInterval((prev) => (prev === 0 ? 30000 : 0));
  }, []);

  return {
    isAutoRefreshEnabled,
    refreshInterval,
    lastRefreshedAt,
    nextRefreshAt,
    setRefreshInterval,
    toggleAutoRefresh,
    isRefreshing,
  };
}
