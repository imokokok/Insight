import { useCallback, useState } from 'react';

import type { ProtocolDetection } from '@/lib/protocols/detection';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('usePortfolioDetect');

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface UsePortfolioDetectReturn {
  /** True while a scan is in flight. */
  detecting: boolean;
  /** Detection records (one per supported protocol), or null before first scan. */
  detections: ProtocolDetection[] | null;
  /** User-facing error for the scan (invalid address, network, server). */
  detectError: string | null;
  /** Timestamp (ms) of the last successful scan. */
  detectedAt: number | null;
  /** Run the cross-protocol scan for an address. */
  detect: (address: string) => Promise<void>;
  /** Clear all scan state. */
  reset: () => void;
}

/**
 * Client hook that scans every supported lending protocol for an address via
 * the `/api/protocol-health/detect` endpoint. The backend runs the scans in
 * parallel and isolates per-protocol failures, so this hook only surfaces a
 * top-level error when the request itself fails.
 */
export function usePortfolioDetect(): UsePortfolioDetectReturn {
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<ProtocolDetection[] | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectedAt, setDetectedAt] = useState<number | null>(null);

  const detect = useCallback(async (rawAddress: string) => {
    const address = rawAddress.trim();
    setDetectError(null);

    if (!address.match(ADDRESS_RE)) {
      setDetectError('请输入有效的 0x 钱包地址（42 位字符）。');
      setDetections(null);
      return;
    }

    setDetecting(true);
    try {
      const response = await fetch('/api/protocol-health/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      let json: {
        success?: boolean;
        error?: { message?: string };
        data?: { detections?: ProtocolDetection[] };
      };
      try {
        json = await response.json();
      } catch {
        throw new Error(`Failed to detect positions (HTTP ${response.status})`);
      }

      if (!response.ok || !json.success) {
        const message = json.error?.message || 'Failed to detect positions';
        throw new Error(message);
      }

      setDetections(json.data?.detections ?? []);
      setDetectedAt(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Failed to detect positions: ${message}`);
      setDetectError(message);
      setDetections(null);
    } finally {
      setDetecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDetecting(false);
    setDetections(null);
    setDetectError(null);
    setDetectedAt(null);
  }, []);

  return { detecting, detections, detectError, detectedAt, detect, reset };
}
