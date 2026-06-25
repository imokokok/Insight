'use client';

import { useEffect, useState } from 'react';

interface SymbolsData {
  symbols: string[];
  oracleSymbols: Record<string, string[]>;
  categories: Record<string, string>;
}

let globalCache: SymbolsData | null = null;
let globalCacheTimestamp = 0;
let globalFetchPromise: Promise<SymbolsData> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchSymbols(): Promise<SymbolsData> {
  if (globalCache && Date.now() - globalCacheTimestamp < CACHE_TTL_MS) {
    return globalCache;
  }

  // Deduplicate concurrent requests
  if (globalFetchPromise) return globalFetchPromise;

  globalFetchPromise = (async () => {
    try {
      const res = await fetch('/api/symbols');
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

  useEffect(() => {
    if (globalCache && Date.now() - globalCacheTimestamp < CACHE_TTL_MS) {
      setData(globalCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchSymbols().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  return { ...data, loading };
}
