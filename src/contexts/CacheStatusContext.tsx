'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface GlobalCacheStatus {
  isOffline: boolean;
  lastChecked: number;
  pendingRequests: number;
}

interface CacheStatusContextValue {
  status: GlobalCacheStatus;
  subscribe: (callback: (status: GlobalCacheStatus) => void) => () => void;
  notifyRequestStart: () => void;
  notifyRequestEnd: () => void;
}

const CacheStatusContext = createContext<CacheStatusContextValue | null>(null);

const CHECK_INTERVAL = 10000;
const MAX_SUBSCRIBERS = 100;

export function CacheStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GlobalCacheStatus>({
    isOffline: false,
    lastChecked: Date.now(),
    pendingRequests: 0,
  });
  
  const subscribersRef = useRef<Set<(status: GlobalCacheStatus) => void>>(new Set());
  const pendingRequestsRef = useRef(0);

  const notifySubscribers = useCallback((newStatus: GlobalCacheStatus) => {
    subscribersRef.current.forEach(callback => {
      try {
        callback(newStatus);
      } catch (error) {
        console.error('[CacheStatusContext] Error in subscriber callback:', error);
      }
    });
  }, []);

  const updateStatus = useCallback((updates: Partial<GlobalCacheStatus>) => {
    setStatus(prev => {
      const newStatus = { ...prev, ...updates, lastChecked: Date.now() };
      notifySubscribers(newStatus);
      return newStatus;
    });
  }, [notifySubscribers]);

  const subscribe = useCallback((callback: (status: GlobalCacheStatus) => void) => {
    if (subscribersRef.current.size >= MAX_SUBSCRIBERS) {
      console.warn('[CacheStatusContext] Maximum subscribers reached');
      return () => {};
    }
    
    subscribersRef.current.add(callback);
    callback(status);
    
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, [status]);

  const notifyRequestStart = useCallback(() => {
    pendingRequestsRef.current++;
    updateStatus({ pendingRequests: pendingRequestsRef.current });
  }, [updateStatus]);

  const notifyRequestEnd = useCallback(() => {
    pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
    updateStatus({ pendingRequests: pendingRequestsRef.current });
  }, [updateStatus]);

  useEffect(() => {
    const checkOnlineStatus = () => {
      const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      updateStatus({ isOffline });
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, CHECK_INTERVAL);

    const handleOnline = () => updateStatus({ isOffline: false });
    const handleOffline = () => updateStatus({ isOffline: true });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [updateStatus]);

  return (
    <CacheStatusContext.Provider value={{ status, subscribe, notifyRequestStart, notifyRequestEnd }}>
      {children}
    </CacheStatusContext.Provider>
  );
}

export function useGlobalCacheStatus() {
  const context = useContext(CacheStatusContext);
  if (!context) {
    return {
      status: { isOffline: false, lastChecked: Date.now(), pendingRequests: 0 },
      subscribe: () => () => {},
      notifyRequestStart: () => {},
      notifyRequestEnd: () => {},
    };
  }
  return context;
}

export function useCacheStatusOptimized() {
  const { status, subscribe } = useGlobalCacheStatus();
  const [localStatus, setLocalStatus] = useState(status);

  useEffect(() => {
    return subscribe(setLocalStatus);
  }, [subscribe]);

  return localStatus;
}
