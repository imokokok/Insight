import { useCallback, useRef, useState } from 'react';

import type { ProtocolDetection } from '@/lib/protocols/detection';
import type { ProtocolHealthEntry } from '@/lib/protocols/portfolio';
import type { PositionCriticalResult, PositionInput } from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('usePortfolioHealth');

/** Run the server stress test for a single position (mirrors useProtocolHealth). */
async function fetchCritical(input: PositionInput): Promise<PositionCriticalResult> {
  const response = await fetch('/api/protocol-health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  let json: { success?: boolean; error?: { message?: string }; data?: unknown };
  try {
    json = await response.json();
  } catch {
    throw new Error(`Failed to calculate position (HTTP ${response.status})`);
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to calculate position');
  }

  return json.data as PositionCriticalResult;
}

/** Detections whose imported position has both collateral and borrow sides. */
function toCompletePositions(detections: ProtocolDetection[]): ProtocolDetection[] {
  return detections.filter(
    (d) =>
      d.hasPosition &&
      d.position &&
      d.position.collaterals.length > 0 &&
      d.position.borrows.length > 0
  );
}

interface UsePortfolioHealthReturn {
  /** Per-protocol results, or null before the first computation. */
  entries: ProtocolHealthEntry[] | null;
  isLoading: boolean;
  /** Top-level error (all computations failed). */
  error: string | null;
  /** Last background-refresh error (results are kept on screen). */
  refreshError: string | null;
  /** Compute results for every complete position in the detection set. */
  computeAll: (detections: ProtocolDetection[]) => Promise<void>;
  /** Recompute the same detections (price / HF drift); keeps results on error. */
  refresh: () => Promise<void>;
  clear: () => void;
}

/**
 * Computes and refreshes the per-protocol stress-test results for a portfolio
 * of detected positions. Each protocol is calculated independently and in
 * parallel; the combined view is derived with `buildCombinedPortfolio`.
 */
export function usePortfolioHealth(): UsePortfolioHealthReturn {
  const [entries, setEntries] = useState<ProtocolHealthEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const lastDetectionsRef = useRef<ProtocolDetection[] | null>(null);

  const runCompute = useCallback(
    async (detections: ProtocolDetection[], keepResultOnError: boolean) => {
      const complete = toCompletePositions(detections);
      if (complete.length === 0) {
        setEntries([]);
        return;
      }

      setIsLoading(true);
      if (!keepResultOnError) setError(null);

      try {
        const computed = await Promise.all(
          complete.map(async (d): Promise<ProtocolHealthEntry> => {
            const input: PositionInput = {
              protocolId: d.protocolId,
              collaterals: d.position!.collaterals.map((c) => ({
                symbol: c.symbol,
                amount: c.amount,
              })),
              borrows: d.position!.borrows.map((b) => ({
                symbol: b.symbol,
                amount: b.amount,
              })),
            };
            const result = await fetchCritical(input);
            return { protocolId: d.protocolId, name: d.name, chain: d.chain, result };
          })
        );
        setEntries(computed);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Failed to calculate portfolio: ${message}`);
        if (!keepResultOnError) {
          setError(message);
          setEntries(null);
        } else {
          setRefreshError(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const computeAll = useCallback(
    async (detections: ProtocolDetection[]) => {
      lastDetectionsRef.current = detections;
      setRefreshError(null);
      await runCompute(detections, false);
    },
    [runCompute]
  );

  const refresh = useCallback(async () => {
    const detections = lastDetectionsRef.current;
    if (!detections || detections.length === 0) return;
    setRefreshError(null);
    await runCompute(detections, true);
  }, [runCompute]);

  const clear = useCallback(() => {
    setEntries(null);
    setError(null);
    setRefreshError(null);
    lastDetectionsRef.current = null;
  }, []);

  return { entries, isLoading, error, refreshError, computeAll, refresh, clear };
}
