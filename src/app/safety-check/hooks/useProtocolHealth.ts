import { useState, useCallback } from 'react';

import type { PositionCriticalResult, PositionInput } from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useProtocolHealth');

interface UseProtocolHealthReturn {
  result: PositionCriticalResult | null;
  isLoading: boolean;
  error: string | null;
  calculate: (input: PositionInput) => Promise<void>;
  clear: () => void;
}

export function useProtocolHealth(): UseProtocolHealthReturn {
  const [result, setResult] = useState<PositionCriticalResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (input: PositionInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/protocol-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const message = json.error?.message || 'Failed to calculate position critical deviation';
        throw new Error(message);
      }

      setResult(json.data as PositionCriticalResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Failed to calculate position health: ${message}`);
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { result, isLoading, error, calculate, clear };
}
