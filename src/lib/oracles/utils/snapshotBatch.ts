import { type Blockchain, type PriceData } from '@/types/oracle';

/** A collector-only request. The registry has already authenticated the feed. */
export interface SnapshotBatchPriceRequest {
  id: string;
  symbol: string;
  chain: Blockchain;
  /** Address from the active registry, where the provider reads one directly. */
  feedAddress?: `0x${string}`;
}

export interface SnapshotBatchPriceResult {
  id: string;
  price: PriceData | null;
  error: Error | null;
}

/** Optional capability implemented only by on-chain snapshot adapters. */
export interface SnapshotBatchPriceClient {
  getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]>;
}
