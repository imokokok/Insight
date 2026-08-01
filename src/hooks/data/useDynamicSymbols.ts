'use client';

import { useEffect, useRef, useState } from 'react';

import {
  getAllSupportedSymbols,
  getAssetClass,
  oracleSupportedSymbols,
} from '@/lib/oracles/constants/supportedSymbols';

interface SymbolsData {
  symbols: string[];
  oracleSymbols: Record<string, string[]>;
  categories: Record<string, string>;
}

// Build a static fallback from hardcoded constants so the UI can start
// fetching prices immediately without waiting for the database-backed
// /api/symbols endpoint.  The static data is a superset of what the DB
// returns for most oracles, so filtering on the client side works right
// away and the DB result just refines the list in the background.
function buildStaticFallback(): SymbolsData {
  const oracleSyms: Record<string, string[]> = {};
  for (const [provider, symbols] of Object.entries(oracleSupportedSymbols)) {
    oracleSyms[provider] = [...symbols];
  }
  const allSymbols = getAllSupportedSymbols();
  const categories: Record<string, string> = {};
  for (const symbol of allSymbols) {
    categories[symbol] = getAssetClass(symbol);
  }
  return { symbols: allSymbols, oracleSymbols: oracleSyms, categories };
}

const staticFallback = buildStaticFallback();

let globalCache: SymbolsData | null = null;
let globalCacheTimestamp = 0;
let globalFetchPromise: Promise<SymbolsData> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Merge API data with static fallback.
 * API data is authoritative — when the DB has a provider, its symbol list
 * replaces the hardcoded one entirely.  Hardcoded data only fills in
 * providers that the DB has no entry for, so that the intersection logic
 * in useCommonSymbols does not produce an empty set.
 */
function mergeWithFallback(apiData: SymbolsData): SymbolsData {
  const mergedOracleSymbols: Record<string, string[]> = {};

  // Start with API data (DB-backed, authoritative)
  for (const [provider, symbols] of Object.entries(apiData.oracleSymbols)) {
    if (symbols.length > 0) {
      mergedOracleSymbols[provider] = [...symbols];
    }
  }

  // Fill in providers missing from the API with hardcoded data
  for (const [provider, symbols] of Object.entries(staticFallback.oracleSymbols)) {
    if (!mergedOracleSymbols[provider]) {
      mergedOracleSymbols[provider] = [...symbols];
    }
  }

  // Merge symbols and categories (API takes precedence)
  const allSymbols = new Set<string>(apiData.symbols);
  for (const symbol of staticFallback.symbols) {
    allSymbols.add(symbol);
  }

  const mergedCategories: Record<string, string> = {
    ...staticFallback.categories,
    ...apiData.categories,
  };

  return {
    symbols: Array.from(allSymbols).sort(),
    oracleSymbols: mergedOracleSymbols,
    categories: mergedCategories,
  };
}

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
      const merged = mergeWithFallback(data);
      globalCache = merged;
      globalCacheTimestamp = Date.now();
      return merged;
    } finally {
      globalFetchPromise = null;
    }
  })();

  return globalFetchPromise;
}

export function useDynamicSymbols() {
  // Initialize with the static fallback so oracleSymbolsReady is true
  // immediately — the DB-backed data will replace it in the background.
  const [data, setData] = useState<SymbolsData>(globalCache || staticFallback);
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
