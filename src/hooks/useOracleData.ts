import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseOracleClient } from '@/lib/oracles/base';
import { PriceData, Blockchain } from '@/lib/types/oracle';

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
      const priceData = await clientRef.current.getPrice(symbol, chain);

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
      const historicalPrices = await clientRef.current.getHistoricalPrices(symbol, chain, period);

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

interface UseMultiplePricesOptions {
  symbols: string[];
  chain?: Blockchain;
}

interface UseMultiplePricesReturn {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  errors: Record<string, Error>;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

export function useMultiplePrices(
  clients: Record<string, BaseOracleClient>,
  options: UseMultiplePricesOptions
): UseMultiplePricesReturn {
  const { symbols, chain } = options;

  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, Error>>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientsRef = useRef(clients);
  const isMountedRef = useRef(true);

  useEffect(() => {
    clientsRef.current = clients;
  }, [clients]);

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

    setIsLoading(true);
    setErrors({});

    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const client = clientsRef.current[symbol];
        if (!client) throw new Error(`No client for symbol: ${symbol}`);
        const price = await client.getPrice(symbol, chain);
        return { symbol, price };
      })
    );

    if (abortController.signal.aborted || !isMountedRef.current) return;

    const newPrices: Record<string, PriceData> = {};
    const newErrors: Record<string, Error> = {};

    results.forEach((result, index) => {
      const symbol = symbols[index];
      if (result.status === 'fulfilled') {
        newPrices[symbol] = result.value.price;
      } else {
        newErrors[symbol] =
          result.reason instanceof Error ? result.reason : new Error('Unknown error');
      }
    });

    setPrices(newPrices);
    setErrors(newErrors);
    setLastUpdated(Date.now());
    setIsLoading(false);
  }, [symbols, chain]);

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
    errors,
    lastUpdated,
    refetch: fetchPrices,
  };
}
