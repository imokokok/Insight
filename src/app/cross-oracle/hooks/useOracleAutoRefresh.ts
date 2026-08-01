import { useState, useEffect, useRef, useCallback } from 'react';

import { createLogger } from '@/lib/utils/logger';

import type { RefreshInterval } from '../constants';

const logger = createLogger('useOracleAutoRefresh');

interface UseOracleAutoRefreshOptions {
  refreshInterval: RefreshInterval;
  onRefresh: () => Promise<void>;
  isMountedRef?: React.MutableRefObject<boolean>;
}

interface UseOracleAutoRefreshReturn {
  lastRefreshedAt: Date | null;
  nextRefreshAt: Date | null;
}

export function useOracleAutoRefresh({
  refreshInterval,
  onRefresh,
  isMountedRef,
}: UseOracleAutoRefreshOptions): UseOracleAutoRefreshReturn {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);

  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const internalMountedRef = useRef(true);

  const mountedRef = isMountedRef ?? internalMountedRef;

  const executeRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      await onRefreshRef.current();
      if (mountedRef.current) {
        const now = new Date();
        setLastRefreshedAt(now);
        if (refreshInterval > 0) {
          setNextRefreshAt(new Date(now.getTime() + refreshInterval));
        }
      }
    } catch (err) {
      logger.warn('Auto-refresh fetch failed', err instanceof Error ? err : new Error(String(err)));
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshInterval, mountedRef]);

  useEffect(() => {
    if (refreshInterval === 0) {
      setNextRefreshAt(null);
      return;
    }

    setNextRefreshAt(new Date(Date.now() + refreshInterval));

    const intervalId = setInterval(() => {
      if (!mountedRef.current || document.hidden || isRefreshingRef.current) {
        return;
      }
      executeRefresh();
    }, refreshInterval);

    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefreshingRef.current) {
        executeRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshInterval, executeRefresh, mountedRef]);

  useEffect(() => {
    return () => {
      internalMountedRef.current = false;
    };
  }, []);

  return { lastRefreshedAt, nextRefreshAt };
}
