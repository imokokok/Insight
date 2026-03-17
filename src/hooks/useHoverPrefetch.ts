'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('HoverPrefetch');

export interface HoverPrefetchOptions {
  delay?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface PrefetchConfig<TParams> {
  queryKey: unknown[];
  queryFn: () => Promise<TParams>;
  staleTime?: number;
  gcTime?: number;
}

export function useHoverPrefetch<T = unknown>(options: HoverPrefetchOptions = {}) {
  const { delay = 150, enabled = true, onError, onSuccess } = options;
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const clearPendingPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const prefetch = useCallback(
    async (config: PrefetchConfig<T>) => {
      if (!enabled) {
        logger.debug('Prefetch disabled, skipping');
        return;
      }

      const cachedData = queryClient.getQueryData(config.queryKey);
      if (cachedData !== undefined) {
        logger.debug('Data already cached, skipping prefetch', {
          queryKey: config.queryKey,
        });
        return;
      }

      clearPendingPrefetch();

      timeoutRef.current = setTimeout(async () => {
        setIsPrefetching(true);
        const startTime = performance.now();

        try {
          await queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            staleTime: config.staleTime,
            gcTime: config.gcTime,
          });

          const duration = performance.now() - startTime;
          logger.debug('Prefetch completed', {
            queryKey: config.queryKey,
            duration: `${duration.toFixed(2)}ms`,
          });

          onSuccess?.();
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Prefetch failed', err, {
            queryKey: config.queryKey,
          });
          onError?.(err);
        } finally {
          setIsPrefetching(false);
          timeoutRef.current = null;
        }
      }, delay);
    },
    [queryClient, enabled, delay, clearPendingPrefetch, onError, onSuccess]
  );

  const cancelPrefetch = useCallback(() => {
    clearPendingPrefetch();
    logger.debug('Prefetch cancelled');
  }, [clearPendingPrefetch]);

  return {
    prefetch,
    cancelPrefetch,
    isPrefetching,
  };
}

export function useHoverPrefetchHandlers<T = unknown>(
  config: PrefetchConfig<T>,
  options?: HoverPrefetchOptions
) {
  const { prefetch, cancelPrefetch, isPrefetching } = useHoverPrefetch<T>(options);

  const handleMouseEnter = useCallback(() => {
    prefetch(config);
  }, [prefetch, config]);

  const handleMouseLeave = useCallback(() => {
    cancelPrefetch();
  }, [cancelPrefetch]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    isPrefetching,
  };
}

export function createPrefetchConfig<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: { staleTime?: number; gcTime?: number }
): PrefetchConfig<T> {
  return {
    queryKey,
    queryFn,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
  };
}
