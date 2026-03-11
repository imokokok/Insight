'use client';

import { SWRConfig, mutate, preload } from 'swr';
import { ReactNode, createContext, useContext, useCallback, useEffect, useRef } from 'react';

interface CacheData {
  data: unknown;
  timestamp: number;
  staleTime: number;
}

interface StorageCache {
  [key: string]: CacheData;
}

const MEMORY_CACHE = new Map<string, CacheData>();

const STALE_TIME_CONFIG = {
  price: 30 * 1000,
  history: 5 * 60 * 1000,
  network: 60 * 1000,
} as const;

type CacheType = keyof typeof STALE_TIME_CONFIG;

const getCacheKeyType = (key: string): CacheType => {
  if (key.includes('/price') || key.includes('/ticker') || key.includes('/market')) {
    return 'price';
  }
  if (key.includes('/history') || key.includes('/ohlcv') || key.includes('/kline')) {
    return 'history';
  }
  if (key.includes('/network') || key.includes('/status') || key.includes('/health')) {
    return 'network';
  }
  return 'price';
};

const getStaleTime = (key: string): number => {
  return STALE_TIME_CONFIG[getCacheKeyType(key)];
};

const cacheStorage = {
  get: (key: string): CacheData | undefined => {
    if (MEMORY_CACHE.has(key)) {
      return MEMORY_CACHE.get(key);
    }
    try {
      const stored = localStorage.getItem(`swr-cache-${key}`);
      if (stored) {
        const data: CacheData = JSON.parse(stored);
        MEMORY_CACHE.set(key, data);
        return data;
      }
    } catch {
      // ignore
    }
    return undefined;
  },
  set: (key: string, value: unknown): void => {
    const staleTime = getStaleTime(key);
    const cacheData: CacheData = {
      data: value,
      timestamp: Date.now(),
      staleTime,
    };
    MEMORY_CACHE.set(key, cacheData);
    try {
      localStorage.setItem(`swr-cache-${key}`, JSON.stringify(cacheData));
    } catch {
      // ignore
    }
  },
  delete: (key: string): void => {
    MEMORY_CACHE.delete(key);
    try {
      localStorage.removeItem(`swr-cache-${key}`);
    } catch {
      // ignore
    }
  },
  keys: (): IterableIterator<string> => {
    return MEMORY_CACHE.keys();
  },
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch data');
  }
  return response.json();
};

const swrConfig = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 5000,
  provider: () => cacheStorage,
  isOnline: () => typeof navigator !== 'undefined' ? navigator.onLine : true,
};

interface SWRContextValue {
  prefetch: (key: string) => Promise<void>;
  mutate: (key: string, data?: unknown) => Promise<void>;
}

const SWRContext = createContext<SWRContextValue | null>(null);

export const useSWRGlobal = () => {
  const context = useContext(SWRContext);
  if (!context) {
    throw new Error('useSWRGlobal must be used within SWRProvider');
  }
  return context;
};

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const prefetch = useCallback(async (key: string) => {
    try {
      await preload(key, fetcher);
    } catch {
      // ignore preload errors
    }
  }, []);

  const globalMutate = useCallback(async (key: string, data?: unknown) => {
    await mutate(key, data, false);
  }, []);

  useEffect(() => {
    const checkAndRefreshCache = () => {
      MEMORY_CACHE.forEach((cacheData, key) => {
        const elapsed = Date.now() - cacheData.timestamp;
        const remaining = cacheData.staleTime - elapsed;

        if (remaining < 10000 && remaining > 0) {
          const existingTimer = timersRef.current.get(key);
          if (!existingTimer) {
            const timer = setTimeout(() => {
              mutate(key, (current: unknown) => current, { revalidate: true }).then(() => {
                timersRef.current.delete(key);
              });
            }, remaining);
            timersRef.current.set(key, timer);
          }
        }
      });
    };

    const interval = setInterval(checkAndRefreshCache, 5000);
    return () => {
      clearInterval(interval);
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <SWRContext.Provider value={{ prefetch, mutate: globalMutate }}>
      <SWRConfig value={swrConfig}>
        {children}
      </SWRConfig>
    </SWRContext.Provider>
  );
}

export { STALE_TIME_CONFIG, getStaleTime, getCacheKeyType };
