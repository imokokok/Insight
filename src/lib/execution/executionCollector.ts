/**
 * @fileoverview Execution collector — turn a transaction hash into the facts an
 * Execution Receipt needs.
 *
 * Deliberately venue-agnostic. Insight does not know which DEX, router or
 * aggregator an agent used, and a collector that understood only Uniswap would
 * be quietly wrong for every agent routing elsewhere. Instead it reads the one
 * event every ERC-20 movement emits (`Transfer`) and attributes amounts to the
 * taker, which works for single-hop and multi-hop routes alike.
 *
 * Honesty rules this module is built around — each one exists because the
 * alternative produces a confident-looking receipt that is wrong:
 *
 *   - A native-asset leg has no `Transfer` event. Rather than infer an amount
 *     it does not have, the collector reports the price as unavailable.
 *   - `decimals()` returning null is NOT treated as 18. Assuming 18 for a
 *     6-decimal token misstates the fill price by a factor of a trillion.
 *   - A reverted transaction is a real, signable outcome (nothing settled), not
 *     a collection failure.
 *   - A transaction the node has not seen is a failure to collect, and no
 *     receipt is issued at all.
 */

import { parseCaip19 } from '@/lib/attestations/caip19';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';

import { DECIMALS_SELECTOR, decodeAllTransfers, parseDecimalsResult } from './events';

export type ExecutionCollectionCode = 'NOT_FOUND' | 'RPC_ERROR' | 'UNSUPPORTED_CHAIN';

export interface ExecutionFacts {
  txHash: `0x${string}`;
  chainId: number;
  blockNumber: bigint | null;
  /** 'REVERTED' when the transaction failed; 'FULL' when it settled on-chain.
   *  Settlement completeness is independent of Insight's ability to attribute
   *  the amount: a successful transaction is reported as FULL even when the fill
   *  price is unreadable, in which case {@link unavailableReason} is set and the
   *  receipt's verdict is UNDETERMINED. Partial fills are not distinguishable
   *  from Transfer events alone, so every settled transaction is FULL. */
  fillStatus: 'FULL' | 'REVERTED';
  /** Human-unit amounts (raw amount divided by the token's decimals). */
  sourceAmount: number | null;
  destinationAmount: number | null;
  /** Destination units per source unit. Null when it cannot be computed. */
  executedPrice: number | null;
  /** Gas actually consumed, in the chain's native units (wei for EVM). */
  feeNative: bigint | null;
  /** Block timestamp, unix seconds. Null when the block could not be read;
   *  `blockNumber` remains the authoritative anchor in that case. */
  executedAt: number | null;
  /** Machine-readable reason the price is unavailable, when it is. */
  unavailableReason: 'FILL_PRICE_UNAVAILABLE' | 'NATIVE_ASSET_LEG' | 'AMOUNT_NOT_ATTRIBUTED' | null;
}

export type ExecutionCollectionResult =
  | { ok: true; facts: ExecutionFacts }
  | { ok: false; code: ExecutionCollectionCode; message: string };

export interface CollectExecutionParams {
  txHash: `0x${string}`;
  chainId: number;
  /** RPC endpoints for `chainId`, already resolved by the caller. */
  endpoints: string[];
  /** CAIP-19 id of the asset the agent was selling. */
  sourceAssetId: string;
  /** CAIP-19 id of the asset the agent was buying. */
  destinationAssetId: string;
  /** Address whose balances define the trade. Defaults to the tx sender. */
  taker?: `0x${string}`;
  signal?: AbortSignal;
  /** Injectable for tests. Defaults to a fresh client. */
  client?: RpcClientWithFallback;
}

/** Resolve a CAIP-19 id to an ERC-20 address, or explain why we cannot.
 *  Native assets (slip44) and non-EVM namespaces emit no `Transfer` event, so
 *  they are reported rather than guessed. */
function erc20AddressFor(
  assetId: string,
  chainId: number
): { address: `0x${string}` } | { unavailable: 'NATIVE_ASSET_LEG' | 'UNSUPPORTED_CHAIN' } {
  const parsed = parseCaip19(assetId);
  if (!parsed) return { unavailable: 'UNSUPPORTED_CHAIN' };
  if (parsed.chainNamespace !== 'eip155') return { unavailable: 'UNSUPPORTED_CHAIN' };
  if (parsed.assetNamespace !== 'erc20') return { unavailable: 'NATIVE_ASSET_LEG' };
  if (parsed.chainReference !== chainId) return { unavailable: 'UNSUPPORTED_CHAIN' };
  return { address: parsed.assetReference.toLowerCase() as `0x${string}` };
}

