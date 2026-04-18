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

export function useAutoRefresh({
  enabled,
  intervalMs,
  onRefresh,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(intervalMs);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const isAutoRefreshEnabled = enabled && refreshInterval !== 0;

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsDocumentVisible(visible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isAutoRefreshEnabled || !isDocumentVisible) {
      setNextRefreshAt(null);
      return;
    }

    const ms = refreshInterval as number;
    const next = new Date(Date.now() + ms);
    setNextRefreshAt(next);
  }, [isAutoRefreshEnabled, isDocumentVisible, refreshInterval, lastRefreshedAt]);

  useEffect(() => {
    if (!isAutoRefreshEnabled || !isDocumentVisible) return;

    const ms = refreshInterval as number;

    const timer = setInterval(async () => {
      setIsRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        setLastRefreshedAt(new Date());
        setIsRefreshing(false);
      }
    }, ms);

    return () => clearInterval(timer);
  }, [isAutoRefreshEnabled, isDocumentVisible, refreshInterval]);

  useEffect(() => {
    if (!isDocumentVisible && isAutoRefreshEnabled) {
      const handleVisible = async () => {
        if (!document.hidden) {
          setIsRefreshing(true);
          try {
            await onRefreshRef.current();
          } finally {
            setLastRefreshedAt(new Date());
            setIsRefreshing(false);
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisible);
      return () => document.removeEventListener('visibilitychange', handleVisible);
    }
  }, [isDocumentVisible, isAutoRefreshEnabled]);

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
