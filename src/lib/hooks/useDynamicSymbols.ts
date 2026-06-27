'use client';

import { useEffect, useRef, useState } from 'react';

interface SymbolsData {
  symbols: string[];
  oracleSymbols: Record<string, string[]>;
  categories: Record<string, string>;
}

let globalCache: SymbolsData | null = null;
let globalCacheTimestamp = 0;
let globalFetchPromise: Promise<SymbolsData> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchSymbols(signal?: AbortSignal): Promise<SymbolsData> {
  if (globalCache && Date.now() - globalCacheTimestamp < CACHE_TTL_MS) {
    return globalCache;
  }

  // Deduplicate concurrent requests
  if (globalFetchPromise) return globalFetchPromise;

  globalFetchPromise = (async () => {
    try {
      const res = await fetch('/api/symbols', { signal });
      if (!res.ok) throw new Error(`Failed to fetch symbols: ${res.status}`);
      const data: SymbolsData = await res.json();
      globalCache = data;
      globalCacheTimestamp = Date.now();
      return data;
    } finally {
      globalFetchPromise = null;
    }
  })();

  return globalFetchPromise;
}

export function useDynamicSymbols() {
  const [data, setData] = useState<SymbolsData>({
    symbols: globalCache?.symbols || [],
    oracleSymbols: globalCache?.oracleSymbols || {},
    categories: globalCache?.categories || {},
  });
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (globalCache && Date.now() - globalCacheTimestamp < CACHE_TTL_MS) {
      setData(globalCache);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    fetchSymbols(abortController.signal)
      .then((result) => {
        if (!isMountedRef.current || abortController.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current || abortController.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoading(false);
        setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      isMountedRef.current = false;
      abortController.abort();
    };
  }, []);

  return { ...data, loading, error };
}
