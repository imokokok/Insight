import { useState, useEffect, useCallback, useRef } from 'react';

import { type BaseOracleClient } from '@/lib/oracles/base';
import { type Blockchain, type PriceData } from '@/types/oracle';

interface UsePriceDataOptions {
  symbol: string;
  chain?: Blockchain;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePriceDataReturn {
  price: PriceData | null;
  previousPrice: number | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

export function usePriceData(
  client: BaseOracleClient,
  options: UsePriceDataOptions
): UsePriceDataReturn {
  const { symbol, chain, autoRefresh = false, refreshInterval = 10000 } = options;

  const [price, setPrice] = useState<PriceData | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPriceRef = useRef<number | null>(null);
  const clientRef = useRef(client);
  const isMountedRef = useRef(true);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPrice = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setError(null);
      const priceData = await clientRef.current.getPrice(symbol, chain, {
        signal: abortController.signal,
      });

      if (abortController.signal.aborted || !isMountedRef.current) return;

      setPreviousPrice(previousPriceRef.current);
      previousPriceRef.current = priceData.price;
      setPrice(priceData);
      setLastUpdated(Date.now());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch price'));
    } finally {
      if (!abortController.signal.aborted && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbol, chain]);

  useEffect(() => {
    fetchPrice();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchPrice, refreshInterval);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice, autoRefresh, refreshInterval]);

  return {
    price,
    previousPrice,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchPrice,
  };
}

interface UseHistoricalPricesOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
}

interface UseHistoricalPricesReturn {
  prices: PriceData[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

export function useHistoricalPrices(
  client: BaseOracleClient,
  options: UseHistoricalPricesOptions
): UseHistoricalPricesReturn {
  const { symbol, chain, period = 24 } = options;

  const [prices, setPrices] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef(client);
  const isMountedRef = useRef(true);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPrices = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setError(null);
      const historicalPrices = await clientRef.current.getHistoricalPrices(symbol, chain, period, {
        signal: abortController.signal,
      });

      if (abortController.signal.aborted || !isMountedRef.current) return;

      setPrices(historicalPrices);
      setLastUpdated(Date.now());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch historical prices'));
    } finally {
      if (!abortController.signal.aborted && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbol, chain, period]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPrices();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrices]);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchPrices,
  };
}