export async function collectExecutionFacts(
  params: CollectExecutionParams
): Promise<ExecutionCollectionResult> {
  const {
    txHash,
    chainId,
    endpoints,
    sourceAssetId,
    destinationAssetId,
    signal,
    client = new RpcClientWithFallback({ contextLabel: 'execution-collector' }),
  } = params;

  const key = String(chainId);

  let receipt;
  try {
    receipt = await client.getTransactionReceipt(key, endpoints, txHash, signal);
  } catch (error) {
    return {
      ok: false,
      code: 'RPC_ERROR',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // Not seen by the node: pending or unknown. This is NOT the same as a
  // reverted transaction, and no receipt may be issued for it.
  if (!receipt) {
    return { ok: false, code: 'NOT_FOUND', message: 'Transaction not found on the configured RPC' };
  }

  const blockNumber = receipt.blockNumber ? BigInt(receipt.blockNumber) : null;
  const reverted = receipt.status === '0x0';

  let feeNative: bigint | null = null;
  try {
    feeNative = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice);
  } catch {
    feeNative = null;
  }

  // Block timestamp is best-effort: blockNumber is the authoritative anchor and
  // stays in the receipt either way.
  let executedAt: number | null = null;
  if (blockNumber !== null) {
    try {
      const block = await client.getBlockByNumber(key, endpoints, Number(blockNumber), signal);
      if (block?.timestamp) executedAt = Number(BigInt(block.timestamp));
    } catch {
      executedAt = null;
    }
  }

  if (reverted) {
    // A reverted transaction is a genuine outcome worth signing: it proves
    // nothing settled. Gas was still consumed, which is also worth recording.
    return {
      ok: true,
      facts: {
        txHash,
        chainId,
        blockNumber,
        fillStatus: 'REVERTED',
        sourceAmount: null,
        destinationAmount: null,
        executedPrice: null,
        feeNative,
        executedAt,
        unavailableReason: 'FILL_PRICE_UNAVAILABLE',
      },
    };
  }

  const source = erc20AddressFor(sourceAssetId, chainId);
  const destination = erc20AddressFor(destinationAssetId, chainId);
  if ('unavailable' in source || 'unavailable' in destination) {
    const reason =
      'unavailable' in source
        ? source.unavailable
        : 'unavailable' in destination
          ? destination.unavailable
          : 'UNSUPPORTED_CHAIN';
    return {
      ok: true,
      facts: {
        txHash,
        chainId,
        blockNumber,
        fillStatus: 'FULL',
        sourceAmount: null,
        destinationAmount: null,
        executedPrice: null,
        feeNative,
        executedAt,
        unavailableReason:
          reason === 'NATIVE_ASSET_LEG' ? 'NATIVE_ASSET_LEG' : 'FILL_PRICE_UNAVAILABLE',
      },
    };
  }

  const taker = (params.taker ?? receipt.from ?? '').toLowerCase() as `0x${string}`;
  if (!taker) {
    return { ok: false, code: 'RPC_ERROR', message: 'Transaction receipt has no sender' };
  }

  const transfers = decodeAllTransfers(receipt.logs);

  // Attribute by direction relative to the taker: source leaves the taker,
  // destination arrives to the taker. Summing (rather than taking a single
  // event) handles routers that split a route across several transfers.
  let sourceRaw = 0n;
  let destinationRaw = 0n;
  for (const t of transfers) {
    if (t.token.toLowerCase() === source.address && t.from === taker) sourceRaw += t.value;
    if (t.token.toLowerCase() === destination.address && t.to === taker) destinationRaw += t.value;
  }

  const sourceDecimals = await fetchDecimals(client, key, endpoints, source.address, signal);
  const destinationDecimals = await fetchDecimals(
    client,
    key,
    endpoints,
    destination.address,
    signal
  );

  if (
    sourceRaw === 0n ||
    destinationRaw === 0n ||
    sourceDecimals === null ||
    destinationDecimals === null
  ) {
    // Nothing to compare. This is missing evidence, not a measured drift.
    return {
      ok: true,
      facts: {
        txHash,
        chainId,
        blockNumber,
        fillStatus: 'FULL',
        sourceAmount: null,
        destinationAmount: null,
        executedPrice: null,
        feeNative,
        executedAt,
        unavailableReason: 'AMOUNT_NOT_ATTRIBUTED',
      },
    };
  }

  const sourceAmount = Number(sourceRaw) / 10 ** sourceDecimals;
  const destinationAmount = Number(destinationRaw) / 10 ** destinationDecimals;

  return {
    ok: true,
    facts: {
      txHash,
      chainId,
      blockNumber,
      fillStatus: 'FULL',
      sourceAmount,
      destinationAmount,
      executedPrice: sourceAmount > 0 ? destinationAmount / sourceAmount : null,
      feeNative,
      executedAt,
      unavailableReason: null,
    },
  };
}

/** Read a token's `decimals()`. Null on any failure — callers must not
 *  substitute a default, for the accuracy reason stated at the top of the file. */
async function fetchDecimals(
  client: RpcClientWithFallback,
  key: string,
  endpoints: string[],
  token: `0x${string}`,
  signal?: AbortSignal
): Promise<number | null> {
  try {
    const result = await client.ethCall(key, endpoints, token, DECIMALS_SELECTOR, signal);
    return parseDecimalsResult(result);
  } catch {
    return null;
  }
}
