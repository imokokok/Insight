/** Price the exact Uniswap V3 Swap log selected by the pinned VERITAS rule. */

import { decodeAbiParameters } from 'viem';

import type { RpcTransactionReceipt } from '@/lib/oracles/utils/rpcClientWithFallback';

export const VERITAS_POOL = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
export const VERITAS_WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export const VERITAS_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
export const UNISWAP_V3_SWAP_TOPIC =
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
const MIN_WETH_RAW = 100_000_000_000_000_000n;

export interface SelectedSwapPrice {
  logIndex: number;
  pool: typeof VERITAS_POOL;
  sender: `0x${string}`;
  sourceRaw: bigint;
  destinationRaw: bigint;
  sourceAmount: number;
  destinationAmount: number;
  /** Exact integer rounding to ExecutionReceipt's eight decimal places. */
  executedPrice: number;
}

/**
 * Reject a missing, mismatched or non-qualifying log. The caller supplies the
 * selected log index from the precommitted rule; this function never searches
 * for a more favourable event or sums unrelated transfers in the transaction.
 */
export function priceVeritasSelectedSwap(
  receipt: RpcTransactionReceipt,
  txHash: `0x${string}`,
  logIndex: number
): SelectedSwapPrice | null {
  if (!Number.isSafeInteger(logIndex) || logIndex < 0) return null;
  if (receipt.status !== '0x1' || receipt.transactionHash?.toLowerCase() !== txHash.toLowerCase())
    return null;

  const matching = receipt.logs.filter((log) => {
    if (!log.logIndex || log.removed === true) return false;
    try {
      return BigInt(log.logIndex) === BigInt(logIndex);
    } catch {
      return false;
    }
  });
  if (matching.length !== 1) return null;
  const log = matching[0]!;
  if (
    log.address.toLowerCase() !== VERITAS_POOL ||
    log.transactionHash?.toLowerCase() !== txHash.toLowerCase() ||
    log.blockNumber !== receipt.blockNumber ||
    log.topics.length !== 3 ||
    log.topics[0]?.toLowerCase() !== UNISWAP_V3_SWAP_TOPIC
  )
    return null;

  try {
    // In this pool token0=USDC and token1=WETH. A qualifying WETH->USDC
    // event sends USDC out of the pool (amount0<0) and WETH into it
    // (amount1>=0.1 WETH). Decode the event, not the taker's other swaps.
    const [amount0, amount1] = decodeAbiParameters(
      [
        { type: 'int256' },
        { type: 'int256' },
        { type: 'uint160' },
        { type: 'uint128' },
        { type: 'int24' },
      ],
      log.data
    );
    if (amount0 >= 0n || amount1 < MIN_WETH_RAW) return null;
    if (!/^0x[0-9a-fA-F]{64}$/.test(log.topics[1] ?? '')) return null;
    const sender = `0x${log.topics[1]!.slice(-40).toLowerCase()}` as `0x${string}`;
    const sourceRaw = amount1;
    const destinationRaw = -amount0;
    // (USDC / 1e6) / (WETH / 1e18), then round half-up at scale 1e8.
    const numerator = destinationRaw * 10n ** 20n;
    const scaled = (numerator + sourceRaw / 2n) / sourceRaw;
    const executedPrice = Number(scaled) / 1e8;
    if (!Number.isFinite(executedPrice) || executedPrice <= 0) return null;
    return {
      logIndex,
      pool: VERITAS_POOL,
      sender,
      sourceRaw,
      destinationRaw,
      sourceAmount: Number(sourceRaw) / 1e18,
      destinationAmount: Number(destinationRaw) / 1e6,
      executedPrice,
    };
  } catch {
    return null;
  }
}
