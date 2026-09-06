import { useState, useCallback, useEffect, useRef } from 'react';

import type { PositionCriticalResult, PositionInput } from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useProtocolHealth');

interface UseProtocolHealthReturn {
  result: PositionCriticalResult | null;
  isLoading: boolean;
  error: string | null;
  /** Error from a background refresh; does not clear `result`. */
  refreshError: string | null;
  calculate: (input: PositionInput, opts?: { keepResultOnError?: boolean }) => Promise<void>;
  clear: () => void;
}

export function useProtocolHealth(): UseProtocolHealthReturn {
  const [result, setResult] = useState<PositionCriticalResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    []
  );

  const calculate = useCallback(
    async (input: PositionInput, opts?: { keepResultOnError?: boolean }) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      const requestId = ++requestIdRef.current;
      const keepResult = Boolean(opts?.keepResultOnError);
      setIsLoading(true);
      if (keepResult) setRefreshError(null);
      else setError(null);

      try {
        const response = await fetch('/api/protocol-health', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        let json: { success?: boolean; error?: { message?: string }; data?: unknown };
        try {
          json = await response.json();
        } catch {
          throw new Error(
            `Failed to calculate position critical deviation (HTTP ${response.status})`
          );
        }

        if (!response.ok || !json.success) {
          const message = json.error?.message || 'Failed to calculate position critical deviation';
          throw new Error(message);
        }

        if (requestId === requestIdRef.current) {
          setResult(json.data as PositionCriticalResult);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Failed to calculate position health: ${message}`);
        if (keepResult) {
          // Background refresh: keep the last good result on screen.
          setRefreshError(message);
        } else {
          setError(message);
          setResult(null);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          activeRequestRef.current = null;
          setIsLoading(false);
        }
      }
    },
    []
  );

  const clear = useCallback(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    requestIdRef.current += 1;
    setResult(null);
    setError(null);
    setRefreshError(null);
    setIsLoading(false);
  }, []);

  return { result, isLoading, error, refreshError, calculate, clear };
}
