import {
  decodeAggregate3,
  encodeAggregate3,
  MULTICALL3_ADDRESS,
  type Multicall3Call,
  type Multicall3Result,
} from './multicall3';
import { type RpcClientWithFallback } from './rpcClientWithFallback';

/**
 * Keep the outer payload bounded. This is deliberately the same limit as the
 * established Chainlink and TWAP collector paths: one bad or oversized batch
 * must not turn a bounded read into an unbounded retry/fallback storm.
 */
export const MONAD_MULTICALL_MAX_INNER_CALLS = 48;

/**
 * Execute read-only calls against Monad's verified canonical Multicall3
 * deployment. The caller remains responsible for decoding each result and for
 * preserving its own freshness and authenticity checks.
 */
export async function aggregateMonadCalls(
  rpcClient: RpcClientWithFallback,
  endpoints: readonly string[],
  calls: readonly Multicall3Call[],
  signal?: AbortSignal
): Promise<Multicall3Result[]> {
  if (calls.length === 0) return [];

  const results: Multicall3Result[] = [];
  for (let offset = 0; offset < calls.length; offset += MONAD_MULTICALL_MAX_INNER_CALLS) {
    const chunk = calls.slice(offset, offset + MONAD_MULTICALL_MAX_INNER_CALLS);
    const raw = await rpcClient.ethCall(
      '143',
      [...endpoints],
      MULTICALL3_ADDRESS,
      encodeAggregate3(chunk),
      signal
    );
    results.push(...decodeAggregate3(raw as `0x${string}`, chunk.length));
  }
  return results;
}
